import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import archiver from 'archiver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const rootDir = path.resolve(__dirname, '..')
const distPath = path.resolve(rootDir, 'dist')
const appPath = path.resolve(rootDir, 'src/App.jsx')

const data = fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf8')
const { name: packageName } = JSON.parse(data)

/** Kissflow page components — import path may differ from component name (e.g. VMS2_0 → VMS2.0.jsx). */
const COMPONENT_IMPORT_PATH = {
    VendorManagementSystem: './VendorManagementSystem.jsx',
    ContractsMyItems: './ContractsMyItems.jsx',
    ContractsMyItemsPro: './ContractsMyItemsPro.jsx',
    LeadsManagementPage: './LeadsManagementPage.jsx',
    LeadsManagementHubPage: './LeadsManagementHubPage.jsx',
    LeadDashboardPage: './LeadDashboardPage.jsx',
    LeadCEOPage: './LeadCEOPage.jsx',
    LeadSalesOpportunityPage: './LeadSalesOpportunityPage.jsx',
    OppSalesActivity: './3iOppSalesActivity.jsx',
    LeadDashboardPage2_0: './LeadDashboardPage2.0.jsx',
    VWLeadDashboardPage: './VWLeadDashboardPage.jsx',
    VenwindLeadDashboardPage: './VenwindLeadDashboardPage.jsx',
    VMS2_0: './VMS2.0.jsx',
    VendorMaster2: './VendorMaster2.jsx',
    ProjectForm: './ProjectForm.jsx',
    PendingApprovalsWidget: './PendingApprovalsWidget.jsx',
    AMCPreventiveMaintenance: './AMCPreventiveMaintenance.jsx',
    PMCalendar: './PMCalendar.jsx',
    ExpiryManagement: './ExpiryManagement.jsx',
    SLAMonitoring: './SLAMonitoring.jsx',
}

const ALL_PAGE_COMPONENTS = Object.keys(COMPONENT_IMPORT_PATH)

const ZIP_NAME_OVERRIDES = {
    VMS2_0: 'VMS2.0',
    OppSalesActivity: '3iOppSalesActivity',
}

function stripComments(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
}

function findUncommentedRootComponents(src) {
    const stripped = stripComments(src)
    const names = [...ALL_PAGE_COMPONENTS].sort((a, b) => b.length - a.length)
    const re = new RegExp(`<(${names.join('|')})(?:\\s[^>]*)?\\s*/>`, 'g')
    const found = []
    let match = re.exec(stripped)
    while (match) {
        found.push(match[1])
        match = re.exec(stripped)
    }
    return [...new Set(found)]
}

/**
 * Resolve which page(s) to zip.
 * - CLI arg: zip exactly that component (e.g. `npm run zip -- PMCalendar`)
 * - Otherwise: only uncommented root JSX in App.jsx (same as VMS2_0 workflow)
 */
function resolveZipTargets(appSrc, cliComponent) {
    if (cliComponent) {
        if (!COMPONENT_IMPORT_PATH[cliComponent]) {
            const known = ALL_PAGE_COMPONENTS.join(', ')
            throw new Error(`zip: unknown component "${cliComponent}". Known: ${known}`)
        }
        return [cliComponent]
    }

    const uncommented = findUncommentedRootComponents(appSrc)
    if (uncommented.length > 0) {
        return uncommented
    }

    return null
}

function zipFileName(componentName) {
    const base = ZIP_NAME_OVERRIDES[componentName] || componentName
    return `${base}.zip`
}

function buildSinglePageApp(componentName) {
    const importPath = COMPONENT_IMPORT_PATH[componentName]
    if (!importPath) {
        throw new Error(`zip: no import path configured for "${componentName}"`)
    }

    return `import ${componentName} from '${importPath}'

function App() {
    return (
        <div className="rootDiv">
            <${componentName} />
        </div>
    )
}

export default App
`
}

function buildProject() {
    execSync('npm run build', { stdio: 'inherit', cwd: rootDir })
}

function zipDistFolder(zipFilePath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipFilePath)
        const archive = archiver('zip', { zlib: { level: 9 } })

        output.on('close', resolve)
        archive.on('error', reject)
        archive.pipe(output)
        archive.directory(distPath, false)
        archive.finalize()
    })
}

async function zipComponent(componentName) {
    const zipName = zipFileName(componentName)
    const zipFilePath = path.resolve(rootDir, zipName)

    if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath)
    }
    if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true })
    }

    fs.writeFileSync(appPath, buildSinglePageApp(componentName), 'utf8')
    buildProject()
    await zipDistFolder(zipFilePath)

    console.log(`zip: created ${zipName} ← ${componentName}`)
}

async function main() {
    if (!fs.existsSync(appPath)) {
        throw new Error('zip: src/App.jsx not found')
    }

    const cliComponent = process.argv[2] || null
    const originalApp = fs.readFileSync(appPath, 'utf8')
    const targets = resolveZipTargets(originalApp, cliComponent)

    if (!targets?.length) {
        throw new Error(
            'zip: no active page in App.jsx — uncomment one root component (e.g. <PMCalendar />) or pass a name: npm run zip -- PMCalendar',
        )
    }

    console.log(`zip: building ${targets.length} package(s): ${targets.join(', ')}`)

    try {
        for (const componentName of targets) {
            await zipComponent(componentName)
        }
    } finally {
        fs.writeFileSync(appPath, originalApp, 'utf8')
        if (fs.existsSync(distPath)) {
            fs.rmSync(distPath, { recursive: true, force: true })
        }
    }

    console.log('zip: done — App.jsx restored')
}

await main()
