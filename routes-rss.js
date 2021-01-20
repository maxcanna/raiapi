/**
 * Created by massimilianocannarozzo on 25/11/18.
 */
/* eslint-env node */
const RaiApi = require('./raiapi');
const api = new RaiApi();
const router = require('express').Router();
const moment = require('moment-timezone').tz.setDefault('Europe/Rome');

let canali = {};

RaiApi.listCanali().then(data => canali = data);

//RSS
router.get(/^\/canali\/(\d+)\.xml/, (req, res, next) => {
    const { params: { 0: canale }, hostname, url, query: { data } } = req;
    const m = moment(data);

    api.getAll(canale, data)
        .then(programmi => res.set({
            'Content-Type': 'text/xml',
        }).render('rss.ejs', {
            programmi,
            hostname,
            url,
            canale: canali[canale].name,
            dateTag: m.format('YYYY.MM.DD'),
            today: m.toDate(),
        }))
        .catch(error => next(error))
});

module.exports = router;
