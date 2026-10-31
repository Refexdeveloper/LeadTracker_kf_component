import 'dotenv/config';
import { REPORT_META, USER_ADOPTION_ROWS, computeKpis } from '../data/mockUserAdoptionData.js';
import { renderUserAdoptionReport } from '../services/renderReport.js';
import { sendReportEmail } from '../services/emailService.js';

export async function runAdoptionReportJob() {
  const meta = {
    ...REPORT_META,
    generatedAt: new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST',
  };

  const rows = USER_ADOPTION_ROWS;
  const kpis = computeKpis(rows);
  const html = renderUserAdoptionReport({ meta, rows, kpis });

  const subject = process.env.REPORT_SUBJECT
    || `User Adoption Report — ${meta.reportPeriod}`;

  const result = await sendReportEmail({ html, subject });

  console.log(`[${new Date().toISOString()}] Report sent successfully`, result);
  return { meta, kpis, result };
}

import { pathToFileURL } from 'node:url';

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runAdoptionReportJob().catch((err) => {
    console.error('Failed to send report:', err.message);
    process.exit(1);
  });
}
