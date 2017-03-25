/**
 * Created by massimilianocannarozzo on 13/04/14.
 */
/* eslint-env node */
var request = require('request').defaults({
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
    , _ = require('lodash');

class RaiApi {
    constructor() {
        this.channelMap = {
            "RaiUno": 1,
            "RaiDue": 2,
            "RaiTre": 3,
            "RaiCinque": 31,
            "RaiPremium": 32,
            "RaiYoyo": 38,
        };
        this.canali = _.keys(this.channelMap);
        this.redisClient = null;

        this.getData = this.getData.bind(this);
        this.getFileUrl = this.getFileUrl.bind(this);
        this.listQualita = this.listQualita.bind(this);
        this.listProgrammi = this.listProgrammi.bind(this);
        this.listCanali = this.listCanali.bind(this);
        this.fetchPage = this.fetchPage.bind(this);
    }

    static isGeofenced(programma) {
        return _.filter(programma, (value, key) => key.startsWith('dir')).join().toLowerCase().indexOf('geoprotezione') >= 0;
    }

    static getSizesOfProgramma(programma) {
        return _.filter(_.keys(programma), (key) => _.startsWith(key, 'h264_') && programma[key] !== '');
    }

    static getEffectiveUrl(url, qualita, useProxy, callback) {
        request.get({
            headers: {
                'User-Agent': 'raiweb',
            },
            proxy: useProxy ? process.env.HTTP_PROXY_RAI : undefined,
            url: url,
        }, (error, response) => {
            if (error || response.error || response.statusCode != 302) {
                callback(eNF);
            } else {
                var fileUrl = response.headers.location;
                if (fileUrl) {
                    const parts = fileUrl.match(/.+(\d).*-.+i(\/.*,?\d_).*/i);
                    if (fileUrl && parts) {
                        fileUrl = `http://creativemedia${parts[1]}.rai.it${parts[2]}${qualita}.mp4`
                    }
                }

                callback(null, fileUrl);
            }
        });
    }

    getAll(idCanale, data, callback) {
        this.getData(idCanale, data, (error, programmi) => {
            if (error) {
                callback(error);
                return;
            }

            if (_.isEmpty(programmi)) {
                callback(eNF);
                return;
            }

            async.concat(programmi, (programma, concatCallback) => {
                async.map(RaiApi.getSizesOfProgramma(programma), (size, sizesCallback) => {
                    sizesCallback(null, {
                        name: programma.t.trim(),
                        qualita: size.replace('_', ' '),
                        url: programma[size],
                        geofenced: RaiApi.isGeofenced(programma),
                    });
                }, (err, sizes) => {
                    // Ugly way to remove duplicate URLs keeping the best available one
                    concatCallback(null, _.reverse(_.uniqBy(_.reverse(sizes), 'url')))
                });
            }, (err, items) => {
                async.filter(items, (item, urlCallback) => {
                    RaiApi.getEffectiveUrl(item.url, item.qualita.split(' ')[1], item.geofenced, (err, url) => {
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
                callback(error);
                return;
            }

            if (_.isEmpty(programmi)) {
                callback(eNF);
                return;
            }

            const programma = programmi[idProgramma];

            if (programma === undefined) {
                callback(eNF);
                return;
            }

            const h264sizes = RaiApi.getSizesOfProgramma(programma)
                , geofenced = RaiApi.isGeofenced(programma)
                , url = programma[h264sizes[qualita]];

            if (_.isEmpty(url)) {
                callback(eNF);
                return;
            }
            RaiApi.getEffectiveUrl(url, h264sizes[qualita].split('_')[1], geofenced, (error, url) => {
                callback(error, {
                    url: url,
                    geofenced: geofenced,
                });
            });
        });
    }

    listQualita(idCanale, data, idProgramma, callback) {
        this.getData(idCanale, data, (error, programmi) => {
            if (error) {
                callback(error);
                return;
            }

            if (_.isEmpty(programmi)) {
                callback(eNF);
                return;
            }
            const programma = programmi[idProgramma];

            if (programma === undefined) {
                callback(eNF);
                return;
            }

            callback(null, RaiApi.getSizesOfProgramma(programma).map((size, i) => ({
                    id: i,
                    name: size.replace(/_/g, ' '),
                }))
            );
        });
    }

    listProgrammi(idCanale, data, callback) {
        this.getData(idCanale, data, (error, programmi) => {
            if (error) {
                callback(error);
                return;
            }

            if (_.isEmpty(programmi)) {
                callback(eNF);
                return;
            }
            callback(null, programmi.map((programma, i) => ({
                id: i,
                name: programma.t.trim(),
            })));
        });
    }

    listCanali(callback) {
        callback = callback.bind(this);

        if (this.redisClient && this.redisClient.connected) {
            this.redisClient.get('canali', (err, reply) => {
                if (!err) {
                    var channelMap = null;
                    try {
                        channelMap = JSON.parse(reply);
                    } catch (e) {
                        channelMap = null;
                    }
                    if (channelMap && _.keys(channelMap).length > 0) {
                        this.channelMap = channelMap;
                        this.canali = _.keys(this.channelMap);

                        callback(null, this.canali.map((name, id) => ({
                            id: id,
                            name: name,
                        })));

                        return;
                    }
                    this.fetchCanali(callback);
                } else {
                    this.fetchCanali(callback);
                }
            });
        } else this.fetchCanali(callback);
    }

    getData(idCanale, data, callback) {
        callback = callback.bind(this);

        const redisKey = `${this.canali[idCanale]}:${moment(data).format('YYYY:MM:DD')}`;

        if (this.redisClient && this.redisClient.connected) {
            this.redisClient.get(redisKey, (err, reply) => {
                if (!err) {
                    var programmi = null;
                    try {
                        programmi = JSON.parse(reply);
                    } catch (e) {
                        programmi = null;
                    }
                    if (programmi && programmi.length > 0) {
                        callback(null, programmi);
                        return;
                    }
                    this.fetchPage(idCanale, data, callback);
                } else {
                    this.fetchPage(idCanale, data, callback);
                }
            });
        } else this.fetchPage(idCanale, data, callback);
    }

    fetchPage(idCanale, data, callback) {
        const canale = this.canali[idCanale]
            , m = moment(data)
            , redisKey = `${canale}:${m.format('YYYY:MM:DD')}`
            , url = `http://www.rai.it/dl/portale/html/palinsesti/replaytv/static/${canale}_${m.format('YYYY_MM_DD')}.html`;

        request.get(url, (error, response, body) => {
                if (error || response.statusCode == 404 || response.statusCode != 200) {
                    callback(error || new Error(response.statusCode));
                } else {
                    const programmi = _.values(body[this.channelMap[canale]][`${m.format('YYYY-MM-DD')}`]);

                    if (programmi.length > 0 && this.redisClient && this.redisClient.connected) {
                        this.redisClient.set(redisKey, JSON.stringify(programmi), 'EX', 1800); //30 minutes
                    }

                    callback(null, programmi);
                }
            }
        );
    }

    fetchCanali(callback) {
        const url = 'http://www.rai.it/dl/RaiTV/iphone/android/smartphone/advertising_config.html';

        request.get(url, (error, response, body) => {
                if (error || response.statusCode == 404 || response.statusCode != 200) {
                    // Use static channel map
                    callback(null, this.canali);
                } else {
                    this.canali = {};

                    _.filter(body.Channels, _.iteratee({hasReplay: 'YES'})).map(canale => {
                        this.canali[canale.tag] = canale.id;
                    });

                    this.canali = _.keys(this.channelMap);

                    if (this.canali.length > 0 && this.redisClient && this.redisClient.connected) {
                        this.redisClient.set('canali', JSON.stringify(this.channelMap), 'EX', 86400);
                    }

                    callback(null, this.canali.map((name, id) => ({
                        id: id,
                        name: name,
                    })));
                }
            }
        );
    }

    setRedisClient(client) {
        this.redisClient = client;
    }
}

module.exports = RaiApi;
