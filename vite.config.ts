import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: 'examples/simple-ui',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '../../src'),
        },
    },
    server: {
        port: 3000,
    },
    define: {
        'global': 'window', // Polyfill global for Gun.js if needed
    },
});
