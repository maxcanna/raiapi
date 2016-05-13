var express = require('express')
    , app = express()
    , redis = require('redis')
    , environment = app.get('env') || 'production'
    , development = environment === 'development'
    , urlRedis = require('url').parse(process.env['REDISCLOUD_URL'])
    , redisClient = redis.createClient(urlRedis.port, urlRedis.hostname)
    , moment = require('moment-timezone');

app.disable('x-powered-by');
app.use(require('compression')());
app.use(require('morgan')('combined'));

app.use(function (req, res, next) {
    const eod = moment().tz('GMT').endOf('day');
    res.set({
        'Cache-Control': 'private, max-age=' + eod.diff(moment().tz('GMT'), 'seconds'),
        'Last-Modified': moment().tz('GMT').startOf('day').format('ddd, DD MMM YYYY HH:mm:ss z'),
        'Expires': eod.format('ddd, DD MMM YYYY HH:mm:ss z')
    });
    next();
});

var api = require('./raiapi.js');

redisClient.on('error', console.error);
redisClient.on('connect', function () {
    console.log('Connected to redis')
});
redisClient.auth(urlRedis.auth.split(":")[1]);
api.setRedisClient(redisClient);

app.use(api);
app.use(function (req, res, next) {
    res.format({
        json: function () {
            const err = new Error('Bad request');
            err.status = 400;
            next(err);
        },
        html: function () {
            res.redirect('http://massi.ws');
        }
    });
});

// error handlers
app.use(function (err, req, res, next) {
    var status = err.status || 500;
    res.status(status)
        .format({
            json: function () {
                res.json({
                    stack: development ? err.stack : undefined,
                    error: err.message
                });
            },
            html: function () {
                res.send('Error: ' + err.message);
            }
        });
});

app.listen((process.env['PORT'] || 3000), function () {
    console.log('Server started');
});
