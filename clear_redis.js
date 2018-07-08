/**
 * Created by massimilianocannarozzo on 01/10/16.
 */
/* eslint-env node */
const { env: { NODE_ENV: environment = 'development', REDISCLOUD_URL } } = process;

if(REDISCLOUD_URL) {
    const redisClient = require('redis').createClient(
        REDISCLOUD_URL,
        {
            prefix: environment + ':' ,
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
