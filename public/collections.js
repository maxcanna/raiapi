/**
 * Created by massimilianocannarozzo on 21/05/16.
 */
/* globals Backbone, _, moment */
/* eslint-env browser */
/* exported CanaliCollection, ProgrammiCollection, QualitaCollection */
var RaiCollection = Backbone.Collection.extend({
    setOptions: function (options) {
        _.each(options, function (value, key) {
            this[key] = value;
        }, this);
        this.updateUrl();
    },
    formatDate: function () {
        return moment(this.data).tz('Europe/Rome').format('YYYY-MM-DD');
    },
});
var CanaliCollection = RaiCollection.extend({
    parse: function (response) {
        return response.map((function (item) {
            item.data = this.data;
            return item;
        }).bind(this));
    },
    updateUrl: function () {
        this.url = '/canali';
    },
});
var ProgrammiCollection = RaiCollection.extend({
    parse: function (response) {
        return response.map((function (item) {
            item.data = this.data;
            item.canale = this.canale;
            return item;
        }).bind(this));
    },
    updateUrl: function () {
        this.url = '/canali/' + this.canale + '/programmi?data=' + this.formatDate();
    },
});
var QualitaCollection = RaiCollection.extend({
    parse: function (response) {
        return response.map((function (item) {
            item.data = this.data;
            item.canale = this.canale;
            item.programma = this.programma;
            return item;
        }).bind(this));
    },
    updateUrl: function () {
        this.url = '/canali/' + this.canale + '/programmi/' + this.programma + '/qualita?data=' + this.formatDate();
    },
});
