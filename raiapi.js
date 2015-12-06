const channelMap = {
        "RaiUno": 1,
        "RaiDue": 2,
        "RaiTre": 3,
        "RaiCinque": 31,
        "RaiPremium": 32,
        "RaiYoyo": 38
    }
    , eIR = new Error()
    , eNF = new Error('Dati non disponibili')
    , eGE = new Error('Errore generico');

eGE.status = 500;
eNF.status = 404;
eIR.status = 400;

var request = require('request').defaults({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko)' +
            ' Chrome/47.0.2526.73 Safari/537.36'
        },
        timeout: 25000,
        json: true,
        followRedirect: false
    })
    , moment = require('moment-timezone')
    , router = require('express').Router()
    , _ = require('underscore')
    , redisClient
    , canali = Object.keys(channelMap)
    , getSizesOfProgramma = function (programma) {
        return _.pick(programma, function (value, key) {
            return key.indexOf("h264_") == 0 && value != '';
        });
    }
    , getFile = function (req, res, next, programmi) {
        const action = req.param('action');

        if (action != 'file' && action != 'url') {
            eIR.message = 'Azione non valida';
            next(eIR);
            return;
        }

        const programma = programmi[req.param('programma')];

        if (!programma) {
            eIR.message = 'Programma non valido';
            next(eIR);
            return;
        }

        const h264sizes = getSizesOfProgramma(programma)
            , url = programma[_.keys(h264sizes)[req.param('qualita')]];

        if (!url || url == '') {
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
                response.headers.location == undefined) {
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
    }
    , listQualita = function (req, res, next, programmi) {
        const programma = programmi[req.param('programma')]
            , h264sizes = getSizesOfProgramma(programma);

        if (!programma) {
            eIR.message = 'Programma non valido';
            next(eIR);
            return;
        }

        res.send(_.map(_.keys(h264sizes), function(size, i){
            return {
                id: i,
                name: size.replace(/_/g,' ')
            };
        }));
    }
    , listProgrammi = function (req, res, next, programmi) {
        res.send(_.map(programmi, function(programma, i){
            return {
                id: i,
                name: programma['t']
            };
        }));
    }
    , listCanali = function (req, res) {
        const response = [];
        for (var i = 0; i < canali.length; i++) {
            response.push({
                id: i,
                name: canali[i]
            });
        }

        res.send(response);
    }
    , handleRequest = function (req, res, next, onSuccess) {
        var offset = (req.query && Number(req.query.offset)) || 1;
        onSuccess = _.partial(onSuccess, req, res, next);

        if (_.isNaN(offset) || offset > 7 || offset < 1) {
            eIR.message = 'Offset non valido';
            next(eIR);
            return;
        }

        const yesterday = moment().tz('Europe/Rome').subtract(offset, 'days')
            , canale = canali[req.param('canale')]
            , redisKey = canale + ':' + yesterday.format('YYYY:MM:DD');

        if (canale === undefined) {
            eIR.message = 'Canale non valido';
            next(eIR);
            return;
        }

        if (redisClient && redisClient.connected) {
            redisClient.get(redisKey, function (err, reply) {
                if (!err) {
                    try {
                        var programmi = JSON.parse(reply)
                    } catch (e) {
                        programmi = null;
                    }
                    if (programmi) {
                        onSuccess(programmi);
                    } else fetchPage(req, res, next, offset, onSuccess);
                }
            });
        } else fetchPage(req, res, next, offset, onSuccess);
    }

    , fetchPage = function (req, res, next, offset, onSuccess) {
        const day = moment().tz('Europe/Rome').subtract(offset, 'days')
            , canale = canali[req.param('canale')]
            , redisKey = canale + ':' + day.format('YYYY:MM:DD')
            , url = 'http://www.rai.it/dl/portale/html/palinsesti/replaytv/static/';

        request.get(url + redisKey.replace(/:/g,'_') + '.html', function (error, response, body) {
            if (response.statusCode == 404) {
                next(eNF);
            } else if (error || response.statusCode != 200) {
                eGE.message = 'Errore generico: (' + error.message || response.statusCode + ')';
                next(eGE);
            } else {
                const programmi = _.values(body[channelMap[canale]][day.format('YYYY-MM-DD')]);

                if (redisClient && redisClient.connected) {
                    redisClient.set(redisKey, JSON.stringify(programmi), 'EX', 86400 * (7-offset+1));
                }

                onSuccess(programmi);
            }
        });
    };

//Canali
router.get('/canali', function (req, res) {
    listCanali(req, res);
});

//Programmi
router.get('/canali/:canale/programmi', function (req, res, next) {
    handleRequest(req, res, next, listProgrammi);
});

//Qualita
router.get('/canali/:canale/programmi/:programma/qualita', function (req, res, next) {
    handleRequest(req, res, next, listQualita);
});

//Risorsa
router.get('/canali/:canale/programmi/:programma/qualita/:qualita/:action', function (req, res, next) {
    handleRequest(req, res, next, getFile);
});

module.exports = router;
module.exports.setRedisClient = function (client) {
    redisClient = client
};