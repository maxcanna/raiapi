/* jshint unused: false */
var express = require('express')
    , app = express()
    , environment = app.get('env') || 'production'
    , development = environment === 'development'
    , moment = require('moment-timezone')
    , api = require('./routes.js');

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

app.use(api);

// error handlers
app.use(function (err, req, res, next) {
    var status = err.status || 500;
    res.status(status).json({
        stack: development ? err.stack : undefined,
        error: err.message
    });
});

app.listen((process.env['PORT'] || 3000), function () {
    console.log('Server started');
});
