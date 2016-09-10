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
        return _.filter(_.keys(programma), (key) => _.startsWith(key, 'h264_') && programma[key] !== '');
    }

    static getKeyOfData(data) {
        return `${data.getFullYear()}:${('0'+(data.getMonth()+1)).slice(-2)}:${('0'+(data.getDate())).slice(-2)}`;
    }

    getFileUrl(idCanale, data, idProgramma, qualita, onSuccess) {
        this.getData(idCanale, data, programmi => {
            if (_.isEmpty(programmi)) {
                onSuccess();
                return;
            }

            const programma = programmi[idProgramma];

            if (programma === undefined) {
                onSuccess();
                return;
            }

            const h264sizes = RaiApi.getSizesOfProgramma(programma)
                , url = programma[h264sizes[qualita]];

            if (_.isEmpty(url)) {
                onSuccess();
                return;
            }
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
        });
    }

    listQualita(idCanale, data, idProgramma, onSuccess) {
        this.getData(idCanale, data, (programmi) => {
            if (_.isEmpty(programmi)) {
                onSuccess();
                return;
            }
            const programma = programmi[idProgramma];

            if (programma === undefined) {
                onSuccess();
                return;
            }

            onSuccess(RaiApi.getSizesOfProgramma(programma).map((size, i) => ({
                    id: i,
                    name: size.replace(/_/g, ' ')
                }))
            );
        });
    }

    listProgrammi(idCanale, data, onSuccess) {
        this.getData(idCanale, data, programmi => {
            if (_.isEmpty(programmi)) {
                onSuccess();
                return;
            }
            onSuccess(programmi.map((programma, i) => ({
                id: i,
                name: programma['t']
            })));
        });
    }

    listCanali(onSuccess) {
        onSuccess(this.canali.map((name, id) => ({
            id: id,
            name: name
        })));
    }

    getData(idCanale, data, onSuccess) {
        onSuccess = onSuccess.bind(this);

        const redisKey = `${idCanale}:${RaiApi.getKeyOfData(data)}`;

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
                        onSuccess(programmi);
                        return;
                    }
                    this.fetchPage(idCanale, data, onSuccess);
                } else {
                    this.fetchPage(idCanale, data, onSuccess);
                }
            });
        } else this.fetchPage(idCanale, data, onSuccess);
    }

    fetchPage(idCanale, data, onSuccess) {
        const redisKey = `${idCanale}:${RaiApi.getKeyOfData(data)}`
            , url = `http://www.rai.it/dl/portale/html/palinsesti/replaytv/static/${redisKey.replace(/:/g, '_')}.html`;

        request.get(url, (error, response, body) => {
                if (error || response.statusCode == 404 || response.statusCode != 200) {
                    onSuccess();
                } else {
                    const programmi = _.values(body[this.channelMap[idCanale]][`${RaiApi.getKeyOfData(data).replace(/:/g, '-')}`]);

                    if (programmi.length > 0 && this.redisClient && this.redisClient.connected) {
                        this.redisClient.set(redisKey, JSON.stringify(programmi), 'EX', 86400 * 7);
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
