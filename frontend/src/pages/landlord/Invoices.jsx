import { FileText, Filter, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { formatCurrency, formatDate, MONTHS, monthName } from '../../utils/helpers'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ apartment: '', unit: '', month: '', year: '', status: '' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/invoices/'),
      api.get('/apartments/'),
    ]).then(([invRes, aptRes]) => {
      setInvoices(invRes.data)
      setApartments(aptRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const applyFilters = () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    api.get(`/invoices/?${params.toString()}`).then(r => setInvoices(r.data))
  }

  useEffect(() => { if (!loading) applyFilters() }, [filters])

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    return !q || inv.tenant_name?.toLowerCase().includes(q) || inv.unit_display?.toLowerCase().includes(q)
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Invoices</h1>
        <Link to="/landlord/invoices/create" className="btn-primary shrink-0">
          <Plus size={16} /> Create Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter size={15} /> Filters
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select className="input text-sm" value={filters.apartment} onChange={e => setFilters({ ...filters, apartment: e.target.value })}>
            <option value="">All Properties</option>
            {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="input text-sm" value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })}>
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select className="input text-sm" value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })}>
            <option value="">All Years</option>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input text-sm" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input text-sm pl-9" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description="Create your first invoice for a tenant."
          action={<Link to="/landlord/invoices/create" className="btn-primary">Create Invoice</Link>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-head py-3 px-4">#</th>
                  <th className="table-head py-3 px-4">Tenant / Unit</th>
                  <th className="table-head py-3 px-4">Period</th>
                  <th className="table-head py-3 px-4">Total</th>
                  <th className="table-head py-3 px-4">Paid</th>
                  <th className="table-head py-3 px-4">Balance</th>
                  <th className="table-head py-3 px-4">Due Date</th>
                  <th className="table-head py-3 px-4">Status</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="table-cell px-4 text-slate-400 text-xs whitespace-nowrap">#{inv.id.toString().padStart(5, '0')}</td>
                    <td className="table-cell px-4">
                      <p className="font-medium text-slate-900 whitespace-nowrap">{inv.tenant_name}</p>
                      <p className="text-xs text-slate-400">{inv.unit_display}</p>
                    </td>
                    <td className="table-cell px-4 whitespace-nowrap">{monthName(inv.month)} {inv.year}</td>
                    <td className="table-cell px-4 whitespace-nowrap">KES {formatCurrency(inv.total_amount)}</td>
                    <td className="table-cell px-4 text-green-700 whitespace-nowrap">KES {formatCurrency(inv.amount_paid)}</td>
                    <td className="table-cell px-4 font-semibold text-red-600 whitespace-nowrap">
                      KES {formatCurrency(inv.remaining_balance)}
                    </td>
                    <td className="table-cell px-4 whitespace-nowrap">{formatDate(inv.due_date)}</td>
                    <td className="table-cell px-4"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/landlord/invoices/${inv.id}`} className="text-primary-700 hover:underline text-sm font-medium whitespace-nowrap">View</Link>
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
