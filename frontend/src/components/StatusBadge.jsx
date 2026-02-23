const STATUS_STYLES = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  unpaid: 'bg-slate-100 text-slate-700',
  overdue: 'bg-red-100 text-red-800',
  occupied: 'bg-blue-100 text-blue-800',
  vacant: 'bg-slate-100 text-slate-600',
}

const STATUS_LABELS = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  occupied: 'Occupied',
  vacant: 'Vacant',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700'
  const label = STATUS_LABELS[status] || status
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}
