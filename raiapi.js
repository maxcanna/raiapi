/* jshint unused: false */
const eIR = new Error()
    , eNF = new Error('Dati non disponibili')
    , eGE = new Error('Errore generico');
eGE.status = 500;
eNF.status = 404;
eIR.status = 400;

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
    , router = require('express').Router()
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

        this.handleRequest = _.bind(this.handleRequest, this);
        this.getFile = _.bind(this.getFile, this);
        this.listQualita = _.bind(this.listQualita, this);
        this.listProgrammi = _.bind(this.listProgrammi, this);
        this.listCanali = _.bind(this.listCanali, this);
        this.fetchPage = _.bind(this.fetchPage, this);
    }

    static getSizesOfProgramma(programma) {
        return _.pick(programma, function (value, key) {
            return key.indexOf('h264_') === 0 && value !== '';
        });
    }

    getFile(req, res, next) {
        const action = req.params['action'];

        if (action != 'file' && action != 'url') {
            eIR.message = 'Azione non valida';
            next(eIR);
            return;
        }
        this.handleRequest(req, res, next, function (programmi) {
            const programma = programmi[req.params['programma']];

            if (!programma) {
                eIR.message = 'Programma non valido';
                next(eIR);
                return;
            }

            const h264sizes = RaiApi.getSizesOfProgramma(programma)
                , url = programma[_.keys(h264sizes)[req.params['qualita']]];

            if (!url || url === '') {
                eIR.message = 'Qualita non valida';
                next(eIR);
                return;
            }

            const options = {
                headers: {
                    'User-Agent': null
                },
                url: url
            };

            request.get(options, function (error, response) {
                if (response.error ||
                    response.statusCode != 302 ||
                    response.headers.location === undefined) {
                    eGE.message = 'Errore generico: (' + response.statusCode + ')';
                    next(eGE);
                } else if (action == 'file') {
                    res.redirect(response.headers.location);
                } else if (action == 'url') {
                    res.send({
                        url: response.headers.location
                    });
                }
            });
        });
    }

    listQualita(req, res, next) {
        this.handleRequest(req, res, next, function (programmi) {
            const programma = programmi[req.params['programma']]
                , h264sizes = RaiApi.getSizesOfProgramma(programma);

            if (!programma) {
                eIR.message = 'Programma non valido';
                next(eIR);
                return;
            }

            res.send(_.map(_.keys(h264sizes), function (size, i) {
                return {
                    id: i,
                    name: size.replace(/_/g, ' ')
                };
            }));
        });
    }

    listProgrammi(req, res, next) {
        this.handleRequest(req, res, next, function (programmi) {
            res.send(_.map(programmi, function (programma, i) {
                return {
                    id: i,
                    name: programma['t']
                };
            }));
        });
    }

    listCanali(req, res) {
        res.send(_.map(this.canali, function (name, id) {
            return {
                id: id,
                name: name
            };
        }));
    }

    handleRequest(req, res, next, onSuccess) {
        const offset = (req.query && Number(req.query.offset)) || 1;
        onSuccess = _.bind(onSuccess, this);

        if (_.isNaN(offset) || offset > 7 || offset < 1) {
            eIR.message = 'Offset non valido';
            next(eIR);
            return;
        }

        const yesterday = moment().tz('Europe/Rome').subtract(offset, 'days')
            , canale = this.canali[req.params['canale']]
            , redisKey = canale + ':' + yesterday.format('YYYY:MM:DD');

        if (canale === undefined) {
            eIR.message = 'Canale non valido';
            next(eIR);
            return;
        }

        if (this.redisClient && this.redisClient.connected) {
            this.redisClient.get(redisKey, _.bind(function (err, reply) {
                if (!err) {
                    var programmi = null;
                    try {
                        programmi = JSON.parse(reply);
                    } catch (e) {
                        programmi = null;
                    }
                    if (programmi) {
                        onSuccess(programmi);
                    } else this.fetchPage(req, next, offset, onSuccess);
                }
            }, this));
        } else this.fetchPage(req, next, offset, onSuccess);
    }

    fetchPage(req, next, offset, onSuccess) {
        const day = moment().tz('Europe/Rome').subtract(offset, 'days')
            , canale = this.canali[req.params['canale']]
            , redisKey = `${canale}:${day.format('YYYY:MM:DD')}`
            , url = `http://www.rai.it/dl/portale/html/palinsesti/replaytv/static/${redisKey.replace(/:/g, '_')}.html`;
        request(url, _.bind(function (error, response, body) {
                if (error) {
                    throw error;
                } else if (response.statusCode == 404) {
                    next(eNF);
                } else if (error || response.statusCode != 200) {
                    eGE.message = 'Errore generico: (' + error.message || response.statusCode + ')';
                    next(eGE);
                } else {
                    const programmi = _.values(body[this.channelMap[canale]][day.format('YYYY-MM-DD')]);

                    if (this.redisClient && this.redisClient.connected) {
                        this.redisClient.set(redisKey, JSON.stringify(programmi), 'EX', 86400 * (7 - offset + 1));
                    }

                    onSuccess(programmi);
                }
            }, this)
        );
    }
}

const raiapi = new RaiApi();

//Canali
router.get('/canali', raiapi.listCanali);

//Programmi
router.get('/canali/:canale/programmi', raiapi.listProgrammi);

//Qualita
router.get('/canali/:canale/programmi/:programma/qualita', raiapi.listQualita);

//Risorsa
router.get('/canali/:canale/programmi/:programma/qualita/:qualita/:action', raiapi.getFile);

module.exports = router;
module.exports.setRedisClient = function (client) {
    raiapi.redisClient = client;
};