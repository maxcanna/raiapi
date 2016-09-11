/**
 * Created by massimilianocannarozzo on 14/05/16.
 */
/* jshint unused: false, node: true, esversion: 6 */
"use strict";
exports.handler = function (event, context, callback) {
    const raiapi = new (require('./raiapi'))()
        , _ = require('lodash')
        , eIR = new Error()
        , eNF = new Error('Dati non disponibili')
        , eGE = new Error('Errore generico');
    eGE.status = 500;
    eNF.status = 404;
    eIR.status = 400;

    var canale = raiapi.canali[event.canale]
        , err
        , data = new Date();

    data.setDate(data.getDate() - 1);

    if (event.data !== undefined) {
        data = new Date(event.data);
        if (isNaN(data.getDate())) {
            eIR.message = 'Data non valida';
            return eIR;
        }
    }

    var diff = Math.floor((new Date() - data) / (1000 * 60 * 60 * 24));

    if (diff > 7 || diff < 1) {
        eIR.message = 'Data non valida';
        return eIR;
    } else if (canale === undefined) {
        eIR.message = 'Canale non valido';
        err = eIR;
    }

    if (event.action) {
        //Risorsa
        if (err !== undefined) {
            callback(err);
        } else if (!event.programma) {
            eIR.message = 'Programma non valido';
            callback(eIR);
        } else if (event.action != 'file' && event.action != 'url') {
            eIR.message = 'Azione non valida';
            callback(eIR);
        } else {
            raiapi.getFileUrl(event.canale, event.data, event.programma, event.qualita, fileUrl => {
                if (!fileUrl) {
                    eNF.message = 'Qualita non valida';
                    callback(eNF);
                } else if (event.action == 'file') {
                    context.succeed({location: fileUrl});
                } else if (event.action == 'url') {
                    callback(null, {url: fileUrl});
                }
            });
        }
    } else if (event.programma) {
        //Qualita
        if (err !== undefined) {
            callback(err);
        } else {
            raiapi.listQualita(event.canale, event.data, event.programma, qualita => qualita ? callback(null, qualita) : callback(eGE));
        }
    } else if (event.canale) {
        //Programmi
        if (err !== undefined) {
            callback(err);
        } else {
            raiapi.listProgrammi(event.canale, event.data, programmi => programmi ? callback(null, programmi) : callback(eGE));
        }
    } else {
        //Canali
        callback(null, raiapi.listCanali());
    }
};
