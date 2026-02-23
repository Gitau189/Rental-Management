import { AlertCircle, CheckCircle, Clock, DollarSign, Home } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { formatCurrency, formatDate, monthName } from '../../utils/helpers'

export default function TenantDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reports/tenant/dashboard/').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  const balance = parseFloat(data.total_outstanding || 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user?.first_name}!
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {data.unit?.apartment} – Unit {data.unit?.unit_number}
        </p>
      </div>

      {/* Balance banner */}
      <div className={`rounded-xl p-6 text-white ${balance > 0 ? 'bg-red-600' : 'bg-green-600'}`}>
        <div className="flex items-center gap-3 mb-2">
          {balance > 0 ? <AlertCircle size={22} /> : <CheckCircle size={22} />}
          <p className="font-semibold">
            {balance > 0 ? 'Outstanding Balance' : 'All Paid Up!'}
          </p>
        </div>
        <p className="text-3xl font-bold">KES {formatCurrency(balance)}</p>
        {balance > 0 && (
          <Link to="/tenant/invoices" className="mt-3 inline-block text-sm text-white/90 underline">
            View invoices →
          </Link>
        )}
      </div>

      {/* Unit info */}
      {data.unit?.unit_number && (
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <Home size={20} className="text-primary-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{data.unit.apartment} – Unit {data.unit.unit_number}</p>
              {data.unit.description && <p className="text-sm text-slate-500">{data.unit.description}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent invoices */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Invoices</h2>
            <Link to="/tenant/invoices" className="text-sm text-primary-700 hover:underline">View all</Link>
          </div>
          {data.recent_invoices.length === 0 ? (
            <p className="text-sm text-slate-400">No invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_invoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/tenant/invoices/${inv.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {monthName(inv.period.split('/')[0])} {inv.period.split('/')[1]}
                    </p>
                    <p className="text-xs text-slate-400">Due {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">KES {formatCurrency(inv.total_amount)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Recent Payments</h2>
          {data.recent_payments.length === 0 ? (
            <p className="text-sm text-slate-400">No payments yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {monthName(p.invoice_period.split('/')[0])} {p.invoice_period.split('/')[1]}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(p.date)} · {p.method}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-700">KES {formatCurrency(p.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
