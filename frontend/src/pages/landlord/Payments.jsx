import { CreditCard, Download, Filter } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import api from '../../services/api'
import { downloadBlob, formatCurrency, formatDate } from '../../utils/helpers'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ tenant: '', method: '', date_from: '', date_to: '' })

  useEffect(() => {
    Promise.all([
      api.get('/payments/'),
      api.get('/tenants/'),
    ]).then(([pRes, tRes]) => {
      setPayments(pRes.data)
      setTenants(tRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const applyFilters = () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    api.get(`/payments/?${params.toString()}`).then(r => setPayments(r.data))
  }

  useEffect(() => { if (!loading) applyFilters() }, [filters])

  const total = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const downloadReceipt = async (paymentId, refNo) => {
    try {
      const res = await api.get(`/payments/${paymentId}/receipt/`, { responseType: 'blob' })
      downloadBlob(res.data, `receipt-${paymentId}${refNo ? `-${refNo}` : ''}.pdf`)
    } catch {
      toast.error('Failed to download receipt.')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter size={15} /> Filters
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select className="input text-sm" value={filters.tenant} onChange={e => setFilters({ ...filters, tenant: e.target.value })}>
            <option value="">All Tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.user.id}>
                {t.user.first_name} {t.user.last_name}
              </option>
            ))}
          </select>
          <select className="input text-sm" value={filters.method} onChange={e => setFilters({ ...filters, method: e.target.value })}>
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mpesa">M-Pesa</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
          <input type="date" className="input text-sm" placeholder="From"
            value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
          <input type="date" className="input text-sm" placeholder="To"
            value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
        </div>
      </div>

      {/* Total */}
      <div className="card">
        <p className="text-sm text-slate-500">Total Collected (filtered)</p>
        <p className="text-2xl font-bold text-green-700">KES {formatCurrency(total)}</p>
        <p className="text-xs text-slate-400">{payments.length} transaction{payments.length !== 1 ? 's' : ''}</p>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments found"
          description="Payments will appear here once you record them against invoices."
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-head py-3 px-4">Date</th>
                <th className="table-head py-3 px-4">Tenant</th>
                <th className="table-head py-3 px-4">Invoice</th>
                <th className="table-head py-3 px-4">Amount</th>
                <th className="table-head py-3 px-4">Method</th>
                <th className="table-head py-3 px-4">Reference</th>
                <th className="table-head py-3 px-4">Balance After</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="table-cell px-4">{formatDate(p.payment_date)}</td>
                  <td className="table-cell px-4 font-medium">{p.tenant_name}</td>
                  <td className="table-cell px-4">
                    <Link to={`/landlord/invoices/${p.invoice}`} className="text-primary-700 hover:underline text-sm">
                      #{p.invoice?.toString().padStart(5, '0') || p.invoice}
                    </Link>
                  </td>
                  <td className="table-cell px-4 font-semibold text-green-700">KES {formatCurrency(p.amount)}</td>
                  <td className="table-cell px-4">{p.method}</td>
                  <td className="table-cell px-4 text-slate-500">{p.reference_number || '—'}</td>
                  <td className="table-cell px-4 text-red-600">KES {formatCurrency(p.balance_after)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => downloadReceipt(p.id, p.reference_number)}
                      className="text-primary-700 hover:underline text-sm font-medium flex items-center gap-1">
                      <Download size={13} />Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
