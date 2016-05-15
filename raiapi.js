/**
 * Created by massimilianocannarozzo on 13/04/14.
 */
var request = require('request').defaults({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko)' +
        ' Chrome/50.0.2661.94 Safari/537.36'
    },
    timeout: 25000,
    json: true,
    followRedirect: false
})
    , moment = require('moment-timezone')
    , _ = require('lodash');

class RaiApi {
    constructor() {
        this.channelMap = {
            "RaiUno": 1,
            "RaiDue": 2,
            "RaiTre": 3,
            "RaiCinque": 31,
            "RaiPremium": 32,
            "RaiYoyo": 38
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

    static getSizesOfProgramma(programma) {
        return _.keys(_.pick(programma, (value, key) => key.indexOf('h264_') === 0 && value !== ''));
    }

    getFileUrl(canale, offset, programma, qualita, onSuccess) {
        this.getData(canale, offset, programmi => {
            if (_.isEmpty(programmi)) {
                onSuccess();
            } else {
                const h264sizes = RaiApi.getSizesOfProgramma(programmi[programma])
                    , url = programmi[programma][h264sizes[qualita]];

                if (_.isEmpty(url)) {
                    onSuccess();
                } else {
                    request.get({
                        headers: {
                            'User-Agent': null
                        },
                        url: url
                    }, (error, response) => {
                        if (error || response.error || response.statusCode != 302) {
                            onSuccess();
                        } else {
                            onSuccess(response.headers.location);
                        }
                    });
                }
            }
        });
    }

    listQualita(canale, offset, programma, onSuccess) {
        this.getData(canale, offset, (programmi) => {
            if (_.isEmpty(programmi)) {
                onSuccess();
            } else {
                onSuccess(RaiApi.getSizesOfProgramma(programmi[programma]).map((size, i) => ({
                        id: i,
                        name: size.replace(/_/g, ' ')
                    }))
                );
            }
        });
    }

    listProgrammi(canale, offset, onSuccess) {
        this.getData(canale, offset, programmi => {
            if (_.isEmpty(programmi)) {
                onSuccess();
            } else {
                onSuccess(programmi.map((programma, i) => ({
                    id: i,
                    name: programma['t']
                })));
            }
        });
    }

    listCanali(onSuccess) {
        onSuccess(this.canali.map((name, id) => ({
            id: id,
            name: name
        })));
    }

    getData(canale, offset, onSuccess) {
        onSuccess = onSuccess.bind(this);

        const redisKey = `${canale}:${moment().tz('Europe/Rome').subtract(offset, 'days').format('YYYY:MM:DD')}`;

        if (this.redisClient && this.redisClient.connected) {
            this.redisClient.get(redisKey, (err, reply) => {
                if (!err) {
                    var programmi = null;
                    try {
                        programmi = JSON.parse(reply);
                    } catch (e) {
                        programmi = null;
                    }
                    if (programmi) {
                        onSuccess(programmi);
                    } else {
                        this.fetchPage(canale, offset, programmi => onSuccess(programmi));
                    }
                } else {
                    this.fetchPage(canale, offset, programmi => onSuccess(programmi));
                }
            });
        } else this.fetchPage(canale, offset, programmi => onSuccess(programmi));
    }

    fetchPage(canale, offset, onSuccess) {
        const day = moment().tz('Europe/Rome').subtract(offset, 'days')
            , redisKey = `${canale}:${day.format('YYYY:MM:DD')}`
            , url = `http://www.rai.it/dl/portale/html/palinsesti/replaytv/static/${redisKey.replace(/:/g, '_')}.html`;

        request(url, (error, response, body) => {
                if (error || response.statusCode == 404 || response.statusCode != 200) {
                    onSuccess();
                } else {
                    const programmi = _.values(body[this.channelMap[canale]][day.format('YYYY-MM-DD')]);

                    if (this.redisClient && this.redisClient.connected) {
                        this.redisClient.set(redisKey, JSON.stringify(programmi), 'EX', 86400 * (7 - offset + 1));
                    }

                    onSuccess(programmi);
                }
            }
        );
    }

    setRedisClient(client) {
        this.redisClient = client;
    }
}

module.exports = RaiApi;