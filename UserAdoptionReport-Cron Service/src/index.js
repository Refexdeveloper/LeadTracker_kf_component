import 'dotenv/config';
import cron from 'node-cron';
import { runAdoptionReportJob } from './jobs/sendAdoptionReport.js';

const schedule = process.env.CRON_SCHEDULE || '0 8 * * 1-5';

console.log(`User Adoption Report Cron Service starting…`);
console.log(`Schedule: "${schedule}" (${process.env.TZ || 'system timezone'})`);

cron.schedule(schedule, async () => {
  console.log(`[${new Date().toISOString()}] Cron triggered — generating report…`);
  try {
    await runAdoptionReportJob();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Cron job failed:`, err.message);
  }
});

console.log('Cron service is running. Press Ctrl+C to stop.');
