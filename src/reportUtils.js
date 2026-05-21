/**
 * Shared report helpers for Contract Approval Workflow report.
 * Response shape: { Columns: [{ FieldId, Name, Id }], Data: [row with Column-xxx keys] }
 */

export const PROCESS_NAME = 'Contract_Approval_Workflow_A00'
export const REPORT_ID = 'Contract_Approval_Workflow_A00_All_Items'

export const FIELD_MAP = {
    Contract_Title: 'title',
    Contract_Type: 'type',
    Effective_Date: 'effective',
    Main_Contract_Document: 'document',
    Contract_Value: 'value',
    End_Date: 'endDate',
    Status_1: 'status',
}

export function formatDate(iso) {
    if (!iso) return ''
    try {
        const d = new Date(iso + 'T12:00:00')
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
        return iso
    }
}

export function formatValue(raw) {
    if (raw == null || raw === '') return '–'
    if (typeof raw === 'string' && raw.includes('INR')) {
        const num = raw.replace(/\s*INR\s*/i, '').replace(/,/g, '')
        const n = parseFloat(num)
        if (!Number.isNaN(n)) return `₹${n.toLocaleString('en-IN')}`
    }
    return String(raw)
}

/**
 * Normalize process-report response (Columns + Data) to contracts list and counts.
 * @param {object} response - { Columns, Data }
 * @returns {{ columns, data, counts: { submitted, approved, expiring } }}
 */
export function normalizeReportResponse(response) {
    if (!response || !Array.isArray(response.Columns) || !Array.isArray(response.Data)) {
        return { columns: [], data: [], counts: { submitted: 0, approved: 0, expiring: 0 } }
    }
    const columns = response.Columns
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth()

    const data = response.Data.map((row) => {
        const out = { _id: row._id }
        columns.forEach((col) => {
            const key = FIELD_MAP[col.FieldId] || col.FieldId
            const val = row[col.Id]
            if (key === 'effective' && val) out.effectiveDisplay = formatDate(val)
            if (key === 'endDate' && val) out.endDateDisplay = formatDate(val)
            if (key === 'value' && val) out.valueDisplay = formatValue(val)
            if (key === 'document' && Array.isArray(val) && val.length > 0) {
                out.documentName = val[0].name || 'Document'
                out.document = val
            } else if (key === 'document') {
                out.document = val
                out.documentName = null
            }
            out[key] = val
        })
        return out
    })

    let submitted = 0
    let approved = 0
    let expiring = 0
    data.forEach((row) => {
        const status = (row.status || '').trim()
        if (status && status.toLowerCase() === 'approved') approved += 1
        else if (status && !['Rejected', 'Cancelled'].includes(status)) submitted += 1
        if (row.endDate) {
            try {
                const d = new Date(row.endDate + 'T12:00:00')
                if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) expiring += 1
            } catch {}
        }
    })

    return {
        columns,
        data,
        counts: { submitted, approved, expiring },
    }
}

/**
 * Build report URL for kf.api() (relative path).
 * Same payload as: .../Contract_Approval_Workflow_A00_All_Items?apply_preference=true&page_number=1&page_size=10&_application_id=...
 */
export function getReportPath(accountId, applicationId, pageNumber = 1, pageSize = 10) {
    const params = new URLSearchParams()
    params.set('apply_preference', 'true')
    params.set('page_number', String(pageNumber))
    params.set('page_size', String(pageSize))
    params.set('_application_id', applicationId || '')
    return `/process-report/2/${accountId || ''}/${PROCESS_NAME}/${REPORT_ID}?${params.toString()}`
}
