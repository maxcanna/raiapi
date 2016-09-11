/**
 * Created by massimilianocannarozzo on 14/05/16.
 */
/* jshint unused: false */
const raiapi = new (require('./raiapi'))()
    , router = require('express').Router()
    , _ = require('lodash')
    , redisClient = require('redis').createClient(process.env['REDISCLOUD_URL'])
    , eIR = new Error()
    , eNF = new Error('Dati non disponibili')
    , eGE = new Error('Errore generico');
eGE.status = 500;
eNF.status = 404;
eIR.status = 400;

var handleRequest = (req) => {
    var data = new Date();

    data.setDate(data.getDate() - 1);

    if (req.query.data !== undefined) {
        data = new Date(req.query.data);
        if (isNaN(data.getDate())) {
            eIR.message = 'Data non valida';
            return eIR;
        }
    }

    var diff = Math.floor((new Date() - data) / (1000 * 60 * 60 * 24));

    if (diff > 7 || diff < 1) {
        eIR.message = 'Data non valida';
        return eIR;
    } else if (req.params.canale > raiapi.canali.length) {
        eIR.message = 'Canale non valido';
        return eIR;
    } else {
        req.programma = req.params['programma'];
        req.canale = req.params['canale'];
        req.data = data;
        req.action = req.params['action'];
        req.qualita = req.params['qualita'];
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

redisClient.on('error', console.error);
redisClient.on('connect', () => console.log('Connected to redis'));

raiapi.setRedisClient(redisClient);

module.exports = router;
