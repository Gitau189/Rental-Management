import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  DollarSign,
  Home,
  TrendingUp,
} from "lucide-react"
import { useEffect, useState } from "react"
import LoadingSpinner from "../../components/LoadingSpinner"
import StatusBadge from "../../components/StatusBadge"
import api from "../../services/api"
import { formatCurrency, formatDate } from "../../utils/helpers"

/* ─────────────────────────────────────────
   METRIC CARD
───────────────────────────────────────── */
function MetricCard({ label, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: iconBg }}
      >
        <Icon size={18} color={iconColor} />
      </div>

      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  )
}

/* ─────────────────────────────────────────
   TENANT STATUS CARD
───────────────────────────────────────── */
function TenantStatusCard({
  title,
  items,
  icon: Icon,
  iconBg,
  iconColor,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: iconBg }}
          >
            <Icon size={16} color={iconColor} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {title}
          </h3>
        </div>
        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No records this month</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.invoice_id}
              className="flex justify-between items-start border-b last:border-0 pb-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {item.tenant_name}
                </p>
                <p className="text-xs text-slate-400">{item.unit}</p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">
                  KES {formatCurrency(item.remaining_balance)}
                </p>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────── */
export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get("/reports/dashboard/")
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  const {
    units,
    revenue_this_month,
    total_outstanding,
    current_month,
    recent_payments,
  } = data

  const monthNames = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {monthNames[current_month.month]} {current_month.year} overview
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Units"
          value={units.total}
          icon={Building2}
          iconBg="#eef2ff"
          iconColor="#4f46e5"
        />
        <MetricCard
          label="Occupied Units"
          value={units.occupied}
          icon={Home}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />
        <MetricCard
          label="Vacant Units"
          value={units.vacant}
          icon={Home}
          iconBg="#f1f5f9"
          iconColor="#64748b"
        />
        <MetricCard
          label="Revenue This Month"
          value={`KES ${formatCurrency(revenue_this_month)}`}
          icon={TrendingUp}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />
      </div>

      {/* Outstanding Highlight */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Total Outstanding Balance
          </p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            KES {formatCurrency(total_outstanding)}
          </p>
        </div>
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
          <DollarSign size={22} className="text-red-600" />
        </div>
      </div>

      {/* Payment Status */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          {monthNames[current_month.month]} Payment Status
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          <TenantStatusCard
            title="Paid"
            items={current_month.paid}
            icon={CheckCircle}
            iconBg="#ecfdf5"
            iconColor="#059669"
          />
          <TenantStatusCard
            title="Partially Paid / Overdue"
            items={current_month.partial}
            icon={Clock}
            iconBg="#fef9c3"
            iconColor="#b45309"
          />
          <TenantStatusCard
            title="Not Paid"
            items={current_month.unpaid}
            icon={AlertCircle}
            iconBg="#fee2e2"
            iconColor="#dc2626"
          />
        </div>
      </div>

      {/* Recent Payments */}
      {recent_payments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-slate-800">
              Recent Payments
            </h3>
            <span className="text-sm text-slate-400">
              {recent_payments.length} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-6 py-3 text-left">Tenant</th>
                  <th className="px-6 py-3 text-left">Unit</th>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Method</th>
                </tr>
              </thead>
              <tbody>
                {recent_payments.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-6 py-3 text-slate-400">
                      {i + 1}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {p.tenant_name}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {p.unit}
                    </td>
                    <td className="px-6 py-3 font-semibold text-emerald-600">
                      KES {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {p.method}
                    </td>
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