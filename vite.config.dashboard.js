import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const outDir = 'dist-dashboard'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        {
            name: 'emit-manifest-vite-plugin',
            writeBundle(_, bundle) {
                const manifestContent = {
                    Category: 'Page',
                    Framework: 'React',
                }
                const outputPath = resolve(__dirname, outDir, 'manifest.json')
                writeFileSync(outputPath, JSON.stringify(manifestContent, null, 2))
            },
        },
    ],
    base: '',
    build: {
        outDir,
        target: 'es2022',
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'dashboard.html'),
        },
    },
    server: {
        https: {
            cert: path.resolve('./cert/localhost.crt'),
            key: path.resolve('./cert/localhost.key'),
        },
        host: '0.0.0.0',
    },
})
