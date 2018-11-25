/**
 * Created by massimilianocannarozzo on 14/05/16.
 */
/* eslint no-unused-vars: "off" */
/* eslint-env node */
const raiapi = new (require('./raiapi'))()
    , router = require('express').Router()
    , { env: { HTTP_PROXY_RAI: proxyUrl } } = process
    , moment = require('moment-timezone')
    , request = require('request')
    , createError = require('http-errors');

let canali = {};

raiapi.listCanali((err, data) => canali = err ? {} : data);

router.use((req, res, next) => {
    const tz = 'Europe/rome';
    let m;

    if (req.query.data === undefined) {
        m = moment().startOf('day').subtract(1, 'day').tz(tz);
    } else {
        m = moment(req.query.data, 'YYYY-MM-DD').tz(tz);
        if (!m.isValid()) {
            return next(createError.BadRequest('Data non valida'));
        }
    }

    const diff = moment.tz(tz).diff(m, 'days');

    if (diff > 7 || diff < 1) {
        return next(createError.BadRequest('Data non valida'));
    }

    req.query.data = m.toDate();
    req.fromItaly = (req.headers.cf_ipcountry || 'IT') === 'IT';
    next();
});

//Canali
router.get('/canali', (req, res, next) => raiapi.listCanali((error, canali) => error ? next(error) : res.send(canali)));

//Programmi
router.get('/canali/:canale/programmi', (req, res, next) =>
    raiapi.listProgrammi(req.params.canale, req.query.data, (error, programmi) =>
        error ? next(error) : res.send(programmi)
    )
);

//Qualita
router.get('/canali/:canale/programmi/:programma/qualita', (req, res, next) =>
    raiapi.listQualita(req.params.canale, req.query.data, req.params.programma, (error, qualita) =>
        error ? next(error) : res.send(qualita)
    )
);

//Risorsa
router.all('/canali/:canale/programmi/:programma/qualita/:qualita/:action', (req, res, next) => {
    if (['file', 'url'].indexOf(req.params.action) < 0) {
        next(createError.BadRequest('Azione non valida'));
    } else {
        const { params: { canale, programma, qualita, action }, query: { data: date }, fromItaly, method, headers } = req;
        raiapi.getFileUrl(canale, date, programma, qualita, (error, data) => {
            if (error) {
                return next(error);
            }

            const { url, geofenced } = data;
            if (action === 'file') {
                if(geofenced && !fromItaly && proxyUrl) {
                    request({
                        method,
                        followRedirect: false,
                        headers,
                        proxy: proxyUrl,
                        url,
                    })
                        .on('error', next)
                        .pipe(res);
                } else {
                    res.redirect(url);
                }
            } else if (req.params.action === 'url') {
                res.json({
                    url: `${req.protocol}://${req.headers.host}${req.originalUrl.replace('/url', '/file')}`,
                });
            }
        });
    }
});

//RSS
router.get('/canali/:canale/rss.xml', (req, res, next) => {
    const { params: { canale }, hostname, url, query: { data } } = req;
    raiapi.getAll(canale, data, (error, programmi) => {
        error ? next(error) : res.set({
            'Content-Type': 'text/xml',
            'Cache-Control': 'public, max-age=86400',
            'Last-Modified': moment.utc().startOf('day').format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
            'Expires': moment.utc().endOf('day').format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
        }).render('rss.ejs', {
            programmi,
            hostname,
            url,
            canale: canali[canale].name,
        });
    });
});

module.exports = router;
