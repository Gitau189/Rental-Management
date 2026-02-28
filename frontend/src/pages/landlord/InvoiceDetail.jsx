import { ArrowLeft, Download, Loader2, Plus, Receipt, Calendar, Home, User, FileText, CreditCard, CheckCircle, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { downloadBlob, errorMessage, formatCurrency, formatDate, monthName } from '../../utils/helpers'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
  { value: 'mpesa', label: 'M-Pesa', icon: CreditCard },
  { value: 'cheque', label: 'Cheque', icon: CreditCard },
  { value: 'other', label: 'Other', icon: CreditCard },
]

export default function InvoiceDetail() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ 
    amount: '', 
    payment_date: new Date().toISOString().slice(0, 10), 
    method: 'cash', 
    reference_number: '', 
    notes: '' 
  })
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const fetchAll = async () => {
    const [invRes, payRes] = await Promise.all([
      api.get(`/invoices/${id}/`),
      api.get(`/payments/?invoice=${id}`),
    ])
    setInvoice(invRes.data)
    setPayments(payRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  const handlePay = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/payments/', { 
        ...payForm, 
        invoice: parseInt(id), 
        amount: parseFloat(payForm.amount) 
      })
      toast.success('Payment recorded successfully')
      setPayModal(false)
      setPayForm({ 
        amount: '', 
        payment_date: new Date().toISOString().slice(0, 10), 
        method: 'cash', 
        reference_number: '', 
        notes: '' 
      })
      fetchAll()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const downloadInvoice = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/invoices/${id}/pdf/`, { responseType: 'blob' })
      downloadBlob(res.data, `invoice-${id}-${monthName(invoice.month)}-${invoice.year}.pdf`)
      toast.success('Invoice downloaded successfully')
    } catch {
      toast.error('Failed to download invoice')
    } finally {
      setDownloading(false)
    }
  }

  const downloadReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/payments/${paymentId}/receipt/`, { responseType: 'blob' })
      downloadBlob(res.data, `receipt-${paymentId}.pdf`)
      toast.success('Receipt downloaded successfully')
    } catch {
      toast.error('Failed to download receipt')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!invoice) return null

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'bg-green-50 text-green-700 border-green-200'
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'overdue': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              to="/landlord/invoices" 
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Invoice #{id.toString().padStart(6, '0')}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <p className="text-gray-500 mt-1 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                {monthName(invoice.month)} {invoice.year}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadInvoice} 
              disabled={downloading} 
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {downloading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Download size={16} className="mr-2" />
              )}
              Download PDF
            </button>
            {invoice.status !== 'paid' && (
              <button 
                onClick={() => setPayModal(true)} 
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <Plus size={16} className="mr-2" />
                Record Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Total Amount</p>
            <FileText size={20} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">KES {formatCurrency(invoice.total_amount)}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Amount Paid</p>
            <CheckCircle size={20} className="text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-600">KES {formatCurrency(invoice.amount_paid)}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Balance Due</p>
            <AlertCircle size={20} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-600">KES {formatCurrency(invoice.remaining_balance)}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Due Date</p>
            <Calendar size={20} className="text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-900">{formatDate(invoice.due_date)}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Tenant Information */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User size={18} className="text-gray-500" />
                Tenant Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {invoice.tenant?.first_name} {invoice.tenant?.last_name}
                </p>
                <p className="text-sm text-gray-500 mt-1">{invoice.tenant?.email}</p>
                <p className="text-sm text-gray-500">{invoice.tenant?.phone}</p>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Unit Details</p>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Home size={16} className="text-gray-400" />
                  {invoice.unit_display}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-gray-500" />
                Invoice Details
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Invoice Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(invoice.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Due Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(invoice.due_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Period</p>
                  <p className="text-sm font-medium text-gray-900">{monthName(invoice.month)} {invoice.year}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  <div>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charges Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Charge Breakdown</h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-4 text-sm text-gray-700">Base Rent</td>
                  <td className="py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(invoice.base_rent)}</td>
                </tr>
                {invoice.line_items?.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 text-sm text-gray-700">{item.description}</td>
                    <td className="py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr>
                  <td className="py-4 text-base font-semibold text-gray-900">Total</td>
                  <td className="py-4 text-right text-base font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="py-3 text-sm font-medium text-green-700">Amount Paid</td>
                  <td className="py-3 text-right text-sm font-bold text-green-700">{formatCurrency(invoice.amount_paid)}</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="py-3 text-sm font-medium text-red-700">Balance Due</td>
                  <td className="py-3 text-right text-sm font-bold text-red-700">{formatCurrency(invoice.remaining_balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Receipt size={18} className="text-gray-500" />
            Payment History
          </h2>
        </div>
        
        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No payments recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance After</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-700 whitespace-nowrap">KES {formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">{p.method.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.reference_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-red-600 whitespace-nowrap">KES {formatCurrency(p.balance_after)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => downloadReceipt(p.id)} 
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <Download size={12} className="mr-1" />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {invoice.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Additional Notes</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">{invoice.notes}</p>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment">
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Outstanding Balance: </span>
            <span className="text-lg font-bold">KES {formatCurrency(invoice.remaining_balance)}</span>
          </p>
        </div>
        
        <form onSubmit={handlePay} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (KES) <span className="text-red-500">*</span>
            </label>
            <input 
              type="number" 
              step="0.01" 
              min="0.01" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200" 
              required
              value={payForm.amount} 
              onChange={e => setPayForm({ ...payForm, amount: e.target.value })} 
              placeholder="0.00" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input 
              type="date" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200" 
              required 
              value={payForm.payment_date}
              onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200" 
              required 
              value={payForm.method}
              onChange={e => setPayForm({ ...payForm, method: e.target.value })}
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200" 
              value={payForm.reference_number}
              onChange={e => setPayForm({ ...payForm, reference_number: e.target.value })} 
              placeholder="e.g., MPesa transaction code" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200" 
              rows={3} 
              value={payForm.notes}
              onChange={e => setPayForm({ ...payForm, notes: e.target.value })} 
              placeholder="Add any additional notes..."
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setPayModal(false)} 
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {saving && <Loader2 size={16} className="animate-spin mr-2" />}
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}