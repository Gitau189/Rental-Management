import { FileText, Filter, Plus, Search, Calendar, Home, Users, ChevronDown, X } from 'lucide-react'
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
  const [showFilters, setShowFilters] = useState(false)

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

  const clearFilters = () => {
    setFilters({ apartment: '', unit: '', month: '', year: '', status: '' })
    setSearch('')
  }

  const getSummaryStats = () => {
    const total = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
    const paid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0)
    const overdue = invoices.filter(inv => inv.status === 'overdue').length
    const pending = invoices.filter(inv => inv.status === 'pending' || inv.status === 'partial').length
    return { total, paid, overdue, pending }
  }

  const stats = getSummaryStats()

  

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Invoices</h1>
            <p className="text-gray-500 text-base">Manage and track tenant invoices</p>
          </div>
          <Link 
            to="/landlord/invoices/create" 
            className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg shadow-blue-200"
          >
            <Plus size={18} className="mr-2" />
            Create New Invoice
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Total Invoices</p>
            <div className="p-2 bg-blue-50 rounded-xl">
              <FileText size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{invoices.length}</p>
          <p className="text-xs text-gray-400 mt-2">All time invoices</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Total Amount</p>
            <div className="p-2 bg-purple-50 rounded-xl">
              <Calendar size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">KES {formatCurrency(stats.total)}</p>
          <p className="text-xs text-gray-400 mt-2">Total invoice value</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Amount Collected</p>
            <div className="p-2 bg-green-50 rounded-xl">
              <Users size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">KES {formatCurrency(stats.paid)}</p>
          <p className="text-xs text-gray-400 mt-2">{((stats.paid/stats.total)*100).toFixed(1)}% collected</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Overdue</p>
            <div className="p-2 bg-red-50 rounded-xl">
              <Home size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
          <p className="text-xs text-gray-400 mt-2">{stats.pending} pending invoices</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
        <div 
          className="px-6 py-4 bg-gray-50/50 cursor-pointer sm:cursor-default"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white rounded-lg shadow-sm">
                <Filter size={18} className="text-gray-600" />
              </div>
              <span className="font-semibold text-gray-700">Filter Invoices</span>
              {(filters.apartment || filters.month || filters.year || filters.status || search) && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Active filters
                </span>
              )}
            </div>
            <ChevronDown 
              size={20} 
              className={`text-gray-500 transition-transform duration-200 sm:hidden ${showFilters ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
        
        <div className={`p-6 border-t border-gray-100 ${showFilters ? 'block' : 'hidden sm:block'}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Property</label>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                value={filters.apartment} 
                onChange={e => setFilters({ ...filters, apartment: e.target.value })}
              >
                <option value="">All Properties</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Month</label>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                value={filters.month} 
                onChange={e => setFilters({ ...filters, month: e.target.value })}
              >
                <option value="">All Months</option>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Year</label>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                value={filters.year} 
                onChange={e => setFilters({ ...filters, year: e.target.value })}
              >
                <option value="">All Years</option>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
              <select 
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                value={filters.status} 
                onChange={e => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  placeholder="Search tenant or unit..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
            </div>
          </div>
          
          {(filters.apartment || filters.month || filters.year || filters.status || search) && (
            <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
              <button 
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                <X size={16} />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
          Showing <span className="font-semibold text-gray-900">{filtered.length}</span> invoices
          {filtered.length !== invoices.length && (
            <span className="text-gray-400"> out of {invoices.length} total</span>
          )}
        </p>
      </div>

      {/* Invoices Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={invoices.length === 0 
            ? "Get started by creating your first invoice for a tenant." 
            : "Try adjusting your filters to see more results."}
          action={
            <Link 
              to="/landlord/invoices/create" 
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200"
            >
              <Plus size={16} className="mr-2" />
              Create Invoice
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant / Unit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors duration-150 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono font-medium text-gray-400 bg-gray-100 px-2.5 py-1.5 rounded-lg group-hover:bg-gray-200 transition-colors duration-150">
                        #{inv.id.toString().padStart(6, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{inv.tenant_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Home size={12} className="text-gray-400" />
                          {inv.unit_display}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-700 font-medium">{monthName(inv.month)} {inv.year}</p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-900">KES {formatCurrency(inv.total_amount)}</p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className="text-sm font-semibold text-green-600">KES {formatCurrency(inv.amount_paid)}</p>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <p className={`text-sm font-bold ${
                        inv.remaining_balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        KES {formatCurrency(inv.remaining_balance)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className={`text-sm font-medium ${
                        new Date(inv.due_date) < new Date() && inv.status !== 'paid' 
                          ? 'text-red-600' 
                          : 'text-gray-700'
                      }`}>
                        {formatDate(inv.due_date)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Quick Pay removed */}
                        <Link 
                          to={`/landlord/invoices/${inv.id}`} 
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors duration-200"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Pay UI removed */}
    </div>
  )
}