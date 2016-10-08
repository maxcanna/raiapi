/**
 * Created by massimilianocannarozzo on 14/05/16.
 */
/* eslint no-unused-vars: "off" */
/* eslint-env node */
const raiapi = new (require('./raiapi'))()
    , router = require('express').Router()
    , redisClient = process.env.REDISCLOUD_URL ? require('redis').createClient(process.env.REDISCLOUD_URL) : null
    , moment = require('moment-timezone')
    , eIR = new Error()
    , eNF = new Error('Dati non disponibili')
    , eGE = new Error('Errore generico');
eGE.status = 500;
eNF.status = 404;
eIR.status = 400;

var handleRequest = (req) => {
    const tz = 'Europe/rome';
    var m;

    if (req.query.data === undefined) {
        m = moment.tz(tz).startOf('day').subtract(1, 'day');
    } else {
        m = moment(req.query.data, 'YYYY-MM-DD').tz(tz);
        if (!m.isValid()) {
            eIR.message = 'Data non valida';
            return eIR;
        }
    }

    const diff = moment.tz(tz).diff(m, 'days');

    if (diff > 7 || diff < 1) {
        eIR.message = 'Data non valida';
        return eIR;
    } else if (req.params.canale > raiapi.canali.length) {
        eIR.message = 'Canale non valido';
        return eIR;
    } else {
        req.programma = req.params.programma;
        req.canale = req.params.canale;
        req.data = m.toDate();
        req.action = req.params.action;
        req.qualita = req.params.qualita;
    }
};

//Canali
router.get('/canali', (req, res) => raiapi.listCanali(canali => res.send(canali)));

//Programmi
router.get('/canali/:canale/programmi', (req, res, next) => {
    const err = handleRequest(req);
    if (err) {
        next(err);
    } else {
        raiapi.listProgrammi(req.canale, req.data, programmi => programmi ? res.send(programmi) : next(eGE));
    }
});

//Qualita
router.get('/canali/:canale/programmi/:programma/qualita', (req, res, next) => {
    const err = handleRequest(req);
    if (err) {
        next(err);
    } else if (!req.programma) {
        eIR.message = 'Programma non valido';
        next(eIR);
    } else {
        raiapi.listQualita(req.canale, req.data, req.programma, qualita => qualita ? res.send(qualita) : next(eGE));
    }
});

//Risorsa
router.get('/canali/:canale/programmi/:programma/qualita/:qualita/:action', (req, res, next) => {
    const err = handleRequest(req);
    if (err) {
        next(err);
    } else if (!req.programma) {
        eIR.message = 'Programma non valido';
        next(eIR);
    } else if (req.action != 'file' && req.action != 'url') {
        eIR.message = 'Azione non valida';
        next(eIR);
    } else {
        raiapi.getFileUrl(req.canale, req.data, req.programma, req.qualita, fileUrl => {
            if (!fileUrl) {
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

if(redisClient) {
    redisClient.on('error', console.error);
    redisClient.on('connect', () => console.log('Connected to redis'));
}

raiapi.setRedisClient(redisClient);

module.exports = router;
