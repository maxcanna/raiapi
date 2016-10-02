/**
 * Created by massimilianocannarozzo on 21/05/16.
 */
/* globals Backbone, _, moment */
/* eslint-env browser */
/* exported UrlModel */
var UrlModel = Backbone.Model.extend({
    setOptions: function (options) {
        _.each(options, function (value, key) {
            this.set(key, value);
        }, this);
        this.url = '/canali/' + this.get('canale') + '/programmi/' + this.get('programma') + '/qualita/' + this.get('qualita') + '/url?data=' + this.formatDate();
    },
    formatDate: function () {
        return moment(this.get('data')).tz('Europe/Rome').format('YYYY-MM-DD');
    },
});
