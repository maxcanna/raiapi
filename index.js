var express = require('express');
var app = express();
var raiapi = require('./raiapi.js');
var request = require('request');

var port = Number(process.env.PORT || 8080);

app.enable('trust proxy');
app.disable('x-powered-by');
app.set('title', 'Rai API');

app.use(function (req, res, next) {
    console.log('IP:' + req.ip);
    console.log('X-Mashape-User:' + req.get('X-Mashape-User'));
    console.log('X-Mashape-Subscription:' + req.get('X-Mashape-Subscription'));
    console.log(req.headers);

	//if(req.get('X-Mashape-Proxy-Secret') != 'x9nH57BIII9F5bbdYoW3TAcaZYF1Mu'){
		//res.send(403, {error: 'Forbidden'});
	//} else {
		var options = {
			headers: {'X-Mashape-Authorization': 'aidrLMAQg2x7xqMVUttS6HmWFfBOueRc'},
		};
	
		request.get(options, function(error, response, body){
			if(error || response.statusCode != 200) {
				res.send(500, {error: 'Hey! Where are you from?!'});
			} else {
					 next();
				} else {
					res.send(403, {error: 'Forbidden country'});
				}
			}
		});
	//}
            url: 'https://community-telize-json-ip-and-geoip.p.mashape.com/geoip/' + '217.171.45.204'//req.ip
                console.log('country_code:' + body.country_code);
                if (body.country_code.toUpperCase().indexOf('IT') > -1) {
});

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
