import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import archiver from 'archiver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const distPath = path.resolve(__dirname, '../dist')

const data = fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')
const { name: packageName } = JSON.parse(data)

/** Root page components that may be rendered in App.jsx — first uncommented match wins (longest name first for alternation safety). */
const ROOT_PAGE_COMPONENTS = [
    'VendorManagementSystem',
    'ContractsMyItems',
    'LeadsManagementPage',
    'LeadDashboardPage',
    'VMS2_0',
    'ProjectForm',
]

function zipBaseNameFromApp() {
    const appPath = path.resolve(__dirname, '../src/App.jsx')
    if (!fs.existsSync(appPath)) return packageName

    let src = fs.readFileSync(appPath, 'utf8')
    src = src.replace(/\/\*[\s\S]*?\*\//g, '')
    src = src.replace(/\/\/.*$/gm, '')

    const names = [...ROOT_PAGE_COMPONENTS].sort((a, b) => b.length - a.length)
    const re = new RegExp(`<(${names.join('|')})(?:\\s[^>]*)?\\s*/>`)
    const m = src.match(re)
    if (m) return m[1]
    return packageName
}

const zipBase = zipBaseNameFromApp()
const ZIP_NAME_OVERRIDES = {
    VMS2_0: 'VMS2.0',
}
const zipBaseFinal = ZIP_NAME_OVERRIDES[zipBase] || zipBase
const zipFilePath = path.resolve(__dirname, `../${zipBaseFinal}.zip`)

console.log(
    `zip: output → ${zipBaseFinal}.zip (from active root in src/App.jsx, detected ${zipBase})`,
)

if (fs.existsSync(zipFilePath)) {
    fs.unlinkSync(zipFilePath)
}

if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true })
}

function buildProject() {
    execSync('npm run build', { stdio: 'inherit' }) // using 'npm' instead of other package managers, because npm is a safe bet
    // and will exists on everyone's machine if they have node.js installed.
}

async function zipDistFolder() {
    const output = fs.createWriteStream(zipFilePath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {})

    archive.on('error', (err) => {
        throw err
    })

    archive.pipe(output)
    archive.directory(distPath, false)
    await archive.finalize()
}

buildProject()
await zipDistFolder()
