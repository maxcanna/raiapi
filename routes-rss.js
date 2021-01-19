/**
 * Created by massimilianocannarozzo on 25/11/18.
 */
/* eslint-env node */
const RaiApi = require('./raiapi');
const api = new RaiApi();
const router = require('express').Router();
const dateValidator = require('./validator-date');
const cacheHeaders = require('./middleware-headers-cache');
const moment = require('moment-timezone').tz.setDefault('Europe/Rome');

let canali = {};

RaiApi.listCanali().then(data => canali = data);

router.use(dateValidator);
router.use(cacheHeaders);

//RSS
router.get(/^\/canali\/(\d+)\.xml/, (req, res, next) => {
    const { params: { 0: canale }, hostname, url, query: { data } } = req;
    const m = moment(data);

    api.getAll(canale, data)
        .then(programmi => res.set({
            'Content-Type': 'text/xml',
            'Cache-Control': 'public, max-age=86400',
            'Last-Modified': m.startOf('day').format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
            Expires: m.endOf('day').format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
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
