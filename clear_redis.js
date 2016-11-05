/**
 * Created by massimilianocannarozzo on 01/10/16.
 */
/* eslint-env node */
const environment = process.env.NODE_ENV || 'production';

if(process.env.REDISCLOUD_URL) {
    var redisClient = require('redis').createClient(
        process.env.REDISCLOUD_URL,
        {
            prefix: process.env.NODE_ENV ? process.env.NODE_ENV + ':' : '',
        }
    );
    redisClient.on('ready', function () {
        console.log(`Clearing redis keys for ${environment} environment`);
        redisClient.keys(redisClient.options.prefix + '*', function (err, rows) {
            const count = rows.length;
            if (count === 0) {
                console.log('No keys removed');
                process.exit(0);
            } else {
                rows.forEach(key => redisClient.del(key.replace(redisClient.options.prefix, '')));
                console.log('%s keys removed', count);
                process.exit(0);
            }
        });
    });
} else {
    console.info('redis not available');
    process.exit(0);
}
