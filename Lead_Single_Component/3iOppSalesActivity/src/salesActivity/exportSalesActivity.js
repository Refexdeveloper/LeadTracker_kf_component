function csvEscape(value) {
  const s = value == null || value === '—' ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function sanitizeFilename(name) {
  return (
    String(name || 'sales-activity')
      .replace(/[<>:"/\\|?*]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'sales-activity'
  )
}

function todayStamp() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function text(value) {
  if (value == null || value === '') return '—'
  return String(value)
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function strokeRoundRect(ctx, x, y, w, h, r, color) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.stroke()
}

function ellipsize(ctx, value, maxW) {
  const raw = text(value)
  if (ctx.measureText(raw).width <= maxW) return raw
  let s = raw
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1)
  return `${s}…`
}

function drawBadge(ctx, x, y, label, bg, fg) {
  ctx.font = '600 11px Segoe UI, Arial, sans-serif'
  const w = Math.ceil(ctx.measureText(label).width) + 20
  fillRoundRect(ctx, x, y, w, 22, 11, bg)
  ctx.fillStyle = fg
  ctx.fillText(label, x + 10, y + 15)
  return w
}

function canvasToPng(canvas, filename) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create PNG'))
        return
      }
      downloadBlob(filename, blob)
      resolve()
    }, 'image/png')
  })
}

export function flattenActivitiesFromOpps(oppRows) {
  const out = []
  ;(Array.isArray(oppRows) ? oppRows : []).forEach((row) => {
    ;(row.activities || []).forEach((act) => {
      out.push({
        ...act,
        opportunityCustomer: row.customer || act.opportunityName || '',
        opportunityId: act.opportunityId || row._id || row.id || '',
        opportunityOwner: row.salesManager || '',
      })
    })
  })
  return out
}

export function buildOppExportCsv(rows) {
  const list = Array.isArray(rows) ? rows : []
  const lines = []
  lines.push('OPPORTUNITIES')
  lines.push(
    ['Opportunity', 'Location', 'Sales owner', 'Value (L)', 'Status', 'Stage', 'Activities', 'Last activity']
      .map(csvEscape)
      .join(','),
  )
  list.forEach((row) => {
    lines.push(
      [
        row.customer,
        row.location || row.region,
        row.salesManager,
        row.valueLacs,
        row.status,
        row.stageLabel,
        row.activityCount,
        row.lastActivityLabel,
      ]
        .map((v) => csvEscape(text(v)))
        .join(','),
    )
  })
  lines.push('')
  lines.push('ACTIVITIES')
  lines.push(
    ['Opportunity', 'Activity', 'Salesperson', 'Date', 'Location', 'Region', 'Travel', 'Status', 'Process status', 'Purpose', 'Description']
      .map(csvEscape)
      .join(','),
  )
  flattenActivitiesFromOpps(list).forEach((act) => {
    lines.push(
      [
        act.opportunityCustomer,
        act.name,
        act.salesperson,
        act.activityLabel,
        act.location,
        act.salesRegion,
        act.travelMode,
        act.status,
        act.processStatus,
        act.purpose,
        act.description,
      ]
        .map((v) => csvEscape(text(v)))
        .join(','),
    )
  })
  return `${lines.join('\r\n')}\r\n`
}

export function buildActivityExportCsv(rows) {
  const list = Array.isArray(rows) ? rows : []
  const lines = []
  lines.push(
    ['Activity', 'Opportunity', 'Salesperson', 'Date', 'Location', 'Region', 'Travel', 'Status', 'Process status', 'Purpose', 'Description']
      .map(csvEscape)
      .join(','),
  )
  list.forEach((act) => {
    lines.push(
      [
        act.name,
        act.opportunityCustomer || act.opportunityName,
        act.salesperson,
        act.activityLabel,
        act.location,
        act.salesRegion,
        act.travelMode,
        act.status,
        act.processStatus,
        act.purpose,
        act.description,
      ]
        .map((v) => csvEscape(text(v)))
        .join(','),
    )
  })
  return `${lines.join('\r\n')}\r\n`
}

function downloadCsv(filenameBase, csv) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  downloadBlob(`${sanitizeFilename(filenameBase)}-${todayStamp()}.csv`, blob)
}

async function downloadListPng({ title, subtitle, columns, records, filenameBase }) {
  const scale = 2
  const width = 1400
  const pagePad = 36
  const contentW = width - pagePad * 2
  const rowH = 44
  const headerH = 132
  const height = Math.max(640, headerH + 56 + records.length * rowH + 72)
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, '#f1f5f9')
  bg.addColorStop(0.18, '#F8FAFF')
  bg.addColorStop(1, '#F1F5F9')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  fillRoundRect(ctx, 0, 0, width, 8, 0, '#2879b6')

  let y = pagePad
  ctx.fillStyle = '#64748B'
  ctx.font = '700 11px Segoe UI, Arial, sans-serif'
  ctx.fillText(title, pagePad, y + 12)
  ctx.textAlign = 'right'
  ctx.font = '500 11px Segoe UI, Arial, sans-serif'
  ctx.fillText(`Exported ${todayStamp()}`, width - pagePad, y + 12)
  ctx.textAlign = 'left'
  y += 36
  ctx.fillStyle = '#0F172A'
  ctx.font = '700 28px Segoe UI, Arial, sans-serif'
  ctx.fillText(ellipsize(ctx, subtitle, contentW), pagePad, y + 8)
  y += 36

  fillRoundRect(ctx, pagePad, y, contentW, 36 + records.length * rowH + 16, 18, '#FFFFFF')
  strokeRoundRect(ctx, pagePad, y, contentW, 36 + records.length * rowH + 16, 18, '#E2E8F0')

  const colW = contentW / columns.length
  ctx.fillStyle = '#64748B'
  ctx.font = '700 10px Segoe UI, Arial, sans-serif'
  columns.forEach((col, i) => {
    ctx.fillText(col.label, pagePad + 16 + i * colW, y + 24)
  })
  y += 40
  records.forEach((record, idx) => {
    if (idx % 2 === 1) {
      fillRoundRect(ctx, pagePad + 8, y - 16, contentW - 16, rowH - 6, 8, '#F8FAFC')
    }
    ctx.fillStyle = '#0F172A'
    ctx.font = '600 12px Segoe UI, Arial, sans-serif'
    columns.forEach((col, i) => {
      ctx.fillText(ellipsize(ctx, record[col.key], colW - 18), pagePad + 16 + i * colW, y + 10)
    })
    y += rowH
  })

  await canvasToPng(canvas, `${sanitizeFilename(filenameBase)}-${todayStamp()}.png`)
}

export async function exportOppTable(kind, rows) {
  const list = Array.isArray(rows) ? rows : []
  const filenameBase = 'sales-team-activity-opps'
  if (kind === 'csv') {
    downloadCsv(filenameBase, buildOppExportCsv(list))
    return
  }
  await downloadListPng({
    title: 'SALES TEAM ACTIVITY',
    subtitle: `${list.length} opportunities`,
    filenameBase,
    columns: [
      { key: 'customer', label: 'OPPORTUNITY' },
      { key: 'location', label: 'LOCATION' },
      { key: 'salesManager', label: 'OWNER' },
      { key: 'status', label: 'STATUS' },
      { key: 'activityCount', label: 'ACTIVITIES' },
      { key: 'lastActivityLabel', label: 'LAST ACTIVITY' },
    ],
    records: list.map((row) => ({
      customer: row.customer,
      location: row.location || row.region,
      salesManager: row.salesManager,
      status: row.status,
      activityCount: row.activityCount,
      lastActivityLabel: row.lastActivityLabel,
    })),
  })
}

export async function exportActivityTable(kind, rows) {
  const list = Array.isArray(rows) ? rows : []
  const filenameBase = 'sales-team-activities'
  if (kind === 'csv') {
    downloadCsv(filenameBase, buildActivityExportCsv(list))
    return
  }
  await downloadListPng({
    title: 'SALES TEAM ACTIVITY',
    subtitle: `${list.length} activities`,
    filenameBase,
    columns: [
      { key: 'name', label: 'ACTIVITY' },
      { key: 'opportunityCustomer', label: 'OPPORTUNITY' },
      { key: 'salesperson', label: 'SALESPERSON' },
      { key: 'location', label: 'LOCATION' },
      { key: 'activityLabel', label: 'DATE' },
      { key: 'status', label: 'STATUS' },
    ],
    records: list.map((act) => ({
      name: act.name,
      opportunityCustomer: act.opportunityCustomer || act.opportunityName,
      salesperson: act.salesperson,
      location: act.location,
      activityLabel: act.activityLabel,
      status: act.status,
    })),
  })
}

export async function exportOppAccordion(kind, row) {
  await exportOppTable(kind, row ? [row] : [])
}

export { sanitizeFilename, todayStamp }
