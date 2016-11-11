/**
 * Created by massimilianocannarozzo on 21/05/16.
 */
/* globals Backbone, $, _, Dropbox, CanaliCollection, ProgrammiCollection, QualitaCollection, UrlModel, Clipboard, moment */
/* eslint-env browser */
/* exported CanaliView */
var RaiCollectionView = Backbone.View.extend({
    initialize(options) {
        this.setElement($(options.selector));
        this.nextView = new options.view();
        this.collection = new options.collection();
        this.collection.on('reset', this.render, this);
    },
    render() {
        this.collection.forEach((function (item) {
            var view = new ItemView({model: item});
            this.$el.append(view.render().$el);
        }).bind(this));
        this.$el.fadeIn();
        return this;
    },
    setOptions(options) {
        _.each(options, (value, key) => {
            this[key] = value;
        }, this);
        this.collection.setOptions(options);
        this.collection.fetch({reset: true});
    },
    events: {
        'click #item-link': 'click',
    },
    click(ev) {
        ev.preventDefault();
        this.nextView.close();
        var id = $(ev.target).attr('data-id');
        this.model = this.collection.get(id);
    },
    close() {
        this.$('li').remove();
        this.$el.hide();
        this.nextView.close();
    },
});
var CanaliView = RaiCollectionView.extend({
    initialize() {
        RaiCollectionView.prototype.initialize.call(this, {
            selector: '#canali',
            view: ProgrammiView,
            collection: CanaliCollection,
        });
    },
    render() {
        if (this.collection && this.collection.length) {
            $('#loadingModal').modal('hide');
            this.nextView.close();
            this.$('li').remove();
            RaiCollectionView.prototype.render.call(this);
        }
        return this;
    },
    click(ev) {
        RaiCollectionView.prototype.click.call(this, ev);
        this.nextView.setOptions({
            data: this.model.get('data'),
            canale: this.model.get('id'),
        });
    },
});
var ProgrammiView = RaiCollectionView.extend({
    initialize() {
        RaiCollectionView.prototype.initialize.call(this, {
            selector: '#programmi',
            view: QualitaView,
            collection: ProgrammiCollection,
        });
    },
    render() {
        if (this.collection && this.collection.length) {
            RaiCollectionView.prototype.render.call(this);
        }
        return this;
    },
    click(ev) {
        RaiCollectionView.prototype.click.call(this, ev);
        this.nextView.setOptions({
            data: this.model.get('data'),
            canale: this.model.get('canale'),
            programma: this.model.get('id'),
            nomeProgramma: this.model.get('name'),
        });
    },
});
var QualitaView = RaiCollectionView.extend({
    initialize() {
        RaiCollectionView.prototype.initialize.call(this, {
            selector: '#qualita',
            view: LinkView,
            collection: QualitaCollection,
        });
    },
    render() {
        if (this.collection && this.collection.length) {
            return RaiCollectionView.prototype.render.call(this);
        }

        this.$el
            .append(_.template($('#template-na').html()))
            .fadeIn();

        return this;
    },
    click(ev) {
        RaiCollectionView.prototype.click.call(this, ev);
        this.nextView.setOptions({
            data: this.model.get('data'),
            canale: this.model.get('canale'),
            programma: this.model.get('programma'),
            qualita: this.model.get('id'),
            nomeProgramma: this.nomeProgramma,
        });
    },
});
var ItemView = Backbone.View.extend({
    initialize() {
        this.template = _.template($('#template-item').html());
    },
    render() {
        this.$el.html(this.template({
            data: this.model.get('data'),
            model: this.model,
            url: this.model.url(),
        }));
        return this;
    },
});
var LinkView = Backbone.View.extend({
    initialize() {
        this.setElement($('#link').find('ul'));
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
        this.copyView = new CopyView({model: this.model});
        this.copyView.setElement($('#copy'));
        this.views.push(this.copyView);
    },
    render() {
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
    setOptions(options) {
        _.each(options, function (value, key) {
            this[key] = value;
        }, this);

        this.model.clear();
        this.model.setOptions(options);

        this.close();

        this.model.fetch();
    },
    close() {
        this.$('li').remove();
    },
});
var FileView = Backbone.View.extend({
    render() {
        this.$('a').attr('href', this.model.get('url')).on('click', this.click.bind(this));

        return this;
    },
    click(ev) {
        ev.preventDefault();
        $('source').attr('src', this.model.get('url'));
        $('video').load();
        $('#videoModal .modal-title').html(this.model.get('nomeProgramma'));
        $('#videoModal').modal();
    },
});
var DropboxView = FileView.extend({
    render() {
        FileView.prototype.render.call(this);
        this.$('a').attr('href', null);

        return this;
    },
    click(ev) {
        ev.preventDefault();
        var nomeFile = this.model.get('nomeProgramma').replace(/( - | )/g, '.') +
            moment(this.model.get('data')).format('.YYYY.MM.DD.') +
            'WEBRip.AAC.x264.mp4';
        Dropbox.save(this.model.get('url'), nomeFile, {});
    },
});
var DownloadView = FileView.extend({
    render() {
        FileView.prototype.render.call(this);
        this.$('a').attr('download', this.model.get('nomeProgramma') + '.mp4').off();
        return this;
    },
});
var CopyView = FileView.extend({
    initialize() {
        new Clipboard('.btn');
    },
    render() {
        FileView.prototype.render.call(this);
        this.$('a').attr('href', null).off();
        this.$('.btn').attr('data-clipboard-text', this.model.get('url'));

        return this;
    },
});