/* eslint no-unused-vars: "off" */
/* eslint-env node */
const express = require('express')
    , app = express()
    , environment = app.get('env') || 'production'
    , development = environment === 'development'
    , port = process.env.PORT || 3000
    , api = require('./routes.js');

app.disable('x-powered-by');
app.set('port', port);
app.use(require('compression')());
app.use(require('morgan')('combined'));
app.use(express.static('public'));

app.use(api);

// error handlers
app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({
        stack: development ? err.stack : undefined,
        error: err.message,
    });
});

app.listen(port, () => {
    console.log('Server started');
});
