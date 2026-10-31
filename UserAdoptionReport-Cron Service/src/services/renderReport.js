/** Enterprise design tokens — aligned with Lead_KF mui/enterpriseTheme.js & AMCPreventiveMaintenance */
const BRAND = {
  primary: '#0086c9',
  primaryDark: '#0070a8',
  primaryDarker: '#005a85',
  tableHead: '#EEF1F8',
  tableHeadBorder: '#DDE3EF',
  tableHeadText: '#5B6478',
};

const KPI_ACCENTS = {
  brand: { border: '1px solid #bae6fd', wash: 'linear-gradient(135deg, #ffffff 14%, #ffffff 48%, #e0f4fc 100%)', valueColor: '#0086c9' },
  success: { border: '1px solid #a7f3d0', wash: 'linear-gradient(135deg, #ffffff 14%, #ffffff 48%, #ecfdf5 100%)', valueColor: '#059669' },
  warning: { border: '1px solid #fde047', wash: 'linear-gradient(135deg, #ffffff 14%, #ffffff 48%, #fef9c3 100%)', valueColor: '#d97706' },
  error: { border: '1px solid #fecaca', wash: 'linear-gradient(135deg, #ffffff 14%, #ffffff 48%, #fef2f2 100%)', valueColor: '#dc2626' },
  info: { border: '1px solid #bae6fd', wash: 'linear-gradient(135deg, #ffffff 14%, #ffffff 48%, #f0f9ff 100%)', valueColor: '#0070a8' },
  violet: { border: '1px solid #ddd6fe', wash: 'linear-gradient(135deg, #ffffff 14%, #ffffff 48%, #f5f3ff 100%)', valueColor: '#7c3aed' },
};

const STATUS_STYLES = {
  Active: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Active', dot: '#10b981' },
  Moderate: { bg: '#fef9c3', color: '#a16207', border: '#fde047', label: 'Moderate', dot: '#f59e0b' },
  Inactive: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Inactive', dot: '#ef4444' },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(status) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Moderate;
  return `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${s.bg};color:${s.color};border:1px solid ${s.border};white-space:nowrap;"><span style="width:7px;height:7px;border-radius:50%;background:${s.dot};display:inline-block;"></span>${s.label}</span>`;
}

function loggedTodayBadge(logged) {
  if (logged) {
    return '<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;">Yes</span>';
  }
  return '<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">No</span>';
}

function overdueCell(value) {
  const n = Number(value) || 0;
  const color = n >= 3 ? '#dc2626' : n >= 1 ? '#d97706' : '#64748b';
  const weight = n > 0 ? '700' : '500';
  const bg = n >= 3 ? '#fef2f2' : 'transparent';
  return `<span style="color:${color};font-weight:${weight};${n >= 3 ? `background:${bg};padding:2px 8px;border-radius:6px;` : ''}">${n}</span>`;
}

function kpiCard(label, value, sub, accentKey = 'brand') {
  const a = KPI_ACCENTS[accentKey] || KPI_ACCENTS.brand;
  return `
    <td width="25%" style="padding:5px;vertical-align:top;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${a.wash};border:${a.border};border-radius:16px;box-shadow:0 1px 0 rgba(15,23,42,0.04),0 1px 3px rgba(15,23,42,0.08);">
        <tr>
          <td style="padding:14px 14px 12px;">
            <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;line-height:1.3;">${escapeHtml(label)}</div>
            <div style="font-size:24px;font-weight:700;color:${a.valueColor};line-height:1.1;letter-spacing:-0.02em;">${escapeHtml(value)}</div>
            ${sub ? `<div style="font-size:11px;color:#94a3b8;margin-top:5px;font-weight:500;">${escapeHtml(sub)}</div>` : ''}
          </td>
        </tr>
      </table>
    </td>`;
}

function sectionBlock(title, subtitle, icon = '') {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:12px;">
      <tr>
        <td style="background:linear-gradient(90deg,#ffffff,#f0f9ff,rgba(224,244,252,0.65));border:1px solid rgba(255,255,255,0.8);border-bottom:1px solid rgba(241,245,249,0.95);border-radius:16px 16px 0 0;padding:14px 18px;">
          <div style="font-size:16px;font-weight:600;color:#1e293b;letter-spacing:-0.01em;">${icon ? `${icon} ` : ''}${escapeHtml(title)}</div>
          ${subtitle ? `<div style="font-size:12px;color:#64748b;margin-top:3px;">${escapeHtml(subtitle)}</div>` : ''}
        </td>
      </tr>
    </table>`;
}

const TH = `padding:11px 10px;font-size:10px;font-weight:700;color:${BRAND.tableHeadText};text-transform:uppercase;letter-spacing:0.06em;background:${BRAND.tableHead};border-bottom:1px solid ${BRAND.tableHeadBorder};white-space:nowrap;`;
const TD = 'padding:10px 8px;font-size:11px;border-bottom:1px solid #f1f5f9;';

const ENTITY_COLORS = {
  'Refex Mobility': { accent: '#0086c9', soft: '#f0f9ff', border: '#bae6fd' },
  Adonis: { accent: '#7c3aed', soft: '#f5f3ff', border: '#ddd6fe' },
  'Refex eVeelz': { accent: '#059669', soft: '#ecfdf5', border: '#a7f3d0' },
};

function tableRow(row, index, { hideEntity = false } = {}) {
  const notLoggedBg = !row.loggedToday ? '#fff5f5' : index % 2 === 0 ? '#ffffff' : '#f8fafc';
  return `
    <tr style="background:${notLoggedBg};">
      <td style="${TD}color:#64748b;text-align:center;">${row.slNo}</td>
      ${hideEntity ? '' : `<td style="${TD}color:${BRAND.primaryDark};font-weight:600;white-space:nowrap;">${escapeHtml(row.businessEntity)}</td>`}
      <td style="${TD}color:#0f172a;font-weight:600;font-size:12px;white-space:nowrap;">${escapeHtml(row.userName)}</td>
      <td style="${TD}color:#475569;">${escapeHtml(row.designation)}</td>
      <td style="${TD}color:#475569;white-space:nowrap;">${escapeHtml(row.reportingManager)}</td>
      <td style="${TD}color:#475569;white-space:nowrap;">${escapeHtml(row.lastLogin)}</td>
      <td style="${TD}text-align:center;">${loggedTodayBadge(row.loggedToday)}</td>
      <td style="${TD}color:#0f172a;text-align:right;font-weight:600;">${row.openLeads}</td>
      <td style="${TD}color:#0f172a;text-align:right;font-weight:600;">${row.closedLeads}</td>
      <td style="${TD}color:#0f172a;text-align:right;">${row.leadsCreated}</td>
      <td style="${TD}color:#0f172a;text-align:right;">${row.leadsParticipated}</td>
      <td style="${TD}color:#d97706;text-align:right;font-weight:600;">${row.pendingFollowUps}</td>
      <td style="${TD}color:#059669;text-align:right;font-weight:600;">${row.completedFollowUps}</td>
      <td style="${TD}text-align:right;">${overdueCell(row.overdueFollowUps)}</td>
      <td style="${TD}color:#475569;white-space:nowrap;">${escapeHtml(row.lastActivity)}</td>
      <td style="${TD}color:${BRAND.primary};font-weight:600;white-space:nowrap;">${escapeHtml(row.lastLeadUpdated)}</td>
      <td style="${TD}text-align:center;">${statusBadge(row.adoptionStatus)}</td>
    </tr>`;
}

function compactTable(headers, rowsHtml, minWidth = '100%') {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border:1px solid rgba(226,232,240,0.95);border-radius:0 0 16px 16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);margin-bottom:22px;">
      <tr><td style="padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="min-width:${minWidth};border-collapse:collapse;">
          <thead><tr>${headers}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </td></tr>
    </table>`;
}

function topPerformerRows(items) {
  return items.map((item, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    return `
      <tr style="background:${bg};">
        <td style="${TD}color:#475569;font-weight:600;">${escapeHtml(item.category)}</td>
        <td style="${TD}color:#0f172a;font-weight:700;">${escapeHtml(item.user)}</td>
        <td style="${TD}color:${BRAND.primaryDark};font-weight:700;text-align:right;">${escapeHtml(item.value)}</td>
      </tr>`;
  }).join('');
}

function attentionRows(items) {
  return items.map((item, i) => {
    const bg = i % 2 === 0 ? '#fffbeb' : '#ffffff';
    return `
      <tr style="background:${bg};">
        <td style="${TD}color:#0f172a;font-weight:700;">${escapeHtml(item.user)}</td>
        <td style="${TD}color:#b45309;">${escapeHtml(item.reason)}</td>
        <td style="${TD}color:#dc2626;font-weight:600;">${escapeHtml(item.action)}</td>
      </tr>`;
  }).join('');
}

function detailTableHeaders(th, includeEntity = true) {
  return [
    th('Sl. No', 'center'),
    ...(includeEntity ? [th('Business Entity')] : []),
    th('User Name'),
    th('Designation'),
    th('Reporting Manager'),
    th('Last Login'),
    th('Logged Today', 'center'),
    th('Open Leads', 'right'),
    th('Closed Leads', 'right'),
    th('Leads Created', 'right'),
    th('Leads Participated', 'right'),
    th('Pending F/U', 'right'),
    th('Completed F/U', 'right'),
    th('Overdue F/U', 'right'),
    th('Last Activity'),
    th('Last Lead Updated'),
    th('Adoption Status', 'center'),
  ].join('');
}

function entitySectionBlock(entity, colors) {
  const subtitle = `${entity.users} users · ${entity.activeToday} active today · ${entity.openLeads} open · ${entity.closedLeads} closed · ${entity.adoptionRate}% adoption`;
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:12px;margin-top:8px;">
      <tr>
        <td style="background:${colors.soft};border:1px solid ${colors.border};border-left:4px solid ${colors.accent};border-radius:16px 16px 0 0;padding:14px 18px;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${escapeHtml(entity.name)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:3px;">${escapeHtml(subtitle)}</div>
        </td>
      </tr>
    </table>`;
}

function entityMiniKpi(label, value, color) {
  return `
    <td width="25%" style="padding:4px;vertical-align:top;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
        <tr>
          <td style="padding:10px 12px;text-align:center;">
            <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${escapeHtml(label)}</div>
            <div style="font-size:20px;font-weight:700;color:${color};line-height:1.1;">${escapeHtml(value)}</div>
          </td>
        </tr>
      </table>
    </td>`;
}

function renderEntityUserReports(entities, th) {
  return entities.map((entity) => {
    const colors = ENTITY_COLORS[entity.name] || { accent: BRAND.primary, soft: '#f0f9ff', border: '#bae6fd' };
    const entityRows = entity.rows.map((row, index) => tableRow(row, index, { hideEntity: true })).join('');
    return `
      ${entitySectionBlock(entity, colors)}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:8px;">
        <tr>
          ${entityMiniKpi('Users', entity.users, colors.accent)}
          ${entityMiniKpi('Active Today', entity.activeToday, '#059669')}
          ${entityMiniKpi('Open Leads', entity.openLeads, '#0070a8')}
          ${entityMiniKpi('Overdue F/U', entity.overdueFollowUps, entity.overdueFollowUps > 0 ? '#dc2626' : '#64748b')}
        </tr>
      </table>
      ${compactTable(detailTableHeaders(th, false), entityRows, '1500px')}`;
  }).join('');
}

function entitySummaryRows(entities) {
  return entities.map((entity, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const adoptionColor = entity.adoptionRate >= 80 ? '#059669' : entity.adoptionRate >= 70 ? '#d97706' : '#dc2626';
    return `
      <tr style="background:${bg};">
        <td style="${TD}color:${BRAND.primaryDark};font-weight:700;">${escapeHtml(entity.name)}</td>
        <td style="${TD}text-align:center;font-weight:600;">${entity.users}</td>
        <td style="${TD}text-align:center;color:#059669;font-weight:700;">${entity.activeToday}</td>
        <td style="${TD}text-align:right;font-weight:600;">${entity.openLeads}</td>
        <td style="${TD}text-align:right;font-weight:600;">${entity.closedLeads}</td>
        <td style="${TD}text-align:center;font-weight:700;color:${adoptionColor};">${entity.adoptionRate}%</td>
      </tr>`;
  }).join('');
}

/**
 * Renders the full 360° User Adoption Report as email-safe HTML.
 */
export function renderUserAdoptionReport({ meta, rows, kpis }) {
  const th = (label, align = 'left') => `<th style="${TH}text-align:${align};">${label}</th>`;
  const entityNames = kpis.entities.map((entity) => entity.name).join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(meta.title)}</title>
</head>
<body style="margin:0;padding:0;background:linear-gradient(135deg,#f1f5f9 0%,#f8fafc 50%,#f1f5f9 100%);font-family:'Plus Jakarta Sans','Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:linear-gradient(135deg,#f1f5f9 0%,#f8fafc 50%,#f1f5f9 100%);padding:28px 14px;">
    <tr>
      <td align="center">
        <table width="1200" cellpadding="0" cellspacing="0" role="presentation" style="max-width:1200px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,134,201,0.08),0 4px 6px -4px rgba(0,134,201,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 55%,${BRAND.primaryDarker} 100%);padding:26px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">${escapeHtml(meta.organization)}</div>
                    <div style="font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;margin-bottom:6px;letter-spacing:-0.02em;">${escapeHtml(meta.title)}</div>
                    <div style="font-size:14px;color:rgba(255,255,255,0.88);margin-bottom:14px;">${escapeHtml(meta.subtitle)}</div>
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:6px 14px;font-size:12px;color:#ffffff;">
                          Report Date: <strong>${escapeHtml(meta.reportPeriod)}</strong>
                        </td>
                        <td width="8"></td>
                        <td style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:6px 14px;font-size:12px;color:#ffffff;">
                          Generated At: <strong>${escapeHtml(meta.generatedAt)}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="top" width="72">
                    <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.35);border-radius:16px;text-align:center;line-height:52px;font-size:20px;font-weight:700;color:#ffffff;">RO</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#f8fafc;padding:22px 18px;border-left:1px solid rgba(226,232,240,0.9);border-right:1px solid rgba(226,232,240,0.9);">

              <!-- Executive Summary -->
              ${sectionBlock('Executive Summary', 'Key adoption and productivity metrics at a glance')}
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:4px;">
                <tr>
                  ${kpiCard('Total Users', kpis.totalUsers, 'Across all entities', 'brand')}
                  ${kpiCard('Active Users Today', kpis.activeUsersToday, `${kpis.overallAdoption}% logged in`, 'success')}
                  ${kpiCard('Inactive Users', kpis.inactiveUsersToday, 'Not logged in today', 'error')}
                  ${kpiCard('Overall Adoption', `${kpis.overallAdoption}%`, 'Daily login rate', 'info')}
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:22px;">
                <tr>
                  ${kpiCard('Total Open Leads', kpis.openLeads, 'Current pipeline', 'info')}
                  ${kpiCard('Total Closed Leads', kpis.closedLeads, 'Won / closed', 'violet')}
                  ${kpiCard('Leads Created Today', kpis.leadsCreatedToday, 'New business today', 'brand')}
                  ${kpiCard('Overdue Follow-ups', kpis.overdueFollowUps, `${kpis.pendingFollowUps} pending total`, 'error')}
                </tr>
              </table>

              <!-- User-wise Detailed Report — by Business Entity -->
              ${sectionBlock('User-wise Adoption & Productivity Report', `By business entity · ${rows.length} users total · ${entityNames}`)}
              ${renderEntityUserReports(kpis.entities, th)}

              <!-- Two-column: Top Performers + Users Needing Attention -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:22px;">
                <tr>
                  <td width="50%" style="padding-right:8px;vertical-align:top;">
                    ${sectionBlock('Top Performers', 'Standout contributors today')}
                    ${compactTable(
                      [th('Category'), th('User'), th('Performance', 'right')].join(''),
                      topPerformerRows(kpis.topPerformers),
                    )}
                  </td>
                  <td width="50%" style="padding-left:8px;vertical-align:top;">
                    ${sectionBlock('Users Requiring Attention', 'Immediate manager action recommended')}
                    ${compactTable(
                      [th('User'), th('Reason'), th('Action Required')].join(''),
                      attentionRows(kpis.usersNeedingAttention),
                    )}
                  </td>
                </tr>
              </table>

              <!-- Business Entity Summary -->
              ${sectionBlock('Business Entity Summary', 'Performance grouped by business unit')}
              ${compactTable(
                [
                  th('Business Entity'),
                  th('Users', 'center'),
                  th('Active Today', 'center'),
                  th('Open Leads', 'right'),
                  th('Closed Leads', 'right'),
                  th('Adoption', 'center'),
                ].join(''),
                entitySummaryRows(kpis.entities),
              )}

              <!-- Legend & formatting notes -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#ffffff;border:1px solid rgba(226,232,240,0.95);border-radius:16px;padding:14px 18px;box-shadow:0 1px 2px rgba(15,23,42,0.04);">
                    <div style="margin-bottom:10px;">
                      <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-right:14px;">Adoption Status</span>
                      ${statusBadge('Active')}<span style="display:inline-block;width:8px;"></span>
                      <span style="font-size:11px;color:#64748b;margin-right:6px;">Logged in today</span>
                      ${statusBadge('Moderate')}<span style="display:inline-block;width:8px;"></span>
                      <span style="font-size:11px;color:#64748b;margin-right:6px;">Within 7 days</span>
                      ${statusBadge('Inactive')}<span style="display:inline-block;width:8px;"></span>
                      <span style="font-size:11px;color:#64748b;">No login &gt; 7 days</span>
                    </div>
                    <div style="font-size:11px;color:#94a3b8;line-height:1.6;">
                      Rows with light red background = not logged in today &nbsp;·&nbsp;
                      Overdue follow-ups ≥ 3 highlighted in red &nbsp;·&nbsp;
                      Full detail also available as Excel attachment
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:18px 28px;text-align:center;border-radius:0 0 16px 16px;">
              <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">RefexOne Lead Tracker · Automated Daily Report</div>
              <div style="font-size:11px;color:#64748b;">© ${new Date().getFullYear()} Refex Group · Confidential — internal use only</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
