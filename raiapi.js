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
    })
    , moment = require('moment')
    , async = require('async')
    , createError = require('http-errors')
    , eNF = createError.NotFound('Dati non disponibili')
    , {
        env: {
            HTTP_PROXY_RAI: proxyUrl,
            NODE_ENV: environment = 'development',
            REDISCLOUD_URL,
        },
    } = process
    , redisClient = REDISCLOUD_URL ? require('redis').createClient(REDISCLOUD_URL, {
        prefix: environment + ':' ,
    }) : { connected: false }
    , _ = require('lodash');

if (REDISCLOUD_URL) {
    redisClient.on('error', console.error);
    redisClient.on('connect', () => console.log('Connected to redis'));
}

let channelMap = {
    'RaiUno': 1,
    'RaiDue': 2,
    'RaiTre': 3,
    'RaiCinque': 31,
    'RaiPremium': 32,
    'RaiYoyo': 38,
};

const getCanali = () => Object.keys(channelMap);

const getValueOfDirKeys = programma => Object.keys(programma)
    .filter(key => key.indexOf('dir') === 0)
    .map(key => programma[key])
    .join()
    .toLowerCase();

const isGeofenced = programma => getValueOfDirKeys(programma)
    .indexOf('geoprotezione') >= 0;

const isAvailable = programma => {
    const hasRaiPlay = getValueOfDirKeys(programma)
        .indexOf('visibilita:n') < 0;

    const geofenced = isGeofenced(programma) && !proxyUrl;

    return hasRaiPlay && !geofenced;
};

const getSizesOfProgramma = programma => !isAvailable(programma) ?
    [] :
    Object.keys(programma)
        .filter(key => key.indexOf('h264_') === 0 && programma[key] !== '');

const getEffectiveUrl = (url, qualita, useProxy, callback) => {
    request.get({
        headers: {
            'User-Agent': 'raiweb',
        },
        proxy: useProxy ? proxyUrl : undefined,
        url: url,
    }, (error, response) => {
        if (error || response.error || response.statusCode !== 302) {
            callback(eNF);
        } else {
            let { headers: { location: fileUrl } } = response;
            if (fileUrl) {
                fileUrl = fileUrl.replace(/_\d*?\.mp4$/, `_${qualita}.mp4`);
            }

            callback(null, fileUrl);
        }
    });
};

const fetchPage = (idCanale, data, callback) => {
    const canale = getCanali()[idCanale]
        , m = moment(data)
        , redisKey = `${canale}:${m.format('YYYY:MM:DD')}`
        , url = `http://www.rai.it/dl/portale/html/palinsesti/replaytv/static/${canale}_${m.format('YYYY_MM_DD')}.html`;

    if (idCanale > getCanali().length) {
        return callback(createError.BadRequest('Canale non valido'));
    }

    request.get(url, (error, response, body) => {
            if (error || response.statusCode === 404 || response.statusCode !== 200) {
                callback(error || new Error(response.statusCode));
            } else {
                const programmi = _.values(body[channelMap[canale]][`${m.format('YYYY-MM-DD')}`]);

                if (programmi.length > 0 && redisClient.connected) {
                    redisClient.set(redisKey, JSON.stringify(programmi), 'EX', 1800); //30 minutes
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

                if (getCanali().length > 0 && redisClient.connected) {
                    redisClient.set('canali', JSON.stringify(channelMap), 'EX', 86400);
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
                async.filter(items, (item, urlCallback) => {
                    const useProxy = proxyUrl && item.geofenced;
                    getEffectiveUrl(item.url, item.qualita.split(' ')[1], useProxy, (err, url) => {
                        item.url = url;
                        urlCallback(null, !err);
                    });
                }, callback);
            });
        });
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

            const h264sizes = getSizesOfProgramma(programma)
                , geofenced = isGeofenced(programma)
                , url = programma[h264sizes[qualita]];

            if (_.isEmpty(url)) {
                return callback(eNF);
            }
            getEffectiveUrl(url, h264sizes[qualita].split('_')[1], geofenced, (error, url) => {
                callback(error, {
                    url,
                    geofenced,
                });
            });
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
                }))
            );
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
            callback(null, programmi.map((programma, i) => ({
                id: i,
                name: programma.t.trim(),
            })));
        });
    }

    listCanali(callback) {
        callback = callback.bind(this);

        if (redisClient.connected) {
            redisClient.get('canali', (err, reply) => {
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

        const redisKey = `${getCanali()[idCanale]}:${moment(data).format('YYYY:MM:DD')}`;

        if (redisClient.connected) {
            redisClient.get(redisKey, (err, reply) => {
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
