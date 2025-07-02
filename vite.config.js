import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { createHtmlPlugin } from 'vite-plugin-html';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const production = mode === 'production';

    return {
        root: 'src', // Set the project root to 'src'
        plugins: [
            preact(),
            createHtmlPlugin({
                minify: production,
                inject: {
                    data: {
                        title: 'RaiAPI', // You might want to make this dynamic if needed
                    },
                },
            }),
        ],
        server: {
            proxy: {
                '/api': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                },
            },
        },
        build: {
            outDir: '../public', // Output directory relative to the new root
            emptyOutDir: true,
            sourcemap: !production,
        },
        esbuild: {
            jsxFactory: 'h',
            jsxFragment: 'Fragment',
            loader: {
                '.js': 'jsx' // Treat .js files as JSX
            }
        },
    };
});
