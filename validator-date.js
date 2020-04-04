/**
 * Created by massimilianocannarozzo on 25/11/18.
 */
/* eslint-env node */
const moment = require('moment-timezone')
    , createError = require('http-errors')
    , tz = 'Europe/rome';

module.exports = (req, res, next) => {
        let m;

        if (req.query.data === undefined) {
            m = moment().startOf('day').subtract(1, 'day').tz(tz);
        } else {
            m = moment(req.query.data, 'YYYY-MM-DD').tz(tz);
            if (!m.isValid()) {
                return next(createError.BadRequest('Data non valida'));
            }
        }

        const diff = moment.tz(tz).diff(m, 'days');

        if (diff > 7 || diff < 1) {
            return next(createError.BadRequest('Data non valida'));
        }

        req.query.data = m.toDate();
        req.fromItaly = (req.headers['CF-IPCountry'] || 'IT') === 'IT';
        next();
    };
