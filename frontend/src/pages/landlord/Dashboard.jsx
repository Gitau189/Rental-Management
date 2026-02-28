import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  Home,
  TrendingUp,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
} from "lucide-react"
import { FaRegMoneyBillAlt } from 'react-icons/fa'
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import LoadingSpinner from "../../components/LoadingSpinner"
import StatusBadge from "../../components/StatusBadge"
import api from "../../services/api"
import { formatCurrency, formatDate } from "../../utils/helpers"

/* ─────────────────────────────────────────
   METRIC CARD
───────────────────────────────────────── */
function MetricCard({ label, value, icon: Icon, iconBg, iconColor, trend, trendValue }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
          style={{ background: iconBg }}
        >
          <Icon size={20} color={iconColor} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trendValue}
          </div>
        )}
      </div>

      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
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
  totalAmount,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: iconBg }}
            >
              <Icon size={16} color={iconColor} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {totalAmount !== undefined && (
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                KES {formatCurrency(totalAmount)}
              </span>
            )}
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
              {items.length}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No records this month</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {items.map((item) => (
              <div
                key={item.invoice_id}
                className="group flex justify-between items-start p-3 rounded-xl hover:bg-gray-50 transition-all duration-150 cursor-pointer"
                onClick={() => window.location.href = `/landlord/invoices/${item.invoice_id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.tenant_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Home size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500 truncate">{item.unit}</p>
                  </div>
                </div>

                <div className="text-right ml-3">
                  <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                    KES {formatCurrency(item.remaining_balance)}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
    upcoming_due_dates,
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

  const occupancyRate = ((units.occupied / units.total) * 100).toFixed(1)
  const collectionRate = ((revenue_this_month / (revenue_this_month + total_outstanding)) * 100).toFixed(1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              {monthNames[current_month.month]} {current_month.year} Overview
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Units"
            value={units.total}
            icon={Building2}
            iconBg="#eef2ff"
            iconColor="#4f46e5"
            trend="up"
            trendValue="+2 this month"
          />
          <MetricCard
            label="Occupied Units"
            value={`${units.occupied} (${occupancyRate}%)`}
            icon={Home}
            iconBg="#ecfdf5"
            iconColor="#059669"
            trend={occupancyRate > 80 ? 'up' : 'down'}
            trendValue={`${occupancyRate}%`}
          />
          <MetricCard
            label="Vacant Units"
            value={units.vacant}
            icon={Home}
            iconBg="#f1f5f9"
            iconColor="#64748b"
          />
          <MetricCard
            label="Monthly Revenue"
            value={`KES ${formatCurrency(revenue_this_month)}`}
            icon={TrendingUp}
            iconBg="#ecfdf5"
            iconColor="#059669"
            trend="up"
            trendValue={`${collectionRate}% collected`}
          />
        </div>

        {/* Outstanding and Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Outstanding Balance */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-red-100 text-sm font-medium uppercase tracking-wider">
                  Total Outstanding Balance
                </p>
                <p className="text-4xl font-bold mt-3">
                  KES {formatCurrency(total_outstanding)}
                </p>
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <FaRegMoneyBillAlt size={24} className="text-white" />
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-red-100">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{current_month.unpaid.length} overdue invoices</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle size={14} />
                <span>{current_month.partial.length} partial payments</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/landlord/invoices/create"
                className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 group"
              >
                <CreditCard size={24} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-gray-900">Create Invoice</p>
                <p className="text-xs text-gray-500 mt-1">Bill a tenant</p>
              </Link>
              <Link
                to="/landlord/tenants"
                className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-all duration-200 group"
              >
                <Users size={24} className="text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-gray-900">Manage Tenants</p>
                <p className="text-xs text-gray-500 mt-1">Add or update</p>
              </Link>
              <Link
                to="/landlord/reports"
                className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all duration-200 group"
              >
                <TrendingUp size={24} className="text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-gray-900">View Reports</p>
                <p className="text-xs text-gray-500 mt-1">Financial insights</p>
              </Link>
              <Link
                to="/landlord/properties"
                className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl hover:from-orange-100 hover:to-amber-100 transition-all duration-200 group"
              >
                <Building2 size={24} className="text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-gray-900">Properties</p>
                <p className="text-xs text-gray-500 mt-1">Manage units</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {monthNames[current_month.month]} Payment Status
            </h2>
            <Link 
              to="/landlord/invoices"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all invoices
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <TenantStatusCard
              title="Paid"
              items={current_month.paid}
              icon={CheckCircle}
              iconBg="#ecfdf5"
              iconColor="#059669"
              totalAmount={current_month.paid.reduce((sum, item) => sum + item.remaining_balance, 0)}
            />
            <TenantStatusCard
              title="Partial / Overdue"
              items={current_month.partial}
              icon={Clock}
              iconBg="#fef9c3"
              iconColor="#b45309"
              totalAmount={current_month.partial.reduce((sum, item) => sum + item.remaining_balance, 0)}
            />
            <TenantStatusCard
              title="Not Paid"
              items={current_month.unpaid}
              icon={AlertCircle}
              iconBg="#fee2e2"
              iconColor="#dc2626"
              totalAmount={current_month.unpaid.reduce((sum, item) => sum + item.remaining_balance, 0)}
            />
          </div>
        </div>

        {/* Recent Payments & Upcoming Due Dates */}
        <div className="grid gap-6 lg:grid-cols-1">
          {/* Recent Payments */}
          {recent_payments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Recent Payments
                    </h3>
                  </div>
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    Last {recent_payments.length} payments
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-medium">
                    <tr>
                      <th className="px-6 py-3 text-left">Tenant</th>
                      <th className="px-6 py-3 text-left">Unit</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recent_payments.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {p.tenant_name}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {p.unit}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600">
                          KES {formatCurrency(p.amount)}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {formatDate(p.payment_date)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                            {p.method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upcoming Due Dates */}
          {upcoming_due_dates && upcoming_due_dates.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Clock size={16} className="text-yellow-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Upcoming Due Dates
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {upcoming_due_dates.map((item) => (
                  <div
                    key={item.invoice_id}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors duration-150 cursor-pointer"
                    onClick={() => window.location.href = `/landlord/invoices/${item.invoice_id}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.tenant_name}</p>
                      <p className="text-xs text-gray-500 mt-1">Unit {item.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-yellow-700">
                        KES {formatCurrency(item.amount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {formatDate(item.due_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}