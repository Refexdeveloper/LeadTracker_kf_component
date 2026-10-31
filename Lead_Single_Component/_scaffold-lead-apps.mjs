/**
 * Scaffold each App.jsx page as its own Kissflow app under Lead_Single_Component,
 * matching For_Murugesh_VMS (own package.json, vite, src/App.jsx, zip script).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const OUT = __dirname

const APPS = [
  { dir: 'LeadsManagementPage', title: 'Leads Management', component: 'LeadsManagementPage', importPath: './LeadsManagementPage.jsx', entry: 'LeadsManagementPage.jsx' },
  { dir: 'LeadsManagementHubPage', title: 'Leads Management Hub', component: 'LeadsManagementHubPage', importPath: './LeadsManagementHubPage.jsx', entry: 'LeadsManagementHubPage.jsx' },
  { dir: 'LeadDashboardPage', title: 'Lead Dashboard', component: 'LeadDashboardPage', importPath: './LeadDashboardPage.jsx', entry: 'LeadDashboardPage.jsx' },
  { dir: 'LeadCEOPage', title: 'Lead CEO', component: 'LeadCEOPage', importPath: './LeadCEOPage.jsx', entry: 'LeadCEOPage.jsx' },
  { dir: 'LeadDashboardPage2.0', title: 'Lead Dashboard 2.0', component: 'LeadDashboardPage2_0', importPath: './LeadDashboardPage2.0.jsx', entry: 'LeadDashboardPage2.0.jsx' },
  { dir: 'LeadSalesOpportunityPage', title: 'Lead Sales Opportunity', component: 'LeadSalesOpportunityPage', importPath: './LeadSalesOpportunityPage.jsx', entry: 'LeadSalesOpportunityPage.jsx' },
  { dir: '3iOppSalesActivity', title: '3i Opp Sales Activity', component: 'OppSalesActivity', importPath: './3iOppSalesActivity.jsx', entry: '3iOppSalesActivity.jsx' },
  { dir: 'VWLeadDashboardPage', title: 'VW Lead Dashboard', component: 'VWLeadDashboardPage', importPath: './VWLeadDashboardPage.jsx', entry: 'VWLeadDashboardPage.jsx' },
  { dir: 'VenwindLeadDashboardPage', title: 'Venwind Lead Dashboard', component: 'VenwindLeadDashboardPage', importPath: './VenwindLeadDashboardPage.jsx', entry: 'VenwindLeadDashboardPage.jsx' },
  { dir: 'VendorManagementSystem', title: 'Vendor Management System', component: 'VendorManagementSystem', importPath: './VendorManagementSystem.jsx', entry: 'VendorManagementSystem.jsx' },
  { dir: 'VMS2.0', title: 'VMS 2.0', component: 'VMS2_0', importPath: './VMS2.0.jsx', entry: 'VMS2.0.jsx' },
  { dir: 'ContractsMyItems', title: 'Contracts My Items', component: 'ContractsMyItems', importPath: './ContractsMyItems.jsx', entry: 'ContractsMyItems.jsx' },
  { dir: 'ContractsMyItemsPro', title: 'Contracts My Items Pro', component: 'ContractsMyItemsPro', importPath: './ContractsMyItemsPro.jsx', entry: 'ContractsMyItemsPro.jsx' },
  { dir: 'VendorMaster2', title: 'Vendor Master 2', component: 'VendorMaster2', importPath: './VendorMaster2.jsx', entry: 'VendorMaster2.jsx' },
  { dir: 'ProjectForm', title: 'Project Form', component: 'ProjectForm', importPath: './ProjectForm.jsx', entry: 'ProjectForm.jsx' },
  { dir: 'PendingApprovalsWidget', title: 'Pending Approvals', component: 'PendingApprovalsWidget', importPath: './PendingApprovalsWidget.jsx', entry: 'PendingApprovalsWidget.jsx' },
  { dir: 'ProjectDashboard', title: 'Project Dashboard', component: 'ProjectDashboard', importPath: './ProjectDashboard.jsx', entry: 'ProjectDashboard.jsx' },
  { dir: 'ProjectsProject', title: 'Projects', component: 'ProjectsProject', importPath: './ProjectsProject.jsx', entry: 'ProjectsProject.jsx' },
  { dir: 'TasksProject', title: 'Tasks', component: 'TasksProject', importPath: './TasksProject.jsx', entry: 'TasksProject.jsx' },
  { dir: 'ReportsProject', title: 'Reports', component: 'ReportsProject', importPath: './ReportsProject.jsx', entry: 'ReportsProject.jsx' },
  { dir: 'HelpProject', title: 'Help', component: 'HelpProject', importPath: './HelpProject.jsx', entry: 'HelpProject.jsx' },
  { dir: 'EmployeeDashboardProject', title: 'Employee Dashboard', component: 'EmployeeDashboardProject', importPath: './EmployeeDashboardProject.jsx', entry: 'EmployeeDashboardProject.jsx' },
  { dir: 'KarthikaTable', title: 'Karthika Table', component: 'KarthikaTable', importPath: './KarthikaTable.jsx', entry: 'KarthikaTable.jsx' },
  { dir: 'AMCPreventiveMaintenance', title: 'AMC Preventive Maintenance', component: 'AMCPreventiveMaintenance', importPath: './AMCPreventiveMaintenance.jsx', entry: 'AMCPreventiveMaintenance.jsx' },
  { dir: 'PMCalendar', title: 'PM Calendar', component: 'PMCalendar', importPath: './PMCalendar.jsx', entry: 'PMCalendar.jsx' },
  { dir: 'ExpiryManagement', title: 'Expiry Management', component: 'ExpiryManagement', importPath: './ExpiryManagement.jsx', entry: 'ExpiryManagement.jsx' },
  { dir: 'SLAMonitoring', title: 'SLA Monitoring', component: 'SLAMonitoring', importPath: './SLAMonitoring.jsx', entry: 'SLAMonitoring.jsx' },
]

const IMPORT_RE =
  /(?:import\s+(?:[\s\S]*?from\s+)?|export\s+[\s\S]*?from\s+|import\s*\(\s*)['"](\.[^'"]+)['"]/g
const CSS_IMPORT_RE = /@import\s+['"](\.[^'"]+)['"]/g
const CSS_URL_RE = /url\(\s*['"]?(\.[^'")]+)['"]?\s*\)/g

function resolveLocal(fromFile, spec) {
  const clean = spec.split('?')[0]
  const base = path.resolve(path.dirname(fromFile), clean)
  const candidates = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.css`,
    `${base}.svg`,
    `${base}.png`,
    `${base}.jpg`,
    `${base}.jpeg`,
    `${base}.webp`,
    `${base}.gif`,
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ]
  return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || null
}

function collectFrom(entryRel) {
  const files = new Set()
  const queue = [path.join(SRC, entryRel)]
  while (queue.length) {
    const file = queue.pop()
    if (!file || files.has(file) || !fs.existsSync(file)) continue
    if (!file.startsWith(SRC)) continue
    files.add(file)
    let text = ''
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const specs = []
    for (const re of [IMPORT_RE, CSS_IMPORT_RE, CSS_URL_RE]) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(text))) specs.push(m[1])
    }
    for (const spec of specs) {
      const resolved = resolveLocal(file, spec)
      if (resolved) queue.push(resolved)
    }
  }
  return files
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
}

function writeText(to, contents) {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.writeFileSync(to, contents)
}

const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

function packageJson(name) {
  const pkg = {
    name,
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      zip: 'node scripts/zip.js',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: { ...rootPkg.dependencies },
    engines: rootPkg.engines,
    devDependencies: { ...rootPkg.devDependencies },
  }
  delete pkg.devDependencies['ts-node']
  return `${JSON.stringify(pkg, null, 4)}\n`
}

const VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const cert = path.resolve('./cert/localhost.crt')
const key = path.resolve('./cert/localhost.key')
const https = existsSync(cert) && existsSync(key) ? { cert, key } : undefined

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        {
            name: 'emit-manifest-vite-plugin',
            writeBundle() {
                writeFileSync(
                    resolve(__dirname, 'dist/manifest.json'),
                    JSON.stringify({ Category: 'Page', Framework: 'React' }, null, 2),
                )
            },
        },
    ],
    base: '',
    build: {
        target: 'es2022',
    },
    server: {
        https,
        host: '0.0.0.0',
    },
})
`

const POSTCSS = `module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
`

const NPMRC = 'engine-strict=true\n'

const GITIGNORE = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

cert
node_modules
dist
dist-ssr
*.local
*.zip

.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`

const ZIP_JS = `import fs from 'fs'
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
const zipFilePath = path.resolve(__dirname, \`../\${packageName}.zip\`)

if (fs.existsSync(zipFilePath)) {
    fs.unlinkSync(zipFilePath)
}

function removeDirSafe(targetPath, phase) {
    if (!fs.existsSync(targetPath)) return
    try {
        fs.rmSync(targetPath, {
            recursive: true,
            force: true,
            maxRetries: 6,
            retryDelay: 200,
        })
    } catch (err) {
        if (err?.code === 'EPERM' || err?.code === 'EBUSY') {
            console.warn(\`[zip] Skipping \${phase} cleanup: \${err.code} on \${targetPath}\`)
            return
        }
        throw err
    }
}
removeDirSafe(distPath, 'pre-build')

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
removeDirSafe(distPath, 'post-zip')
`

function indexHtml(title) {
  return `<!doctype html>
<html lang="en" style="height:100%;width:100%;">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5, user-scalable=yes" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
        <title>${title}</title>
    </head>
    <body style="height:100%;width:100%;margin:0;">
        <div id="root" style="height:100%;min-height:100%;width:100%;background:#f1f5f9"></div>
        <script type="module" src="/src/main.jsx"></script>
    </body>
</html>
`
}

const MAIN_JSX = `import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import { SDKWrapper } from './sdk/index.js'

import './index.css'

const Root = createRoot(document.getElementById('root'))
Root.render(
    <SDKWrapper>
        <App />
    </SDKWrapper>
)
`

function appJsx(component, importPath) {
  return `import ${component} from '${importPath}'

function App() {
    return (
        <div className="rootDiv">
            <${component} />
        </div>
    )
}

export default App
`
}

function scaffold(app) {
  const dest = path.join(OUT, app.dir)
  fs.mkdirSync(dest, { recursive: true })

  const files = collectFrom(app.entry)
  for (const extra of ['index.css', 'sdk/index.js', 'sdk/wrapper.jsx', 'sdk/context.jsx']) {
    const abs = path.join(SRC, extra)
    if (fs.existsSync(abs)) files.add(abs)
  }

  for (const file of files) {
    const rel = path.relative(SRC, file)
    copyFile(file, path.join(dest, 'src', rel))
  }

  writeText(path.join(dest, 'src/App.jsx'), appJsx(app.component, app.importPath))
  writeText(path.join(dest, 'src/main.jsx'), MAIN_JSX)
  writeText(path.join(dest, 'package.json'), packageJson(app.dir))
  writeText(path.join(dest, 'vite.config.js'), VITE_CONFIG)
  writeText(path.join(dest, 'postcss.config.cjs'), POSTCSS)
  writeText(path.join(dest, '.npmrc'), NPMRC)
  writeText(path.join(dest, '.gitignore'), GITIGNORE)
  writeText(path.join(dest, 'index.html'), indexHtml(app.title))
  writeText(path.join(dest, 'scripts/zip.js'), ZIP_JS)
  writeText(
    path.join(dest, 'public/manifest.json'),
    `${JSON.stringify({ Category: 'Page', Framework: 'React' }, null, 2)}\n`,
  )

  const favSrc = path.join(ROOT, 'For_Murugesh_VMS/employee-dashboard-v2/public/favicon.svg')
  if (fs.existsSync(favSrc)) copyFile(favSrc, path.join(dest, 'public/favicon.svg'))

  const p2p = path.join(ROOT, 'public/p2p')
  if (fs.existsSync(p2p)) {
    for (const name of fs.readdirSync(p2p)) {
      const from = path.join(p2p, name)
      if (fs.statSync(from).isFile()) copyFile(from, path.join(dest, 'public/p2p', name))
    }
  }

  console.log(`${app.dir}: ${files.size} source files`)
}

for (const app of APPS) scaffold(app)
console.log(`done — ${APPS.length} apps in Lead_Single_Component`)
