/**
 * Created by massimilianocannarozzo on 14/05/16.
 */
/* eslint no-unused-vars: "off" */
/* eslint-env node */
const raiapi = new (require('./raiapi'))()
    , router = require('express').Router()
    , redisClient = process.env.REDISCLOUD_URL ? require('redis').createClient(process.env.REDISCLOUD_URL, {
        prefix: process.env.NODE_ENV ? process.env.NODE_ENV + ':' : '',
    }) : null
    , moment = require('moment-timezone')
    , request = require('request')
    , createError = require('http-errors');

router.use((req, res, next) => {
    const tz = 'Europe/rome';
    var m;

    if (req.query.data === undefined) {
        m = moment().startOf('day').subtract(1, 'day').tz(tz);
    } else {
        m = moment(req.query.data, 'YYYY-MM-DD').tz(tz);
        if (!m.isValid()) {
            next(createError.BadRequest('Data non valida'));
            return;
        }
    }

    const diff = moment.tz(tz).diff(m, 'days');

    if (diff > 7 || diff < 1) {
        next(createError.BadRequest('Data non valida'));
    } else if (req.params.canale > raiapi.canali.length) {
        next(createError.BadRequest('Canale non valido'));
    }
    req.query.data = m.toDate();
    req.fromItaly = (req.headers.cf_ipcountry || 'IT') === 'IT';
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
router.all('/canali/:canale/programmi/:programma/qualita/:qualita/:action', (req, res, next) => {
    if (['file', 'url'].indexOf(req.params.action) < 0) {
        next(createError.BadRequest('Azione non valida'));
    } else {
        raiapi.getFileUrl(req.params.canale, req.query.data, req.params.programma, req.params.qualita, (error, data) => {
            if (error) {
                next(error);
            } else if (req.params.action == 'file') {
                if(data.geofenced && !req.fromItaly) {
                    request({
                        method: req.method,
                        followRedirect: false,
                        headers: req.headers,
                        proxy: process.env.HTTP_PROXY_RAI,
                        url: data.url,
                    })
                        .on('error', next)
                        .pipe(res);
                } else {
                    res.redirect(data.url);
                }
            } else if (req.params.action == 'url') {
                res.json({
                    url: `${req.protocol}://${req.hostname}:${req.app.get('port')}${req.url.replace('/url', '/file')}`,
                });
            }
        });
    }
});

//RSS
router.get('/canali/:canale/rss.xml', (req, res, next) => {
    raiapi.getAll(req.params.canale, req.query.data, (error, programmi) => {
        error ? next(error) : res.set({
            'Content-Type': 'text/xml',
            'Cache-Control': 'public, max-age=86400',
            'Last-Modified': moment.utc().startOf('day').format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
            'Expires': moment.utc().endOf('day').format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
        }).render('rss.ejs', {
            programmi: programmi,
            hostname: req.hostname,
            url: req.url,
            canale: raiapi.canali[req.params.canale],
        });
    });
});

if (redisClient) {
    redisClient.on('error', console.error);
    redisClient.on('connect', () => console.log('Connected to redis'));
}

raiapi.setRedisClient(redisClient);

module.exports = router;
