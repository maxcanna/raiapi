/**
 * Created by massimilianocannarozzo on 21/05/16.
 */
/* globals Backbone, $, _, Dropbox, CanaliCollection, ProgrammiCollection, QualitaCollection, UrlModel */
/* eslint-env browser */
/* exported CanaliView */
var RaiCollectionView = Backbone.View.extend({
    setOptions: function (options) {
        _.each(options, function (value, key) {
            this[key] = value;
        }, this);
        this.collection.setOptions(options);
        this.collection.fetch({reset: true});
    },
    events: {
        'click a': 'click',
    },
});
var CanaliView = RaiCollectionView.extend({
    initialize: function () {
        this.setElement($('#canali'));
        this.collection = new CanaliCollection();
        this.collection.on('reset', this.render, this);
        this.programmiView = new ProgrammiView();
    },
    render: function () {
        if (this.collection && this.collection.length) {
            $('#loadingModal').modal('hide');
            this.programmiView.close();
            this.$('li').remove();
            this.collection.forEach((function (item) {
                var view = new CanaleView({model: item});
                this.$el.append(view.render().$el);
            }).bind(this));
        }
        return this;
    },
    click: function (ev) {
        ev.preventDefault();
        this.programmiView.close();
        var canaleId = $(ev.target).attr('data-id')
            , model = this.collection.get(canaleId);
        this.programmiView.setOptions({
            data: model.get('data'),
            canale: model.get('id'),
        });
    },
});
var ProgrammiView = RaiCollectionView.extend({
    initialize: function () {
        this.setElement($('#programmi'));
        this.qualitaView = new QualitaView();
        this.collection = new ProgrammiCollection();
        this.collection.on('reset', this.render, this);
    },
    render: function () {
        if (this.collection && this.collection.length) {
            this.collection.forEach((function (item) {
                var view = new ProgrammaView({model: item});
                this.$el.append(view.render().$el);
            }).bind(this));
            this.$el.fadeIn();
        }
        return this;
    },
    click: function (ev) {
        ev.preventDefault();
        this.qualitaView.close();
        var programmaId = $(ev.target).attr('data-id')
            , model = this.collection.get(programmaId);
        this.qualitaView.setOptions({
            data: model.get('data'),
            canale: model.get('canale'),
            programma: model.get('id'),
            nomeProgramma: model.get('name'),
        });
    },
    close: function () {
        this.$('li').remove();
        this.$el.hide();
        this.qualitaView.close();
    },
});
var QualitaView = RaiCollectionView.extend({
    initialize: function () {
        this.setElement($('#qualita'));
        this.linkView = new LinkView();
        this.collection = new QualitaCollection();
        this.collection.on('reset', this.render, this);
    },
    render: function () {
        if (this.collection) {
            if (this.collection.length) {
                this.collection.forEach((function (item) {
                    var view = new QualitaItemView({model: item});
                    this.$el.append(view.render().$el);
                }).bind(this));
            } else {
                this.$el.append(_.template($('#template-na').html()));
            }
            this.$el.fadeIn();
        }

        return this;
    },
    click: function (ev) {
        ev.preventDefault();
        this.linkView.close();
        var qualitaId = $(ev.target).attr('data-id')
            , model = this.collection.get(qualitaId);
        this.linkView.setOptions({
            data: model.get('data'),
            canale: model.get('canale'),
            programma: model.get('programma'),
            qualita: model.get('id'),
            nomeProgramma: this.nomeProgramma,
        });
    },
    close: function () {
        this.$('li').remove();
        this.$el.hide();
        this.linkView.close();
    },
});

var CanaleView = Backbone.View.extend({
    initialize: function () {
        this.template = _.template($('#template-item').html());
    },
    render: function () {
        this.$el.html(this.template({model: this.model, url: this.model.url()}));
        return this;
    },
});
var ProgrammaView = Backbone.View.extend({
    initialize: function () {
        this.template = _.template($('#template-item').html());
    },
    render: function () {
        this.$el.html(this.template({
            data: this.model.get('data'),
            model: this.model,
            url: this.model.url(),
        }));
        return this;
    },
});
var QualitaItemView = Backbone.View.extend({
    initialize: function () {
        this.template = _.template($('#template-item').html());
    },
    render: function () {
        this.$el.html(this.template({
            data: this.model.get('data'),
            model: this.model,
            url: this.model.url(),
        }));
        return this;
    },
});
var LinkView = Backbone.View.extend({
    initialize: function () {
        this.setElement($('#link ul'));
        this.views = [];
        this.model = new UrlModel();
        this.model.on('error change:url', this.render, this);
        this.videoView = new FileView({model: this.model});
        this.videoView.setElement($('#video'));
        this.views.push(this.videoView);
        this.fileView = new DownloadView({model: this.model});
        this.fileView.setElement($('#file'));
        this.views.push(this.fileView);
        this.dropboxView = new DropboxView({model: this.model});
        this.dropboxView.setElement($('#dropbox'));
        this.views.push(this.dropboxView);
    },
    render: function () {
        this.close();
        if(this.model.get('url')) {
            this.views.forEach((function (view) {
                this.$el.append(view.render().el);
            }).bind(this));
        } else {
            this.$el.append(_.template($('#template-na').html()));
        }

        return this;
    },
    setOptions: function (options) {
        _.each(options, function (value, key) {
            this[key] = value;
        }, this);

        this.model.clear();
        this.model.setOptions(options);

        this.close();

        this.model.fetch();
    },
    close: function () {
        this.$('li').remove();
    },
});
var FileView = Backbone.View.extend({
    render: function () {
        this.$('a').attr('href', this.model.get('url'));

        return this;
    },
});
var DropboxView = FileView.extend({
    render: function () {
        FileView.prototype.render.call(this);
        this.$('a').attr('href', null).on('click', this.click.bind(this));

        return this;
    },
    click: function (ev) {
        ev.preventDefault();
        Dropbox.save(this.model.get('url'), this.model.get('nomeProgramma') + '.mp4', {});
    },
});
var DownloadView = FileView.extend({
    render: function () {
        FileView.prototype.render.call(this);
        this.$('a').attr('download', this.model.get('nomeProgramma') + '.mp4');
        return this;
    },
});
