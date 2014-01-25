var request = require('request');
var fs = require('fs');
var express = require('express');
var app = express();

var yesterday = new Date();
yesterday.setDate(new Date().getDate() - 1);

var dd = yesterday.getDate();
var mm = yesterday.getMonth()+1; //January is 0!
var yyyy = yesterday.getFullYear();
if(dd < 10) dd = '0' + dd;
if(mm < 10) mm = '0' + mm;
var data = yyyy+'-'+mm+'-'+dd;

var channelMap = {
	"RaiUno": 1,
	"RaiDue": 2,
	"RaiTre": 3,
	"RaiCinque": 31,
	"RaiPremium": 32,
	"RaiYoyo": 38
}

var h264sizes = [1800, 1500, 1200, 800, 600, 400];

var userAgent = 'Googlebot/2.1 (+http://www.googlebot.com/bot.html)';

var parse = function(body, req, res){
	var json = JSON.parse(body);
	var canale = req.params.canale;
	var programmi = json[channelMap[canale]][data];
	var orari = Object.keys(programmi);
	
	var response = '';
	
	if(req.params.id && req.params.quality && req.params.action){
		var programma = programmi[orari[req.params.id]];
		url = programma["h264_"+req.params.quality];
		if(req.params.action == 'download'){
			var options = {
				url: url,
				headers: {
					'User-Agent': userAgent
				}
			};
			request.get(options).pipe(res);
			return;
		}
		else if(req.params.action == 'play') res.redirect(url);
		else res.status(500).send('Unsupported action!');
	} else if(req.params.id && req.params.quality){
		var programma = programmi[orari[req.params.id]];
		response += '<a href="play/">play</a><br />';
		response += '<a href="download/">download</a><br />';
	} else if(req.params.id){
		var programma = programmi[orari[req.params.id]];
		for(var i = 0; i < h264sizes.length; i++){
			url = programma["h264_"+h264sizes[i]];
			if(url){
				response += '<a href="'+h264sizes[i]+'/">'+h264sizes[i]+'</a><br />';
			}
		}
	} else {
		response = '';
		for(var i = 0; i < orari.length; i++){
			var programma = programmi[orari[i]];
			var url = null;
			for(var j = 0; j < h264sizes.length; j++){
				url = programma["h264_"+h264sizes[j]];
				if(url){
					response += '<a href="'+i+'/">'+programma.t+'</a><br />';
					break;
				}
			}
		}
	}
	
	res.send(response);
}

var listProgrammiCanale = function(req, res){
	var canale = req.params.canale;
	var fileName = canale+'_'+(data.replace(/-/g,'_'))+'.html';
	
	if(fs.existsSync(fileName)){
		fs.readFile(fileName, 'utf8',  function(error, body){
			if(error)  {
				console.log(error);
				res.status(500).send('OMG!');
				return;
			}
			parse(body, req, res);
		});
	} else {
		var options = {
			url: 'http://rai.it/dl/portale/html/palinsesti/replaytv/static/'+fileName,
			headers: {
				'User-Agent': userAgent
			}
		};
		
		request.get(options, function(error, response, body){
			if(error)  {
				console.log(error);
				res.status(500).send('OMG!');
				return;
			}
			if(response.statusCode == 404){
				console.log('Invalid channel '+canale);
				res.status(404).send('Invalid channel '+canale);
				return;
			} 
			fs.writeFile(fileName, body);
			parse(body, req, res);
		});
	}
}

var listCanali = function(req, res){
	var canali = Object.keys(channelMap);
	var response = '';
	for(var i = 0; i < canali.length; i++){
		var canale = canali[i];
		response += '<a href="' + canale + '/programmi/">'+canale+'</a><br />';
	}
	
	res.send(response);
}

app.get('/',function(req,res){
	res.redirect('canali/');
});

//Canali
app.get('/canali/', listCanali);

//Canale
app.get('/canali/:canale',function(req,res){
	res.redirect('canali/:canale/programmi/');
});

//Programmi
app.get('/canali/:canale/programmi/', listProgrammiCanale);
app.get('/canali/:canale/programmi',function(req,res){
	res.redirect('canali/:canale/programmi/');
});

//Programma
app.get('/canali/:canale/programmi/:id/', listProgrammiCanale);
app.get('/canali/:canale/programmi/:id',function(req,res){
	res.redirect('canali/:canale/programmi/:id/');
});

//Qualita
app.get('/canali/:canale/programmi/:id/:quality/', listProgrammiCanale);
app.get('/canali/:canale/programmi/:id/:quality',function(req,res){
	res.redirect('/canali/:canale/programmi/:id/:quality/');
});

//Action
app.get('/canali/:canale/programmi/:id/:quality/:action', listProgrammiCanale);
app.get('/canali/:canale/programmi/:id/:quality/:action',function(req,res){
	res.redirect('/canali/:canale/programmi/:id/:quality/:action/');
});

app.use(function (req, res, next) {
	res.clearHeader("X-Powered-By");
	next();
})

app.listen(8080);
