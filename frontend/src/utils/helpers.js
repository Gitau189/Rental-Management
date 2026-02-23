export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatCurrency(value) {
  const num = parseFloat(value) || 0
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function monthName(monthNum) {
  return MONTHS[(parseInt(monthNum, 10) || 1) - 1] || ''
}

export function currentYear() {
  return new Date().getFullYear()
}

export function currentMonth() {
  return new Date().getMonth() + 1
}

export function downloadBlob(data, filename) {
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('download', filename)
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export function errorMessage(err) {
  if (!err.response) return 'Network error. Please try again.'
  const data = err.response.data
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const messages = Object.entries(data)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join(' | ')
  return messages || 'An unexpected error occurred.'
}
