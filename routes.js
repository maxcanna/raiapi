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
};

//Canali
router.get('/canali', (req, res) => res.send(raiapi.listCanali()));

//Programmi
router.get('/canali/:canale/programmi', (req, res, next) => {
    const err = handleRequest(req);
    if (err) {
        next(err);
    } else {
        raiapi.listProgrammi(req.canale, req.offset, programmi => programmi ? res.send(programmi) : next(eGE));
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
        raiapi.listQualita(req.canale, req.offset, req.programma, qualita => qualita ? res.send(qualita) : next(eGE));
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
        raiapi.getFileUrl(req.canale, req.offset, req.programma, req.qualita, fileUrl => {
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
