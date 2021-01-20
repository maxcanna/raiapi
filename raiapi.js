/**
 * Created by massimilianocannarozzo on 13/04/14.
 */
/* eslint-env node */
const request = require('request-promise-native').defaults({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko)' +
        ' Chrome/50.0.2661.94 Safari/537.36',
    },
    timeout: 25000,
    json: true,
    followRedirect: false,
});
const moment = require('moment-timezone').tz.setDefault('Europe/Rome');
const mongodb = require('mongodb');
const createError = require('http-errors');
const eNF = createError.NotFound('Dati non disponibili');
const {
    env: {
        MONGO_URL,
    },
} = process;
const _ = require('lodash');

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
    RaiUno: 1,
    RaiDue: 2,
    RaiTre: 3,
    RaiGulp: 23,
    RaiCinque: 31,
    RaiPremium: 32,
    RaiYoyo: 38,
};

const getCanali = () => Object.keys(channelMap);
const getDocumentIndex = (idCanale, data) => `${getCanali()[idCanale]}:${moment(data).format('YYYY:MM:DD')}`;

const getValueOfDirKeys = programma => Object.keys(programma)
    .filter(key => key.indexOf('dir') === 0)
    .map(key => programma[key])
    .join()
    .toLowerCase();

const isGeofenced = programma => getValueOfDirKeys(programma)
    .indexOf('geoprotezione') >= 0;

const getSizesOfProgramma = programma => Object.keys(programma).filter(key => key.indexOf('h264_') === 0 && programma[key] !== '');

const getEffectiveUrl = (url, qualita) => {
    // TOOD Recuperare proxy se useProxy e passare a request
    // Se !useProxy passare undefined come proxyUrl
    return Promise.resolve()
        .then(proxyUrl => request.get({
            headers: {
                'User-Agent': 'raiweb',
            },
            proxy: proxyUrl,
            url: url,
            followRedirect: false,
        }))
        .catch(error => {
            const { response: { headers }, statusCode } = error;

            if (statusCode !== 302) {
                throw eNF;
            }

            let { location: fileUrl } = headers;
            if (fileUrl) {
                fileUrl = fileUrl.replace(/_\d*?\.mp4$/, `_${qualita}.mp4`);
            }
            if (fileUrl.endsWith('video_no_available.mp4')) {
                fileUrl = url
            }

            return fileUrl;
        });
};

const fetchPage = (idCanale, data) => {
    const canale = getCanali()[idCanale];
    const m = moment(data);
    const url = `http://www.rai.it/dl/portale/html/palinsesti/replaytv/static/${canale}_${m.format('YYYY_MM_DD')}.html`;

    if (idCanale > getCanali().length) {
        throw  createError.BadRequest('Canale non valido');
    }

    return request.get(url)
        .then(body => {
            const programmi = Object.entries(body[channelMap[canale]][`${m.format('YYYY-MM-DD')}`])
                .map(([orario, programma]) => ({ orario, ...programma }));

            return (!mongoDb
                ? Promise.resolve(programmi)
                : mongoDb.collection('programmi')
                    .updateOne(
                        { _id: getDocumentIndex(idCanale, data) },
                        { $set: { ...programmi, createdAt: new Date() } },
                        { upsert: true }
                    ))
                .then(() => programmi)
        });
};

class RaiApi {
    getAll(idCanale, data) {
        return RaiApi.getData(idCanale, data)
            .then(programmi => {
                if (_.isEmpty(programmi)) {
                    throw eNF;
                }
                return Promise.all(programmi
                    .map(programma => {
                        const sizes = getSizesOfProgramma(programma);
                        if (sizes.length === 0) {
                            return {}
                        }
                        // Ugly way to remove duplicate URLs keeping the best available one
                        const [size] = _.reverse(_.uniqBy(_.reverse(sizes), 'url'));
                        return {
                            name: programma.t.trim(),
                            orario: programma.orario,
                            qualita: size.replace('_', ' '),
                            url: programma[size],
                            geofenced: isGeofenced(programma),
                        }
                    })
                    .filter(programma => programma.url)
                    .map(({ name, orario, qualita, geofenced, url }) => getEffectiveUrl(url, qualita.split(' ')[1], geofenced)
                        .then(effectiveUrl => ({
                            name,
                            orario,
                            qualita,
                            url: effectiveUrl,
                        }))
                    ))
            })
    }

    getFileUrl(idCanale, data, idProgramma, qualita) {
        return RaiApi.getData(idCanale, data)
            .then(programmi => {
                if (_.isEmpty(programmi)) {
                    throw eNF;
                }

                const programma = programmi[idProgramma];

                if (!programma) {
                    throw eNF;
                }

                const h264sizes = getSizesOfProgramma(programma);
                const url = programma[h264sizes[qualita]];

                if (_.isEmpty(url)) {
                    throw eNF;
                }

                return getEffectiveUrl(url, h264sizes[qualita].split('_')[1], isGeofenced(programma));
            });
    }

    listQualita(idCanale, data, idProgramma) {
        return RaiApi.getData(idCanale, data)
            .then(programmi => {
                if (_.isEmpty(programmi)) {
                    throw eNF;
                }

                const programma = programmi[idProgramma];

                if (!programma) {
                    throw eNF;
                }

                return getSizesOfProgramma(programma)
                    .map((size, i) => ({
                        id: i,
                        name: size.replace(/_/g, ' '),
                    }));
            });
    }

    listProgrammi(idCanale, data) {
        return RaiApi.getData(idCanale, data)
            .then (programmi => {
                if (_.isEmpty(programmi)) {
                    throw eNF;
                }

                return programmi.map(({ t: name, d: description, 'image-big': image }, i) => ({
                    id: i,
                    name: name.trim(),
                    image,
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

    static getData(idCanale, data) {
        return !mongoDb
            ? fetchPage(idCanale, data)
            : mongoDb.collection('programmi')
                .findOne({ _id: getDocumentIndex(idCanale, data) }, { projection: { _id: false, createdAt: false } })
                .then(programmi => programmi ? Object.values(programmi) : fetchPage(idCanale, data));
    }
}

module.exports = RaiApi;
