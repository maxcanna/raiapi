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
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko)' +
                ' Chrome/35.0.1905.2 Safari/537.36'
        },
        timeout: 25000,
        json: true,
        followRedirect: false
    })
    , moment = require('moment-timezone')
    , router = require('express').Router()
    , canali = Object.keys(channelMap)
    , onSuccess
    , getSizesOfProgramma = function (programma) {
        return Object.keys(programma).filter(function (entry) {
            return entry.indexOf("h264_") == 0;
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

        if (programma === undefined) {
            eIR.message = 'Programma non valido';
            next(eIR);
            return;
        }

        const h264sizes = getSizesOfProgramma(programma)
            , url = programma[h264sizes[req.param('qualita')]];

        if (url === undefined || url == '') {
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
            res.set('X-Mashape-Billing', 'full request=1');
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

        if (programma === undefined) {
            eIR.message = 'Programma non valido';
            next(eIR);
            return;
        }

        const response = [];
        for (var i = 0; i < h264sizes.length; i++) {
            if (programma[h264sizes[i]]) {
                response.push({
                    id: i,
                    name: h264sizes[i]
                });
            }
        }
        res.send(response);
    }
    , listProgrammi = function (req, res, next, programmi) {
        const response = [];
        for (var i = 0; i < programmi.length; i++) {
            var programma = programmi[i]
                , h264sizes = getSizesOfProgramma(programma);
            for (var j = 0; j < h264sizes.length; j++) {
                if (programma[h264sizes[j]]) {
                    response.push({
                        id: i,
                        name: programma.t
                    });
                    break;
                }
            }
        }
        res.send(response);
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
    , handleRequest = function (req, res, next) {
        var offset = 1;
        if (req.query.offset) {
            offset = Number(req.query.offset);
            if (offset > 7 || offset < 1) {
                eIR.message = 'Offset non valido';
                next(eIR);
                return;
            }
        }

        const yesterday = moment().tz('Europe/Rome').subtract(offset, 'days')
            , canale = canali[req.param('canale')]
            , fileName = canale + '_' + yesterday.format('YYYY_MM_DD') + '.html'
            , url = 'http://www.rai.it/dl/portale/html/palinsesti/replaytv/static/';

        if (canale === undefined) {
            eIR.message = 'Canale non valido';
            next(eIR);
            return;
        }

        request.get(url + fileName, function (error, response, body) {
            if (response.statusCode == 404) {
                next(eNF);
            } else if (error || response.statusCode != 200) {
                eGE.message = 'Errore generico: (' + response.statusCode + ')';
                next(eGE);
            } else {
        //TODO Usare redis per salvare in cache il body response con una validita' di sette giorni evitando il fetch
                const programmi = body[channelMap[canale]][yesterday.format('YYYY-MM-DD')]
                    , programmiArr = [];

                Object.keys(programmi).forEach(function (orario) {
                    programmiArr.push(programmi[orario]);
                });

                onSuccess(req, res, next, programmiArr);
            }
        });
    };

//Canali
router.get('/canali', listCanali);

//Programmi
router.get('/canali/:canale/programmi', function (req, res, next) {
    onSuccess = listProgrammi;
    handleRequest(req, res, next);
});

//Qualita
router.get('/canali/:canale/programmi/:programma/qualita', function (req, res, next) {
    onSuccess = listQualita;
    handleRequest(req, res, next);
});

//Risorsa
router.get('/canali/:canale/programmi/:programma/qualita/:qualita/:action', function (req, res, next) {
    onSuccess = getFile;
    handleRequest(req, res, next);
});

module.exports = router;