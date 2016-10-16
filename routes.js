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
    , eNF = new Error('Dati non disponibili');
eNF.status = 404;
eIR.status = 400;

router.use((req, res, next) => {
    const tz = 'Europe/rome';
    var m;

    if (req.query.data === undefined) {
        m = moment.tz(tz).startOf('day').subtract(1, 'day');
    } else {
        m = moment(req.query.data, 'YYYY-MM-DD').tz(tz);
        if (!m.isValid()) {
            eIR.message = 'Data non valida';
            next(eIR);
            return;
        }
    }

    const diff = moment.tz(tz).diff(m, 'days');

    if (diff > 7 || diff < 1) {
        eIR.message = 'Data non valida';
        next(eIR);
    } else if (req.params.canale > raiapi.canali.length) {
        eIR.message = 'Canale non valido';
        next(eIR);
    }
    req.query.data = m.toDate();
    next();
});

//Canali
router.get('/canali', (req, res, next) => {
    raiapi.listCanali((error, canali) => {
        error ? next(error) : res.send(canali)
    });
});

//Programmi
router.get('/canali/:canale/programmi', (req, res, next) => {
    raiapi.listProgrammi(req.params.canale, req.query.data, (error, programmi) => {
        error ? next(error) : res.send(programmi)
    });
});

//Qualita
router.get('/canali/:canale/programmi/:programma/qualita', (req, res, next) => {
    raiapi.listQualita(req.params.canale, req.query.data, req.params.programma, (error, qualita) => {
        error ? next(error) : res.send(qualita)
    });
});

//Risorsa
router.get('/canali/:canale/programmi/:programma/qualita/:qualita/:action', (req, res, next) => {
    if (['file', 'url'].indexOf(req.params.action) < 0) {
        eIR.message = 'Azione non valida';
        next(eIR);
    } else {
        raiapi.getFileUrl(req.params.canale, req.query.data, req.params.programma, req.params.qualita, (error, fileUrl) => {
            if (error) {
                next(error);
            } else if (req.params.action == 'file') {
                res.redirect(fileUrl);
            } else if (req.params.action == 'url') {
                res.send({url: fileUrl});
            }
        });
    }
});

if (redisClient) {
    redisClient.on('error', console.error);
    redisClient.on('connect', () => console.log('Connected to redis'));
}

raiapi.setRedisClient(redisClient);

module.exports = router;
