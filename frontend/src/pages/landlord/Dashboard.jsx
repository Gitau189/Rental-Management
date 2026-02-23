import { AlertCircle, Building2, CheckCircle, Clock, DollarSign, Home, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/helpers'

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 truncate">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ml-3 ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reports/dashboard/')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  const { units, revenue_this_month, total_outstanding, current_month, recent_payments } = data
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-0.5 text-sm">
          {monthNames[current_month.month]} {current_month.year} overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total Units" value={units.total} icon={Building2} color="bg-primary-700" />
        <StatCard label="Occupied" value={units.occupied} icon={Home} color="bg-green-600" />
        <StatCard label="Vacant" value={units.vacant} icon={Home} color="bg-slate-500" />
        <StatCard
          label="Revenue This Month"
          value={`KES ${formatCurrency(revenue_this_month)}`}
          icon={TrendingUp}
          color="bg-emerald-600"
        />
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-1">
          <DollarSign className="text-red-500 shrink-0" size={20} />
          <h2 className="font-semibold text-slate-900">Total Outstanding Balance</h2>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-red-600">KES {formatCurrency(total_outstanding)}</p>
      </div>

      {/* Current month payment status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TenantStatusList title="Paid" items={current_month.paid} icon={CheckCircle} iconColor="text-green-600" />
        <TenantStatusList title="Partially Paid / Overdue" items={current_month.partial} icon={Clock} iconColor="text-yellow-600" />
        <TenantStatusList title="Not Paid" items={current_month.unpaid} icon={AlertCircle} iconColor="text-red-600" />
      </div>

      {/* Recent payments */}
      {recent_payments.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Recent Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="table-head py-2 px-4">Tenant</th>
                  <th className="table-head py-2 px-4">Unit</th>
                  <th className="table-head py-2 px-4">Amount</th>
                  <th className="table-head py-2 px-4">Date</th>
                  <th className="table-head py-2 px-4">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent_payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="table-cell px-4">{p.tenant_name}</td>
                    <td className="table-cell px-4 text-slate-500">{p.unit}</td>
                    <td className="table-cell px-4 font-semibold text-green-700 whitespace-nowrap">
                      KES {formatCurrency(p.amount)}
                    </td>
                    <td className="table-cell px-4 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                    <td className="table-cell px-4">{p.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TenantStatusList({ title, items, icon: Icon, iconColor }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={`${iconColor} shrink-0`} />
        <h3 className="font-semibold text-slate-800 text-sm">{title} ({items.length})</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.invoice_id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.tenant_name}</p>
                <p className="text-xs text-slate-400 truncate">{item.unit}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                  KES {formatCurrency(item.remaining_balance)}
                </p>
                <StatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
