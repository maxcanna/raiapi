/**
 * Created by massimilianocannarozzo on 25/11/18.
 */
/* eslint-env node */
const moment = require('moment-timezone').tz.setDefault('Europe/Rome');
const createError = require('http-errors');

module.exports = (req, res, next) => {
    let m;

    if (req.query.data === undefined) {
        m = moment().startOf('day').subtract(1, 'day');
    } else {
        m = moment(req.query.data, 'YYYY-MM-DD');
        if (!m.isValid()) {
            return next(createError.BadRequest('Data non valida'));
        }
    }

    const diff = moment().diff(m, 'days');

    if (diff > 7 || diff < 1) {
        return next(createError.BadRequest('Data non valida'));
    }

    req.query.data = m.toDate();
    next();
};
