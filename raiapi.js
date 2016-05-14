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

        this.getData = this.getData.bind(this);
        this.getFileUrl = this.getFileUrl.bind(this);
        this.listQualita = this.listQualita.bind(this);
        this.listProgrammi = this.listProgrammi.bind(this);
        this.listCanali = this.listCanali.bind(this);
        this.fetchPage = this.fetchPage.bind(this);
    }

    static handleRequest(req) {
        const offset = (req.query && Number(req.query.offset)) || 1
            , canale = raiapi.canali[req.params['canale']];

        if (_.isNaN(offset) || offset > 7 || offset < 1) {
            eIR.message = 'Offset non valido';
            return eIR;
        } else if (canale === undefined) {
            eIR.message = 'Canale non valido';
            return eIR;
        } else {
            req.programma = req.params['programma'];
            req.canale = canale;
            req.offset = offset;
            req.action = req.params['action'];
            req.qualita = req.params['qualita'];
        }
    }

    static getSizesOfProgramma(programma) {
        return _.keys(_.pick(programma, (value, key) => key.indexOf('h264_') === 0 && value !== ''));
    }

    getFileUrl(canale, offset, programma, qualita, onSuccess) {
        this.getData(canale, offset, programmi => {
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
        });
    }

    listQualita(canale, offset, programma, onSuccess) {
        this.getData(canale, offset, (programmi) => {
            onSuccess(RaiApi.getSizesOfProgramma(programmi[programma]).map((size, i) => ({
                    id: i,
                    name: size.replace(/_/g, ' ')
                })
            ));
        });
    }

    listProgrammi(canale, offset, onSuccess) {
        this.getData(canale, offset, programmi => {
            onSuccess(programmi.map((programma, i) => ({
                id: i,
                name: programma['t']
            })));
        });
    }

    listCanali() {
        return this.canali.map((name, id) => ({
            id: id,
            name: name
        }));
    }

    getData(canale, offset, onSuccess) {
        onSuccess = onSuccess.bind(this);

        const yesterday = moment().tz('Europe/Rome').subtract(offset, 'days')
            , redisKey = `${canale}:${yesterday.format('YYYY:MM:DD')}`;

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
        console.log(url);
        request(url, (error, response, body) => {
                if (error) {
                    throw error;
                } else if (response.statusCode == 404) {
                    throw eNF;
                } else if (error || response.statusCode != 200) {
                    eGE.message = `Errore generico: (${response.statusCode})`;
                    throw eGE;
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
}

const raiapi = new RaiApi();

//Canali
router.get('/canali', (req, res) => res.send(raiapi.listCanali()));

//Programmi
router.get('/canali/:canale/programmi', (req, res, next) => {
    const err = RaiApi.handleRequest(req);
    if (err) {
        next(err);
    } else {
        raiapi.listProgrammi(req.canale, req.offset, programmi => res.send(programmi));
    }
});

//Qualita
router.get('/canali/:canale/programmi/:programma/qualita', (req, res, next) => {
    const err = RaiApi.handleRequest(req);
    if (err) {
        next(err);
    } else if (!req.programma) {
        eIR.message = 'Programma non valido';
        next(eIR);
    } else {
        raiapi.listQualita(req.canale, req.offset, req.programma, qualita => res.send(qualita));
    }
});

//Risorsa
router.get('/canali/:canale/programmi/:programma/qualita/:qualita/:action', (req, res, next) => {
    const err = RaiApi.handleRequest(req);
    if (err) {
        next(eGE);
    } else if (!req.programma) {
        eIR.message = 'Programma non valido';
        next(eIR);
    } else if (req.action != 'file' && req.action != 'url') {
        eIR.message = 'Azione non valida';
        next(eIR);
    } else {
        raiapi.getFileUrl(req.canale, req.offset, req.programma, req.qualita, fileUrl => {
            if(!fileUrl){
                eNF.message = 'Qualita non valida';
                next(eNF);
            } else if (req.action == 'file') {
                res.redirect(fileUrl);
            } else if (req.action == 'url') {
                res.send({url: fileUrl});
            }
        });
    }
});

module.exports = router;
module.exports.setRedisClient = (client) => raiapi.redisClient = client;
