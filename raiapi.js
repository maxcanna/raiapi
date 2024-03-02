/**
 * Created by massimilianocannarozzo on 13/04/14.
 */
/* eslint-env node */
const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36';
const baseURL = 'https://www.raiplay.it';
const axios = require('axios').create({
    baseURL,
    headers: {
        'User-Agent': ua,
    },
});
const urlRegex = /.*(\/podcast.*)_((,\d+)+).*/;
const moment = require('moment-timezone').tz.setDefault('Europe/Rome');
const mongodb = require('mongodb');
const createError = require('http-errors');
const eNF = createError.NotFound('Dati non disponibili');
const hosts = [
    'creativemedia?.rai.it',
    'creativemedia?-rai-it.akamaized.net',
    'download?.rai.it',
    'download?-geo.rai.it',
    'creativemediax?.rai.it',
]
const servers = hosts.map(host => [...Array(10).keys()].map(i => host.replace('?', i))).flat();

const {
    env: {
        MONGO_URL,
    },
} = process;

let mongoDb;

if (MONGO_URL) {
    mongodb.MongoClient.connect(MONGO_URL, { useUnifiedTopology: true })
        .then(c => {
            console.log('Connected to mongodb');
            return c.db();
        })
        .then(db => mongoDb = db);
}

let channelMap = {
    Rai1: 'rai-1',
    Rai2: 'rai-2',
    Rai3: 'rai-3',
    Rai4: 'rai-4',
    'Rai Gulp': 'rai-gulp',
    Rai5: 'rai-5',
    'Rai Premium': 'rai-premium',
    'Rai Yoyo': 'rai-yoyo',
    'Rai Movie': 'rai-movie',
    'Rai Storia': 'rai-storia',
    'Rai Scuola': 'rai-scuola',
    'Rai News 24': 'rai-news-24',
    'Rai Sport Piu': 'rai-sport-piu-hd',
    'Rai Sport': 'rai-sport',
};

const getCanali = () => Object.keys(channelMap);
const getChannelIdentifier = (idCanale) => Object.values(channelMap)[idCanale];
const getDocumentIndex = (idCanale, data) => `${getChannelIdentifier(idCanale)}:${moment(data).format('YYYY:MM:DD')}`;

const getVideoUrl = url => {
    return Promise.resolve()
        .then(proxy => axios({
            proxy,
            url,
            method: 'HEAD',
            headers: {
                'User-Agent': 'rai',
            },
        }))
        .then(({ request: { res: { responseUrl: fileUrl } } }) => fileUrl.endsWith('video_no_available.mp4') ? url : fileUrl)
        .catch(() => url);
};

const getEffectiveUrl = (url, requestedQuality = Number.MAX_SAFE_INTEGER) => {
    return getVideoUrl(url)
        .then(fileUrl => {
            const matches = fileUrl.match(urlRegex);

            if (matches) {
                const qualities = matches[2].split(',').filter(Boolean);
                const quality = Math.min(requestedQuality, qualities.length - 1);

                return Promise.any(
                    servers.map(server => axios({
                        method: 'HEAD',
                        url: `https://${server}${matches[1]}_${qualities[quality]}.mp4`,
                    }))
                )
                    .then(({ config: { url } }) => url)
                    .catch(() => fileUrl.replace('http://', 'https://'));
            }

            return fileUrl.replace('http://', 'https://');
        });
};

const fetchPage = (idCanale, data) => {
    const canale = getChannelIdentifier([idCanale]);
    const m = moment(data);
    const url = `/palinsesto/app/${canale}/${m.format('DD-MM-YYYY')}.json`;

    if (idCanale > getCanali().length) {
        throw  createError.BadRequest('Canale non valido');
    }

    return axios({
        url,
    })
        .then(({ data: body }) => {
            const channelData = body['events'];

            if (!channelData) {
                return Promise.resolve([]);
            }

            return Promise.allSettled(channelData
                .filter(({ has_video }) => has_video === true)
                .map(programma => axios({
                    url: programma['path_id'],
                })))
        })
        .then(programmi => programmi.filter(({ status }) => status === 'fulfilled').map(({ value: { data } }) => data))
        .then(programmi => !mongoDb
            ? Promise.resolve(programmi)
            : mongoDb.collection('programmi')
                .updateOne(
                    { _id: getDocumentIndex(idCanale, data) },
                    {
                        $set: {
                            programmi,
                            createdAt: new Date(),
                        }
                    },
                    { upsert: true }
                )
                .then(() => programmi)
        )
};

const getData = (idCanale, data) => {
    return !mongoDb
        ? fetchPage(idCanale, data)
        : mongoDb.collection('programmi')
            .findOne({ _id: getDocumentIndex(idCanale, data) }, { projection: { _id: false, createdAt: false } })
            .then(d => d ? Object.values(d.programmi) : fetchPage(idCanale, data));
}

class RaiApi {
    getAll(idCanale, data) {
        return getData(idCanale, data)
            .then(programmi => {
                if (programmi.length === 0) {
                    return [];
                }
                return Promise.all(programmi
                    .filter(({ video: { content_url: url } = {} }) => url)
                    .map(({ name, time_published: orario, video: { content_url: url } }) => getEffectiveUrl(url)
                        .then(effectiveUrl => ({
                            name,
                            orario,
                            url: effectiveUrl,
                        }))
                    ))
            })
    }

    getFileUrl(idCanale, data, idProgramma, quality) {
        return getData(idCanale, data)
            .then(programmi => {
                if (programmi.length === 0) {
                    throw eNF;
                }

                const programma = programmi[idProgramma];

                if (!programma) {
                    throw eNF;
                }

                if (!programma.video) {
                    throw eNF;
                }

                const url = programma.video['content_url'];

                if (!url) {
                    throw eNF;
                }

                return getEffectiveUrl(url, quality);
            });
    }

    listQualita(idCanale, data, idProgramma) {
        return getData(idCanale, data)
            .then(programmi => {
                if (programmi.length === 0) {
                    throw eNF;
                }

                const programma = programmi[idProgramma];

                if (!programma) {
                    throw eNF;
                }

                if (!programma.video) {
                    throw eNF;
                }

                const url = programma.video['content_url'];

                if (!url) {
                    throw eNF;
                }

                return getVideoUrl(url)
                    .then(fileUrl => {
                        const matches = fileUrl.match(urlRegex);
                        const qualities = matches ? matches[2].split(',').filter(Boolean) : ['1800'];

                        return qualities.map((quality, id) => ({
                            id,
                            name: `h264 ${quality}`
                        }));
                    });
            });
    }

    listProgrammi(idCanale, data) {
        return getData(idCanale, data)
            .then (programmi => {
                if (programmi.length === 0) {
                    throw eNF;
                }

                return programmi.map(({ name = '-', description, images }, i) => ({
                    id: i,
                    name: name.trim(),
                    image: images['landscape'] ? `https://www.raiplay.it${images.landscape}` : undefined,
                    description,
                }));
            });
    }

    static listCanali() {
        return Promise.resolve(getCanali().map((name, id) => ({
            id: id,
            name: name,
        })));
    }
}

module.exports = RaiApi;
