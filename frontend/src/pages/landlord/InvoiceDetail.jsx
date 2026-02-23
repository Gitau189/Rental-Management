import { ArrowLeft, Download, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { downloadBlob, errorMessage, formatCurrency, formatDate, monthName } from '../../utils/helpers'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

export default function InvoiceDetail() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'cash', reference_number: '', notes: '' })
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
      await api.post('/payments/', { ...payForm, invoice: parseInt(id), amount: parseFloat(payForm.amount) })
      toast.success('Payment recorded.')
      setPayModal(false)
      setPayForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'cash', reference_number: '', notes: '' })
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
    } catch {
      toast.error('Failed to download invoice.')
    } finally {
      setDownloading(false)
    }
  }

  const downloadReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/payments/${paymentId}/receipt/`, { responseType: 'blob' })
      downloadBlob(res.data, `receipt-${paymentId}.pdf`)
    } catch {
      toast.error('Failed to download receipt.')
    }
  }

  if (loading) return <LoadingSpinner />
  if (!invoice) return null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/landlord/invoices" className="btn-secondary !px-3 !py-2 shrink-0"><ArrowLeft size={16} /></Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Invoice #{id.toString().padStart(5, '0')}
            </h1>
            <p className="text-slate-500 text-sm">{monthName(invoice.month)} {invoice.year}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={downloadInvoice} disabled={downloading} className="btn-secondary">
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span className="hidden sm:inline">PDF</span>
          </button>
          {invoice.status !== 'paid' && (
            <button onClick={() => setPayModal(true)} className="btn-primary">
              <Plus size={15} /> <span className="hidden sm:inline">Record </span>Payment
            </button>
          )}
        </div>
      </div>

      {/* Invoice info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tenant</p>
          <div>
            <p className="font-semibold text-slate-900">{invoice.tenant?.first_name} {invoice.tenant?.last_name}</p>
            <p className="text-sm text-slate-500">{invoice.tenant?.email}</p>
            <p className="text-sm text-slate-500">{invoice.tenant?.phone}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Unit</p>
            <p className="font-medium text-slate-700">{invoice.unit_display}</p>
          </div>
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice Info</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-slate-400 text-xs">Invoice Date</p><p className="font-medium">{formatDate(invoice.invoice_date)}</p></div>
            <div><p className="text-slate-400 text-xs">Due Date</p><p className="font-medium">{formatDate(invoice.due_date)}</p></div>
            <div><p className="text-slate-400 text-xs">Period</p><p className="font-medium">{monthName(invoice.month)} {invoice.year}</p></div>
            <div><p className="text-slate-400 text-xs">Status</p><div className="mt-0.5"><StatusBadge status={invoice.status} /></div></div>
          </div>
        </div>
      </div>

      {/* Charges */}
      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Charges</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="table-head py-2 text-left">Description</th>
                <th className="table-head py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 text-sm text-slate-700">Base Rent</td>
                <td className="py-3 text-sm text-right font-medium whitespace-nowrap">KES {formatCurrency(invoice.base_rent)}</td>
              </tr>
              {invoice.line_items?.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 text-sm text-slate-700">{item.description}</td>
                  <td className="py-3 text-sm text-right whitespace-nowrap">KES {formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td className="py-3 font-semibold text-slate-900">Total</td>
                <td className="py-3 text-right font-bold text-slate-900 whitespace-nowrap">KES {formatCurrency(invoice.total_amount)}</td>
              </tr>
              <tr>
                <td className="py-1 text-sm text-green-700">Amount Paid</td>
                <td className="py-1 text-right text-sm text-green-700 whitespace-nowrap">KES {formatCurrency(invoice.amount_paid)}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-red-700">Balance Due</td>
                <td className="py-1 text-right font-bold text-red-700 text-lg whitespace-nowrap">KES {formatCurrency(invoice.remaining_balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payments */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Payment History</h2>
        </div>
        {payments.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-head py-3 px-4">Date</th>
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
                    <td className="table-cell px-4 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                    <td className="table-cell px-4 font-semibold text-green-700 whitespace-nowrap">KES {formatCurrency(p.amount)}</td>
                    <td className="table-cell px-4">{p.method}</td>
                    <td className="table-cell px-4 text-slate-500">{p.reference_number || '—'}</td>
                    <td className="table-cell px-4 text-red-600 whitespace-nowrap">KES {formatCurrency(p.balance_after)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadReceipt(p.id)} className="text-primary-700 hover:underline text-sm font-medium flex items-center gap-1 whitespace-nowrap">
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

      {invoice.notes && (
        <div className="card">
          <p className="text-xs text-slate-400 mb-1">Notes</p>
          <p className="text-sm text-slate-700">{invoice.notes}</p>
        </div>
      )}

      {/* Record payment modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment">
        <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
          <span className="text-slate-500">Outstanding: </span>
          <span className="font-bold text-red-600">KES {formatCurrency(invoice.remaining_balance)}</span>
        </div>
        <form onSubmit={handlePay} className="space-y-4">
          <div>
            <label className="label">Amount (KES) *</label>
            <input type="number" step="0.01" min="0.01" className="input" required
              value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Payment Date *</label>
            <input type="date" className="input" required value={payForm.payment_date}
              onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Payment Method *</label>
            <select className="input" required value={payForm.method}
              onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reference Number</label>
            <input className="input" value={payForm.reference_number}
              onChange={e => setPayForm({ ...payForm, reference_number: e.target.value })} placeholder="e.g. MPesa transaction code" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={payForm.notes}
              onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setPayModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={15} className="animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
