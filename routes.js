/**
 * Created by massimilianocannarozzo on 14/05/16.
 */
/* eslint no-unused-vars: "off" */
/* eslint-env node */
const RaiApi = require('./raiapi');
const api = new RaiApi();
const router = require('express').Router();
const createError = require('http-errors');

let canali = {};

RaiApi.listCanali((err, data) => canali = err ? {} : data);

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
        return next(createError.BadRequest('Azione non valida'));
    }

    const { params: { canale, programma, action }, query: { data: date } } = req;

    api.getFileUrl(canale, date, programma)
        .then(url => {
            if (action === 'file') {
                res.redirect(url);
            } else if (req.params.action === 'url') {
                res.json({
                    url,
                });
            }
        })
        .catch(error => next(error))
});

module.exports = router;
