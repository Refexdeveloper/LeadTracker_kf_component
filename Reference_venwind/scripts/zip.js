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

/** Optional zip filename tweaks (component import name → output base name). */
const ZIP_NAME_OVERRIDES = {
  VMS2_0: 'VMS2.0',
  LeadDashboardPage2_0: 'LeadDashboardPage2.0',
}

function stripJsComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** First active root page in src/App.jsx → zip base name (falls back to package name). */
function zipBaseNameFromApp() {
  const appPath = path.resolve(__dirname, '../src/App.jsx')
  if (!fs.existsSync(appPath)) return packageName

  const raw = fs.readFileSync(appPath, 'utf8')
  const src = stripJsComments(raw)

  const importNames = []
  for (const line of raw.split('\n')) {
    const match = line.match(/^import\s+(\w+)\s+from\s+['"]/)
    if (match) importNames.push(match[1])
  }
  if (!importNames.length) return packageName

  const returnMatch = src.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*\n?\s*\}/)
  const jsxBody = returnMatch ? returnMatch[1] : src

  const names = [...importNames].sort((a, b) => b.length - a.length)
  const tagRe = new RegExp(`<(${names.map(escapeRegExp).join('|')})(?:\\s[^>]*)?\\s*/>`)
  const match = jsxBody.match(tagRe)
  if (match) return match[1]

  return packageName
}

const zipBase = zipBaseNameFromApp()
const zipBaseFinal = ZIP_NAME_OVERRIDES[zipBase] || zipBase
const zipFilePath = path.resolve(__dirname, `../${zipBaseFinal}.zip`)

console.log(
  `zip: output → ${zipBaseFinal}.zip (active root in src/App.jsx: ${zipBase})`,
)

if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath)
}

if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true })
}

function buildProject() {
  execSync('npm run build', { stdio: 'inherit' })
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
