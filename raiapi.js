const channelMap = {
        "RaiUno": 1,
        "RaiDue": 2,
        "RaiTre": 3,
        "RaiCinque": 31,
        "RaiPremium": 32,
        "RaiYoyo": 38
    }
    , ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1905.2 Safari/537.36'
    , url = 'http://rai.it/dl/portale/html/palinsesti/replaytv/static/';

var request = require('request').defaults({
        headers: {
            'User-Agent': ua
        },
        json: true
    })
    , canali = Object.keys(channelMap);

var getSizesOfProgramma = function (programma) {
    return Object.keys(programma).filter(function (entry) {
        return entry.indexOf("h264_") == 0;
    });
};

var getFile = function (req, res, programmi) {
    const action = req.param('action');

    if (action != 'file' && action != 'url') {
        res.send(400, {error: 'Azione non valida'});
        return;
    }

    var programma = programmi[req.param('programma')];

    if (programma === undefined) {
        res.send(400, {error: 'Programma non valido'});
        return;
    }

    var h264sizes = getSizesOfProgramma(programma)
        , url = programma[h264sizes[req.param('qualita')]];

    if (url === undefined || url == '') {
        res.send(400, {error: 'Qualita non valida'});
        return;
    }

    const options = {
        url: url,
        followRedirect: false,
        headers: {}
    };

    request.get(options, function (error, response) {
        res.set('X-Mashape-Billing', 'full request=1');
        if (action == 'file') {
            res.redirect(response.headers.location);
        } else if (action == 'url') {
            res.send({url: response.headers.location});
        }
    });
};

var listQualita = function (req, res, programmi) {
    var programma = programmi[req.param('programma')]
        , h264sizes = getSizesOfProgramma(programma);

    if (programma === undefined) {
        res.send(400, {error: 'Programma non valido'});
        return;
    }

    var response = [];
        console.log(programma);
    for (var i = 0; i < h264sizes.length; i++) {
        var url = programma[h264sizes[i]];
        if (url) {
            response.push({
                id: i,
                name: h264sizes[i]
            });
        }
    }
    res.send(response);
};

var listProgrammi = function (req, res, programmi) {
    var response = [];
    for (var i = 0; i < programmi.length; i++) {
        var programma = programmi[i]
            , h264sizes = getSizesOfProgramma(programma);
        for (var j = 0; j < h264sizes.length; j++) {
            if (programma[h264sizes[j]]) {
                response.push({
                    id: i,
                    name: programma.t
                });
                break;
            }
        }
    }
    res.send(response);
};

var listCanali = function (req, res) {
    var response = [];
    for (var i = 0; i < canali.length; i++) {
        response.push({
            id: i,
            name: canali[i]
        });
    }

    res.send(response);
};

exports.handleRequest = function (req, res) {
    var onSuccess;

    if (req.param('qualita')) {
        onSuccess = getFile;
    } else if (req.param('programma')) {
        onSuccess = listQualita;
    } else if (req.param('canale')) {
        onSuccess = listProgrammi;
    } else {
        listCanali(req, res);
        return;
    }

    var offset = 1;
    if (req.query.offset) {
        offset = Number(req.query.offset);
        if (offset > 7 || offset < 1) {
            res.send(400, {error: 'Offset non valido'});
        }
    }

    var yesterday = new Date();
    yesterday.setDate(new Date().getDate() - offset);

    var dd = yesterday.getDate()
        , mm = yesterday.getMonth() + 1 //January is 0!
        , yyyy = yesterday.getFullYear();

    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    var data = yyyy + '-' + mm + '-' + dd;

    var canale = canali[req.param('canale')]
        , fileName = canale + '_' + (data.replace(/-/g, '_')) + '.html';

    if (canale === undefined) {
        res.send(400, {error: 'Canale non valido'});
        return;
    }

    request.get(url + fileName, function (error, response, body) {
        if (error || response.statusCode != 200) {
            res.send(500, {error: 'Errore generico: ' + error});
            console.log('error ' + error);
        } else {
            var programmi = body[channelMap[canale]][data]
                , programmiArr = [];

            Object.keys(programmi).forEach(function (orario) {
                programmiArr.push(programmi[orario]);
            });

            onSuccess(req, res, programmiArr);
        }
    });
};
