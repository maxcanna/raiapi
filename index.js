/* eslint no-unused-vars: "off" */
/* eslint-env node */
const express = require('express');
const app = express();
const environment = app.get('env') || 'production';
const development = environment === 'development';
const port = process.env.PORT || 3000;
const api = require('./routes');
const rss = require('./routes-rss');
const dateValidator = require('./validator-date');
const cacheHeaders = require('./middleware-headers-cache');

app.disable('x-powered-by');
app.set('port', port);
app.use(require('compression')());
app.use(require('morgan')('combined'));
app.use(cacheHeaders);
app.use(express.static('public'));
app.use(dateValidator);
app.use('/api', api);
app.use('/rss', rss);
app.use('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /'));

app.get('*', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// error handlers
app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({
        stack: development ? err.stack : undefined,
        error: err.message,
    });
});

app.listen(port, () => console.log(`raiapi listening on port ${port}`));
