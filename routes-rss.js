/**
 * Created by massimilianocannarozzo on 25/11/18.
 */
/* eslint-env node */
const raiapi = new (require('./raiapi'))()
    , router = require('express').Router()
    , dateValidator = require('./validator-date')
    , moment = require('moment-timezone');

let canali = {};

raiapi.listCanali((err, data) => canali = err ? {} : data);

router.use(dateValidator);

//RSS
router.get(/^\/canali\/(\d+)\.xml/, (req, res, next) => {
    const { params: { 0: canale }, hostname, url, query: { data } } = req;
    const utc = moment.utc();
    raiapi.getAll(canale, data, (error, programmi) =>
        error ? next(error) : res.set({
            'Content-Type': 'text/xml',
            'Cache-Control': 'public, max-age=86400',
            'Last-Modified': utc.startOf('day').format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
            'Expires': utc.endOf('day').format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
        }).render('rss.ejs', {
            programmi,
            hostname,
            url,
            canale: canali[canale].name,
        })
    );
});

module.exports = router;
