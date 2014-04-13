var express = require('express');
var app = express();
var raiapi = require('./raiapi.js');
var port = Number(process.env.PORT || 8080);

app.get('/',function(req,res){
	res.send('');
});

//Canali
app.get('/canali', raiapi.handleRequest);

//Programmi
app.get('/canali/:canale/programmi', raiapi.handleRequest);

//Qualita
app.get('/canali/:canale/programmi/:programma/qualita', raiapi.handleRequest);

//Risorsa
app.get('/canali/:canale/programmi/:programma/qualita/:qualita/:action', raiapi.handleRequest);

app.disable('x-powered-by');
app.set('title', 'Rai API');

app.listen(port);
