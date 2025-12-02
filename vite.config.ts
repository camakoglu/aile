/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
    base: '/aile/',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        copyPublicDir: true,
    },
    test: {
        environment: 'jsdom',
    }
})
