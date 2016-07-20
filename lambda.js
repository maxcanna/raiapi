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

    var offset = Number(event.offset) || 1
        , canale = raiapi.canali[event.canale]
        , err;

    if (_.isNaN(offset) || offset > 7 || offset < 1) {
        eIR.message = 'Offset non valido';
        err = eIR;
    } else if (canale === undefined) {
        eIR.message = 'Canale non valido';
        err = eIR;
    } else {
        event.canale = canale;
        event.offset = offset;
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
            raiapi.getFileUrl(event.canale, event.offset, event.programma, event.qualita, fileUrl => {
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
            raiapi.listQualita(event.canale, event.offset, event.programma, qualita => qualita ? callback(null, qualita) : callback(eGE));
        }
    } else if (event.canale) {
        //Programmi
        if (err !== undefined) {
            callback(err);
        } else {
            raiapi.listProgrammi(event.canale, event.offset, programmi => programmi ? callback(null, programmi) : callback(eGE));
        }
    } else {
        //Canali
        callback(null, raiapi.listCanali());
    }
};
