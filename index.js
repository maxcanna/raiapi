var express = require('express')
    , app = express()
    , request = require('request')
    , morgan = require('morgan');

app.disable('x-powered-by');
app.set('title', 'Rai API');

app.use(morgan('common'));

if (process.env['ENV'] != 'development') {
    app.enable('trust proxy');
    app.use(function (req, res, next) {
        console.log(req.headers);

        const proxy_secret = req.get('X-Mashape-Proxy-Secret');
        if (proxy_secret == 'e3b3f56615d1e5f2608d2f1130a7ef54') {//md5('override')
            next(); //Skip GeoIP
        } else if (proxy_secret != 'x9nH57BIII9F5bbdYoW3TAcaZYF1Mu') {
            const eF = new Error('Forbidden');
            eF.status = 403;
            next(eF);
        } else {
            var options = {
                headers: {
                    'X-Mashape-Authorization': 'aidrLMAQg2x7xqMVUttS6HmWFfBOueRc'
                },
                json: true,
                url: 'https://community-telize-json-ip-and-geoip.p.mashape.com/geoip/' + req.ip
            };

            request.get(options, function (error, response, body) {
                if (error || response.statusCode != 200) {
                    const eG = new Error('Hey! Where are you from?!');
                    eG.status = 500;
                    next(eG);
                } else {
                    console.log('country_code:' + body.country_code);
                    if (body['country_code'].toUpperCase().indexOf('IT') > -1) {
                        next();
                    } else {
                        const eF = new Error('Forbidden country');
                        eF.status = 403;
                        next(eF);
                    }
                }
            });
        }
    });
}

//Canali
app.get('/canali', raiapi.handleRequest);

//Programmi
app.get('/canali/:canale/programmi', raiapi.handleRequest);

//Qualita
app.get('/canali/:canale/programmi/:programma/qualita', raiapi.handleRequest);

//Risorsa
app.get('/canali/:canale/programmi/:programma/qualita/:qualita/:action', raiapi.handleRequest);

app.use(function (err, req, res, next) {
    if (err) {
        console.error(err.stack);
        res.send(500, {error: 'Aw, Snap!'});
    } else next();
});

app.use(function (req, res) {
    res.send(404);
});

app.listen(port);
