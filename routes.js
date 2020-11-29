/**
 * Created by massimilianocannarozzo on 14/05/16.
 */
/* eslint no-unused-vars: "off" */
/* eslint-env node */
const RaiApi = require('./raiapi');
const api = new RaiApi();
const router = require('express').Router();
const dateValidator = require('./validator-date');
const cacheHeaders = require('./middleware-headers-cache');
const createError = require('http-errors');

let canali = {};

RaiApi.listCanali((err, data) => canali = err ? {} : data);

router.use(dateValidator);
router.use(cacheHeaders);

//Canali
router.get('/canali', (req, res, next) => RaiApi.listCanali()
    .then(canali => res.send(canali))
    .catch(error => next(error))
);

//Programmi
router.get('/canali/:canale/programmi', (req, res, next) =>
    api.listProgrammi(req.params.canale, req.query.data)
        .then(programmi => res.send(programmi))
        .catch(error => next(error))
);

//Qualita
router.get('/canali/:canale/programmi/:programma/qualita', (req, res, next) =>
    api.listQualita(req.params.canale, req.query.data, req.params.programma)
        .then(qualita => res.send(qualita))
        .catch(error => next(error))
);

//Risorsa
router.all('/canali/:canale/programmi/:programma/qualita/:qualita/:action', (req, res, next) => {
    if (['file', 'url'].indexOf(req.params.action) < 0) {
        next(createError.BadRequest('Azione non valida'));
    } else {
        const { params: { canale, programma, qualita, action }, query: { data: date }, fromItaly, method, headers } = req;
        api.getFileUrl(canale, date, programma, qualita, (error, data) => {
            if (error) {
                return next(error);
            }

    api.getFileUrl(canale, date, programma, qualita)
        .then(url => {
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
                const responseUrl = (geofenced && !fromItaly && proxyUrl)
                    ? `${req.protocol}://${req.headers.host}${req.originalUrl.replace('/url', '/file')}`
                    : url;
                res.json({
                    url: responseUrl,
                });
            }
        })
        .catch(error => next(error))
});

module.exports = router;
