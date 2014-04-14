var request = require('request');

var channelMap = {
	"RaiUno": 1,
	"RaiDue": 2,
	"RaiTre": 3,
	"RaiCinque": 31,
	"RaiPremium": 32,
	"RaiYoyo": 38
}
var canali = Object.keys(channelMap);

var getSizesOfProgramma = function(programma) {
	return Object.keys(programma).filter(function(entry) {
		return entry.indexOf("h264_") == 0;
	});
}

var getFile = function(req, res, programmi){
	var programma = programmi[req.params.programma];

	if(programma === undefined){
		res.status(400).send({ error: 'Programma non valido'});
		return;
	}
	
	var h264sizes = getSizesOfProgramma(programma);
		
	var url = programma[h264sizes[req.params.qualita]];

	if(url === undefined || url == ''){
		res.status(400).send({ error: 'Qualita non valida'});
		return 
	}

	var options = {
		url: url,
		followRedirect: false
	}
	
	request.get(options, function(error, response, body){	
		if(req.params.action == 'file'){
			//request.get(options).pipe(res);
			res.redirect(response.headers.location);
		} else if(req.params.action == 'url'){
			res.send({url:response.headers.location});
		} else {
			res.status(400).send({ error: 'Azione non valida'});
		}
	});
}

var listQualita = function(req, res, programmi){
	var programma = programmi[req.params.programma];
	var h264sizes = getSizesOfProgramma(programma);
	
	if(programma === undefined){
		res.status(400).send({ error: 'Programma non valido'});
		return;
	}
	
	response = [];
	for(var i = 0; i < h264sizes.length; i++){
		var url = programma[h264sizes[i]];
		if(url){
			response.push({
				id : i,
				name : h264sizes[i]
			});
		}
	}
	res.send(response);
}		
		
var listProgrammi = function(req, res, programmi){
	var response = [];
	for(var i = 0; i < programmi.length; i++){
		var programma = programmi[i];
		var h264sizes = getSizesOfProgramma(programma);
		for(var j = 0; j < h264sizes.length; j++){
			if(programma[h264sizes[j]]){
				response.push({
					id : i,
					name : programma.t
				});
				break;
			}
		}
	}
	res.send(response);
}

var listCanali = function(req, res){
	var response = [];
	for(var i = 0; i < canali.length; i++){
		response.push({
			id : i,
			name : canali[i]
		});
	}
	
	res.send(response);
}

exports.handleRequest = function(req, res){
	var onSuccess = getFile;
	
	if(req.params.qualita){
		onSuccess = getFile;
	} else if(req.params.programma){
		onSuccess = listQualita;
	} else if(req.params.canale){
		onSuccess = listProgrammi;
	} else {
		listCanali(req,res);
		return;
	}
	
	var offset = 1;
	if(req.query.offset){
		offset = Number(req.query.offset);
		if(offset > 7 || offset < 1){
			res.status(400).send({ error: 'Offset non valido'});
		}
	}
	
	var yesterday = new Date();
	yesterday.setDate(new Date().getDate() - offset);
	
	var dd = yesterday.getDate();
	var mm = yesterday.getMonth()+1; //January is 0!
	var yyyy = yesterday.getFullYear();
	if(dd < 10) dd = '0' + dd;
	if(mm < 10) mm = '0' + mm;
	var data = yyyy+'-'+mm+'-'+dd;
	
	canale = canali[req.params.canale];
	var fileName = canale+'_'+(data.replace(/-/g,'_'))+'.html';
		
	var options = {
		headers: {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1905.2 Safari/537.36'},
		url : 'http://rai.it/dl/portale/html/palinsesti/replaytv/static/'+fileName
	};
	
	if(canale === undefined){
		res.status(400).send({ error: 'Canale non valido'});
		return;
	}
	
	request.get(options, function(error, response, body){
		if(error || response.statusCode != 200) {
			res.status(500).send({ error: 'Errore generico '+error});
			console.log('error '+error);
		} else {
			var json = JSON.parse(body);
			var programmi = json[channelMap[canale]][data];
			var programmiArr = [];
			
			Object.keys(programmi).forEach(function(orario){
				programmiArr.push(programmi[orario]);
			});
			
			onSuccess(req, res, programmiArr);
		}
	});
}
