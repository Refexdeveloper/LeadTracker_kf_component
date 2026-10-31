export function ptStatusTone(status) {
  const s = String(status || '').trim().toLowerCase()
  if (s.includes('completed') || s.includes('closed') || s.includes('done') || s.includes('booked')) {
    return { wrap: 'bg-green-50 text-[#43A047]', dot: 'bg-[#43A047]' }
  }
  if (s.includes('rejected') || s.includes('lost') || s.includes('cancel')) {
    return { wrap: 'bg-red-50 text-[#E53935]', dot: 'bg-[#E53935]' }
  }
  if (s.includes('withdrawn') || s.includes('hold') || s.includes('risk') || s.includes('delayed')) {
    return { wrap: 'bg-orange-50 text-[#FB8C00]', dot: 'bg-[#FB8C00]' }
  }
  if (s.includes('progress') || s.includes('review') || s.includes('open') || s.includes('active')) {
    return { wrap: 'bg-[#e6f6f8] text-[#0f6b7a]', dot: 'bg-[#0f6b7a]' }
  }
  if (s.includes('draft') || s.includes('not started') || s.includes('notstarted')) {
    return { wrap: 'bg-gray-100 text-[#7F8C8D]', dot: 'bg-gray-400' }
  }
  return { wrap: 'bg-[#e6f6f8] text-[#0f6b7a]', dot: 'bg-[#0f6b7a]' }
}

export default function PtStatusBadge({ status, label, className = '' }) {
  const tone = ptStatusTone(status)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${tone.wrap} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {label || status || '—'}
    </span>
  )
}
