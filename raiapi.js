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

const getEffectiveUrl = (url, qualita/*, useProxy */) => {
    // TODO Recuperare proxy se useProxy e passare a request
    // Se !useProxy passare undefined come proxy
    return Promise.resolve()
        .then(proxy => request.get({
            headers: {
                'User-Agent': 'raiweb',
            },
            proxy,
            url: url.replace('http://', 'https://'),
            followRedirect: false,
        }))
        .catch(error => {
            const { statusCode } = error;

            if (statusCode !== 302) {
                return url.replace('http://', 'https://');
            }

            let { response: { headers: { location: fileUrl } } } = error;

            if (fileUrl) {
                fileUrl = fileUrl.replace(/_\d*?\.mp4$/, `_${qualita}.mp4`);
            }
            if (fileUrl.endsWith('video_no_available.mp4')) {
                fileUrl = url
            }

            return fileUrl.replace('http://', 'https://');
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
            const channelData = body[channelMap[canale]];
            const dateKey = `${m.format('YYYY-MM-DD')}`;

            if (!channelData || !channelData[dateKey]) {
                return Promise.resolve([]);
            }

            const programmi = Object.entries(channelData[dateKey])
                .map(([orario, programma]) => ({ orario, ...programma }));

            return (!mongoDb
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
                    ))
                .then(() => programmi)
        })
        .catch(() => []);
};

class RaiApi {
    getAll(idCanale, data) {
        return RaiApi.getData(idCanale, data)
            .then(programmi => {
                if (programmi.length === 0) {
                    return [];
                }
                return Promise.all(programmi
                    .map(programma => {
                        const sizes = getSizesOfProgramma(programma);
                        if (sizes.length === 0) {
                            return {}
                        }
                        // Ugly way to remove duplicate URL keys keeping the best available one
                        const [size] = sizes.reverse().filter((value, index, self) => self.indexOf(value) === index).reverse();
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
                if (programmi.length === 0) {
                    throw eNF;
                }

                const programma = programmi[idProgramma];

                if (!programma) {
                    throw eNF;
                }

                const h264sizes = getSizesOfProgramma(programma);
                const url = programma[h264sizes[qualita]];

                if (!url) {
                    throw eNF;
                }

                return getEffectiveUrl(url, h264sizes[qualita].split('_')[1], isGeofenced(programma));
            });
    }

    listQualita(idCanale, data, idProgramma) {
        return RaiApi.getData(idCanale, data)
            .then(programmi => {
                if (programmi.length === 0) {
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
                if (programmi.length === 0) {
                    throw eNF;
                }

                return programmi.map(({ t: name, d: description, 'image-big': image }, i) => ({
                    id: i,
                    name: name.trim(),
                    image: image.replace('http://', 'https://'),
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
                .then(d => d ? Object.values(d.programmi) : fetchPage(idCanale, data));
    }
}

module.exports = RaiApi;
