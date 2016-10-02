/**
 * Created by massimilianocannarozzo on 21/05/16.
 */
/* globals Backbone, _ */
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
        return this.get('data').toISOString();
    },
});
