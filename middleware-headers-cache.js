/**
 * Created by massimilianocannarozzo on 02/12/18.
 */
/* eslint-env node */
const moment = require('moment');

const formatToHTTP = moment => moment.format('ddd, DD MMM YYYY HH:mm:ss [GMT]');
const getEndOfDay = () => moment.utc().endOf('day');
const getEndOfDayHTTP = () => formatToHTTP(getEndOfDay());
const getStartOfDayHTTP = () => formatToHTTP(moment.utc().startOf('day'));
const getMaxAgeHTTP = () => getEndOfDay().diff(moment.utc(), 'seconds');

module.exports = (req, res, next) => {
    res.set({
        'Cache-Control': `private, max-age=${getMaxAgeHTTP()}`,
        'Last-Modified': getStartOfDayHTTP(),
        Expires: getEndOfDayHTTP(),
    });
    next();
};
