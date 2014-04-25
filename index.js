var express = require('express');
var app = express();
var raiapi = require('./raiapi.js');

var port = Number(process.env.PORT || 8080);

app.enable('trust proxy')
app.disable('x-powered-by');
app.set('title', 'Rai API');

app.use(function(req,res,next){
	console.log('IP:'+req.ip);
	console.log('X-Mashape-User:'+req.get('X-Mashape-User'));
	console.log('X-Mashape-Subscription:'+req.get('X-Mashape-Subscription'));
	console.log(req.headers);

	if(req.get('X-Mashape-Proxy-Secret') != 'x9nH57BIII9F5bbdYoW3TAcaZYF1Mu'){
		//res.send(401,{error: 'Unauthorized'});
	}// else 
	next();
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
	  res.send(500, { error: 'Aw, Snap!'});
	} else next();
});

app.use(function(req,res,next){
	res.send(404);
});

app.listen(port);
