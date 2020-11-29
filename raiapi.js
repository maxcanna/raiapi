/**
 * Created by massimilianocannarozzo on 13/04/14.
 */
/* eslint-env node */
const request = require('request').defaults({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko)' +
        ' Chrome/50.0.2661.94 Safari/537.36',
    },
    timeout: 25000,
    json: true,
    followRedirect: false,
});
const moment = require('moment');
const async = require('async');
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
    RaiCinque: 31,
    RaiPremium: 32,
    RaiYoyo: 38,
};

const getCanali = () => Object.keys(channelMap);

const getValueOfDirKeys = programma => Object.keys(programma)
    .filter(key => key.indexOf('dir') === 0)
    .map(key => programma[key])
    .join()
    .toLowerCase();

const isGeofenced = programma => getValueOfDirKeys(programma)
    .indexOf('geoprotezione') >= 0;

const isAvailable = programma => getValueOfDirKeys(programma)
    .indexOf('visibilita:n') < 0;

const getSizesOfProgramma = programma => isAvailable(programma)
    ? Object.keys(programma).filter(key => key.indexOf('h264_') === 0 && programma[key] !== '')
    : [];

const getEffectiveUrl = (url, qualita, useProxy, callback) => {
    request.get({
        headers: {
            'User-Agent': 'raiweb',
        },
        proxy: proxyUrl,
        url: url,
    }, (error, response) => {
        if (error || response.error || response.statusCode !== 302) {
            callback(eNF);
        } else {
            let { headers: { location: fileUrl } } = response;
            if (fileUrl) {
                fileUrl = fileUrl.replace(/_\d*?\.mp4$/, `_${qualita}.mp4`);
            }
            if (fileUrl === 'http://download.rai.it/video_no_available.mp4') {
                fileUrl = url
            }

            callback(null, fileUrl);
        }
    });
};

const fetchPage = (idCanale, data, callback) => {
    const canale = getCanali()[idCanale];
    const m = moment(data);
    const documentId = `${canale}:${m.format('YYYY:MM:DD')}`;
    const url = `http://www.rai.it/dl/portale/html/palinsesti/replaytv/static/${canale}_${m.format('YYYY_MM_DD')}.html`;

    if (idCanale > getCanali().length) {
        return callback(createError.BadRequest('Canale non valido'));
    }

    request.get(url, (error, response, body) => {
        if (error || response.statusCode === 404 || response.statusCode !== 200) {
            callback(error || new Error(response.statusCode));
        } else {
            const programmi = _.values(body[channelMap[canale]][`${m.format('YYYY-MM-DD')}`]);

            if (programmi.length > 0 && mongoDb) {
                mongoDb.collection('programmi')
                    .updateOne(
                        { _id: documentId },
                        { $set: { ...programmi, createdAt: new Date() } },
                        { upsert: true }
                    );
            }

            callback(null, programmi);
        }
    }
    );
};

const fetchCanali = (callback) => {
    const url = 'http://www.rai.it/dl/RaiTV/iphone/android/smartphone/advertising_config.html';

    request.get(url, (error, { statusCode }, body) => {
        if (error || statusCode === 404 || statusCode !== 200) {
            // Use static channel map
            callback(null, getCanali());
        } else {
            channelMap = {};

            body.Channels
                .filter(({ hasReplay = 'NO' }) => hasReplay === 'YES')
                .forEach(({ tag, id }) => channelMap[tag] = id);

            if (getCanali().length > 0 && mongoDb) {
                mongoDb.collection('canali')
                    .updateOne(
                        { _id: 'canali' },
                        { $set: { ...channelMap, createdAt: new Date() } },
                        { upsert: true }
                    );
            }

            callback(null, getCanali().map((name, id) => ({
                id: id,
                name: name,
            })));
        }
    }
    );
};

class RaiApi {
    constructor() {
        this.getData = this.getData.bind(this);
        this.getFileUrl = this.getFileUrl.bind(this);
        this.listQualita = this.listQualita.bind(this);
        this.listProgrammi = this.listProgrammi.bind(this);
        this.listCanali = this.listCanali.bind(this);
    }

    getAll(idCanale, data, callback) {
        this.getData(idCanale, data, (error, programmi) => {
            if (error) {
                return callback(error);
            }

            if (_.isEmpty(programmi)) {
                return callback(eNF);
            }

            async.concat(programmi, (programma, concatCallback) => {
                async.map(getSizesOfProgramma(programma), (size, sizesCallback) => {
                    sizesCallback(null, {
                        name: programma.t.trim(),
                        qualita: size.replace('_', ' '),
                        url: programma[size],
                        geofenced: isGeofenced(programma),
                    });
                }, (err, sizes) => {
                    // Ugly way to remove duplicate URLs keeping the best available one
                    concatCallback(null, _.reverse(_.uniqBy(_.reverse(sizes), 'url')))
                });
            }, (err, items) => {
                async.filter(items, (item, urlCallback) => getEffectiveUrl(item.url, item.qualita.split(' ')[1], item.geofenced, (err, url) => {
                    item.url = url;
                    urlCallback(null, !err);
                }), callback);
            });
        });
    }

    getProgrammaInfo(idCanale, data, idProgramma, callback) {
        this.getData(idCanale, data, (error, programmi) => {
            if (error) {
                return callback(error);
            }

            if (_.isEmpty(programmi)) {
                return callback(eNF);
            }

            const programma = programmi[idProgramma];

            if (programma === undefined) {
                return callback(eNF);
            }

            const { t: titolo, d: descrizione, 'image-big': image } = programma;

            callback(null, {
                titolo,
                descrizione,
                image,
            });
        })
    }

    getFileUrl(idCanale, data, idProgramma, qualita, callback) {
        this.getData(idCanale, data, (error, programmi) => {
            if (error) {
                return callback(error);
            }

            if (_.isEmpty(programmi)) {
                return callback(eNF);
            }

            const programma = programmi[idProgramma];

            if (programma === undefined) {
                return callback(eNF);
            }

            const h264sizes = getSizesOfProgramma(programma);
            const url = programma[h264sizes[qualita]];

            if (_.isEmpty(url)) {
                return callback(eNF);
            }

            const geofenced = isGeofenced(programma);

            getEffectiveUrl(url, h264sizes[qualita].split('_')[1], geofenced, (error, url) => callback(error, {
                url,
                geofenced,
            }));
        });
    }

    listQualita(idCanale, data, idProgramma, callback) {
        this.getData(idCanale, data, (error, programmi) => {
            if (error) {
                return callback(error);
            }

            if (_.isEmpty(programmi)) {
                return callback(eNF);
            }
            const programma = programmi[idProgramma];

            if (programma === undefined) {
                return callback(eNF);
            }

            callback(null, getSizesOfProgramma(programma).map((size, i) => ({
                id: i,
                name: size.replace(/_/g, ' '),
            })));
        });
    }

    listProgrammi(idCanale, data, callback) {
        this.getData(idCanale, data, (error, programmi) => {
            if (error) {
                return callback(error);
            }

            if (_.isEmpty(programmi)) {
                return callback(eNF);
            }
            callback(null, programmi.map(({ t: name, d: description, 'image-big': image }, i) => ({
                id: i,
                name: name.trim(),
                image,
                description,
            })));
        });
    }

    listCanali(callback) {
        callback = callback.bind(this);

        if (mongoDb) {
            mongoDb.collection('canali').findOne({ _id: 'canali' }, { projection: { _id: false } }, (err, reply) => {
                if (!err) {
                    let channelMap = null;
                    try {
                        channelMap = JSON.parse(reply);
                        if (Object.keys(channelMap).length > 0) {
                            return callback(null, getCanali().map((name, id) => ({
                                id: id,
                                name: name,
                            })));
                        }
                    } catch (e) {
                        fetchCanali(callback);
                    }
                } else {
                    fetchCanali(callback);
                }
            });
        } else {
            fetchCanali(callback);
        }
    }

    getData(idCanale, data, callback) {
        callback = callback.bind(this);

        const documentIndex = `${getCanali()[idCanale]}:${moment(data).format('YYYY:MM:DD')}`;

        if (mongoDb) {
            mongoDb.collection('canali').findOne({ _id: documentIndex }, { projection: { _id: false } }, (err, reply) => {
                if (!err) {
                    let programmi = null;
                    try {
                        programmi = JSON.parse(reply);
                    } catch (e) {
                        programmi = null;
                    }
                    if (programmi && programmi.length > 0) {
                        return callback(null, programmi);
                    }
                    fetchPage(idCanale, data, callback);
                } else {
                    fetchPage(idCanale, data, callback);
                }
            });
        } else {
            fetchPage(idCanale, data, callback);
        }
    }
}

module.exports = RaiApi;
