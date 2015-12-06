require('throng')(start, {
    workers: process.env['WEB_CONCURRENCY'] || 1,
    lifetime: Infinity
});

function start() {
var express = require('express')
    , app = express()
    , compression = require('compression')
    , morgan = require('morgan')
    , redis = require('redis')
    , urlRedis = require('url').parse(process.env['REDISCLOUD_URL'])
    , redisClient = redis.createClient(urlRedis.port, urlRedis.hostname)
    , moment = require('moment-timezone');

app.disable('x-powered-by');
app.disable('etag');
app.enable('trust proxy');
app.use(compression());
app.use(morgan('combined'));

app.use(function (req, res, next) {
    const now = moment().tz('Europe/rome')
        , eod = moment().tz('Europe/Rome').endOf('day')
        , sod = moment().tz('Europe/Rome').startOf('day');
    res.set({
        'Cache-Control': 'private, max-age=' + eod.diff(now, 'seconds') ,
        'Last-Modified': sod.tz('GMT').format('ddd, DD MMM YYYY HH:mm:ss z'),
        'Expires': eod.tz('GMT').format('ddd, DD MMM YYYY HH:mm:ss z')
    });
    next();
});

var api = require('./raiapi.js');

redisClient.on('error', console.error);
redisClient.auth(urlRedis.auth.split(":")[1]);
api.setRedisClient(redisClient);

app.use(api);
app.use(function (req, res, next) {
    res.format({
        json: function () {
            const err = new Error('Please see available doc at: http://goo.gl/XlbWnK');
            err.status = 400;
            next(err);
        },
        html: function() {
            res.redirect('http://goo.gl/XlbWnK');
        }
    });
});

// error handlers

app.use(function (err, req, res, next) {
    res.removeHeader('Cache-Control');
    res.removeHeader('Last-Modified');
    res.removeHeader('Expires');
    next(err);
});

// development error handler
// will print stacktrace
if (process.env['ENV'] == 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500)
            .format({
                json: function () {
                    res.json({
                        message: err.message,
                        error: err
                    })
                },
                html: function () {
                    res.send('Error: ' + err.message);
                }
            });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    if (err.status != 404) {
        console.error(err.stack);
    }
    res.status(err.status || 500)
        .format({
            json: function () {
                res.json({
                    error: err.message
                })
            },
            html: function () {
                res.send('Error: ' + err.message);
            }
        });
});

app.listen((process.env['PORT'] || 3000), function () {
    console.log('Server started');
});
}