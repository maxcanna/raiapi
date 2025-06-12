export default function (config, { production }) {
    if (!production) {
        config.devServer.proxy = [
            {
                path: '/api/**',
                target: 'http://localhost:3000/',
            },
        ];
    }
    if (production) {
        config.devtool = false;
    }
    return config;
}
