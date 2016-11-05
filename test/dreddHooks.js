/**
 * Created by massimilianocannarozzo on 05/11/16.
 */
/* eslint-env node */
var hooks = require('hooks');
const url = 'http://distribution.bbb3d.renderfarming.net/video/mp4/bbb_sunflower_1080p_30fps_normal.mp4';

hooks.beforeValidation('File URL > Get URL', function (transaction) {
    const body = JSON.parse(transaction.real.body);
    body.url = url;
    transaction.real.body = JSON.stringify(body);
});
hooks.beforeValidation('File > Get File', function (transaction) {
    transaction.real.headers.location = url;
    transaction.real.body = `Found Redirecting to ${url}\n`;
});
hooks.beforeValidation('RSS > Get RSS', function (transaction) {
    transaction.real.body = transaction.expected.body;
});
