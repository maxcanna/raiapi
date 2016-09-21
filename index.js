/* eslint no-unused-vars: "off" */
/* eslint-env node */
var express = require('express')
    , app = express()
    , environment = app.get('env') || 'production'
    , development = environment === 'development'
    , api = require('./routes.js');

app.disable('x-powered-by');
app.use(require('compression')());
app.use(require('morgan')('combined'));
app.use(express.static('public'));

app.use(api);

// error handlers
app.use(function (err, req, res, next) {
    var status = err.status || 500;
    res.status(status).json({
        stack: development ? err.stack : undefined,
        error: err.message,
    });
});

app.listen((process.env.PORT || 3000), function () {
    console.log('Server started');
});
