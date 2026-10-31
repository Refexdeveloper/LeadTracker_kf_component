import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { REPORT_META, USER_ADOPTION_ROWS, computeKpis } from '../data/mockUserAdoptionData.js';
import { renderUserAdoptionReport } from '../services/renderReport.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../../preview');
const outFile = join(outDir, 'user-adoption-report.html');

const meta = { ...REPORT_META };
const kpis = computeKpis(USER_ADOPTION_ROWS);
const html = renderUserAdoptionReport({
  meta,
  rows: USER_ADOPTION_ROWS,
  kpis,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html, 'utf8');

console.log(`Preview generated: ${outFile}`);
console.log('Open this file in your browser to see the report design.');
