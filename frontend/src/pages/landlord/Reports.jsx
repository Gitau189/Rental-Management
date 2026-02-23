import { BarChart3, Download, Filter } from 'lucide-react'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { formatCurrency, formatDate, monthName } from '../../utils/helpers'

export default function Reports() {
  const [tab, setTab] = useState('payments')
  const [apartments, setApartments] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(false)

  const [paymentData, setPaymentData] = useState(null)
  const [outstandingData, setOutstandingData] = useState(null)
  const [payFilters, setPayFilters] = useState({ apartment: '', tenant: '', method: '', date_from: '', date_to: '' })
  const [outFilters, setOutFilters] = useState({ apartment: '', tenant: '' })

  useEffect(() => {
    Promise.all([api.get('/apartments/'), api.get('/tenants/')]).then(([aRes, tRes]) => {
      setApartments(aRes.data)
      setTenants(tRes.data)
    })
    fetchPayments()
    fetchOutstanding()
  }, [])

  const fetchPayments = () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(payFilters).forEach(([k, v]) => { if (v) params.set(k, v) })
    api.get(`/reports/payments/?${params}`).then(r => setPaymentData(r.data)).finally(() => setLoading(false))
  }

  const fetchOutstanding = () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(outFilters).forEach(([k, v]) => { if (v) params.set(k, v) })
    api.get(`/reports/outstanding/?${params}`).then(r => setOutstandingData(r.data)).finally(() => setLoading(false))
  }

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return
    const keys = Object.keys(data[0])
    const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[['payments', 'Payment Report'], ['outstanding', 'Outstanding Balances']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Payment Report */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter size={15} /> Filters
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <select className="input text-sm" value={payFilters.apartment} onChange={e => setPayFilters({ ...payFilters, apartment: e.target.value })}>
                <option value="">All Properties</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select className="input text-sm" value={payFilters.tenant} onChange={e => setPayFilters({ ...payFilters, tenant: e.target.value })}>
                <option value="">All Tenants</option>
                {tenants.map(t => <option key={t.user.id} value={t.user.id}>{t.user.first_name} {t.user.last_name}</option>)}
              </select>
              <select className="input text-sm" value={payFilters.method} onChange={e => setPayFilters({ ...payFilters, method: e.target.value })}>
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mpesa">M-Pesa</option>
                <option value="cheque">Cheque</option>
              </select>
              <input type="date" className="input text-sm" value={payFilters.date_from} onChange={e => setPayFilters({ ...payFilters, date_from: e.target.value })} />
              <input type="date" className="input text-sm" value={payFilters.date_to} onChange={e => setPayFilters({ ...payFilters, date_to: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button onClick={fetchPayments} className="btn-primary !py-2 text-sm">Apply</button>
              <button onClick={() => exportCSV(paymentData?.payments, 'payment-report.csv')} className="btn-secondary !py-2 text-sm">
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : paymentData && (
            <>
              <div className="card">
                <p className="text-sm text-slate-500">Total Collected</p>
                <p className="text-2xl font-bold text-green-700">KES {formatCurrency(paymentData.total)}</p>
                <p className="text-xs text-slate-400">{paymentData.count} transactions</p>
              </div>
              <div className="card overflow-hidden p-0">
                <table className="min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-head py-3 px-4">Date</th>
                      <th className="table-head py-3 px-4">Tenant</th>
                      <th className="table-head py-3 px-4">Unit</th>
                      <th className="table-head py-3 px-4">Amount</th>
                      <th className="table-head py-3 px-4">Method</th>
                      <th className="table-head py-3 px-4">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentData.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="table-cell px-4">{formatDate(p.date)}</td>
                        <td className="table-cell px-4 font-medium">{p.tenant}</td>
                        <td className="table-cell px-4 text-slate-500">{p.unit}</td>
                        <td className="table-cell px-4 font-semibold text-green-700">KES {formatCurrency(p.amount)}</td>
                        <td className="table-cell px-4">{p.method}</td>
                        <td className="table-cell px-4 text-slate-500">{p.reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Outstanding Report */}
      {tab === 'outstanding' && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter size={15} /> Filters
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <select className="input text-sm" value={outFilters.apartment} onChange={e => setOutFilters({ ...outFilters, apartment: e.target.value })}>
                <option value="">All Properties</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select className="input text-sm" value={outFilters.tenant} onChange={e => setOutFilters({ ...outFilters, tenant: e.target.value })}>
                <option value="">All Tenants</option>
                {tenants.map(t => <option key={t.user.id} value={t.user.id}>{t.user.first_name} {t.user.last_name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchOutstanding} className="btn-primary !py-2 text-sm">Apply</button>
              <button onClick={() => exportCSV(outstandingData?.invoices, 'outstanding-report.csv')} className="btn-secondary !py-2 text-sm">
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : outstandingData && (
            <>
              <div className="card">
                <p className="text-sm text-slate-500">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600">KES {formatCurrency(outstandingData.grand_total)}</p>
                <p className="text-xs text-slate-400">{outstandingData.count} outstanding invoice{outstandingData.count !== 1 ? 's' : ''}</p>
              </div>
              <div className="card overflow-hidden p-0">
                <table className="min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="table-head py-3 px-4">Tenant</th>
                      <th className="table-head py-3 px-4">Unit</th>
                      <th className="table-head py-3 px-4">Period</th>
                      <th className="table-head py-3 px-4">Total</th>
                      <th className="table-head py-3 px-4">Paid</th>
                      <th className="table-head py-3 px-4">Balance</th>
                      <th className="table-head py-3 px-4">Due Date</th>
                      <th className="table-head py-3 px-4">Days Overdue</th>
                      <th className="table-head py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outstandingData.invoices.map((inv) => (
                      <tr key={inv.invoice_id} className="hover:bg-slate-50">
                        <td className="table-cell px-4 font-medium">{inv.tenant}</td>
                        <td className="table-cell px-4 text-slate-500">{inv.unit}</td>
                        <td className="table-cell px-4">
                          {monthName(inv.period.split('/')[0])} {inv.period.split('/')[1]}
                        </td>
                        <td className="table-cell px-4">KES {formatCurrency(inv.total_amount)}</td>
                        <td className="table-cell px-4 text-green-700">KES {formatCurrency(inv.amount_paid)}</td>
                        <td className="table-cell px-4 font-semibold text-red-600">KES {formatCurrency(inv.remaining_balance)}</td>
                        <td className="table-cell px-4">{formatDate(inv.due_date)}</td>
                        <td className="table-cell px-4">
                          {inv.days_overdue > 0 ? <span className="text-red-600 font-medium">{inv.days_overdue}d</span> : '—'}
                        </td>
                        <td className="table-cell px-4"><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
