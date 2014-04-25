var express = require('express');
var app = express();
var raiapi = require('./raiapi.js');
var request = require('request');

var port = Number(process.env.PORT || 8080);

app.enable('trust proxy')
app.disable('x-powered-by');
app.set('title', 'Rai API');

app.use(function(req,res,next){
	console.log('IP:'+req.ip);
	console.log('X-Mashape-User:'+req.get('X-Mashape-User'));
	console.log('X-Mashape-Subscription:'+req.get('X-Mashape-Subscription'));
	console.log(req.headers);

	//if(req.get('X-Mashape-Proxy-Secret') != 'x9nH57BIII9F5bbdYoW3TAcaZYF1Mu'){
		//res.send(403, {error: 'Forbidden'});
	//} else {
		var options = {
			headers: {'X-Mashape-Authorization': 'aidrLMAQg2x7xqMVUttS6HmWFfBOueRc'},
			url : 'https://geoip.p.mashape.com/country?ip='+req.ip+'&format=json&lite=true'
		};
	
		request.get(options, function(error, response, body){
			if(error || response.statusCode != 200) {
				res.send(500, {error: 'Hey! Where are you from?!'});
			} else {
				console.log('COUNTRY:'+body);
				if(body.toUpperCase().indexOf('ITALY') > -1){
					 next();
				} else {
					res.send(403, {error: 'Forbidden country'});
				}
			}
		});
	//}
});

//Canali
app.get('/canali', raiapi.handleRequest);

//Programmi
app.get('/canali/:canale/programmi', raiapi.handleRequest);

//Qualita
app.get('/canali/:canale/programmi/:programma/qualita', raiapi.handleRequest);

//Risorsa
app.get('/canali/:canale/programmi/:programma/qualita/:qualita/:action', raiapi.handleRequest);

app.use(function(err,req,res,next){
	if(err){
	  console.error(err.stack);
	  res.send(500, {error: 'Aw, Snap!'});
	} else next();
});

app.use(function(req,res,next){
	res.send(404);
});

app.listen(port);
