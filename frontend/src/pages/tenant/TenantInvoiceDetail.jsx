import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { downloadBlob, formatCurrency, formatDate, monthName } from '../../utils/helpers'

export default function TenantInvoiceDetail() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/tenant/invoices/${id}/`),
      api.get(`/tenant/payments/`),
    ]).then(([invRes, payRes]) => {
      setInvoice(invRes.data)
      setPayments(payRes.data.filter(p => p.invoice === parseInt(id)))
    }).finally(() => setLoading(false))
  }, [id])

  const downloadInvoice = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/tenant/invoices/${id}/pdf/`, { responseType: 'blob' })
      downloadBlob(res.data, `invoice-${id}.pdf`)
    } catch {
      toast.error('Failed to download invoice.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!invoice) return null

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/tenant/invoices" className="btn-secondary !px-3 !py-2"><ArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Invoice – {monthName(invoice.month)} {invoice.year}
            </h1>
            <p className="text-slate-500 text-sm">{invoice.unit_display}</p>
          </div>
        </div>
        <button onClick={downloadInvoice} disabled={downloading} className="btn-secondary">
          {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Download PDF
        </button>
      </div>

      {/* Status and dates */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <StatusBadge status={invoice.status} />
          <div className="text-right text-sm text-slate-500">
            <p>Invoice date: {formatDate(invoice.invoice_date)}</p>
            <p>Due: {formatDate(invoice.due_date)}</p>
          </div>
        </div>

        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Total Billed</p>
            <p className="font-bold text-slate-900">KES {formatCurrency(invoice.total_amount)}</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Amount Paid</p>
            <p className="font-bold text-green-700">KES {formatCurrency(invoice.amount_paid)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Balance Due</p>
            <p className={`font-bold ${parseFloat(invoice.remaining_balance) > 0 ? 'text-red-600' : 'text-green-700'}`}>
              KES {formatCurrency(invoice.remaining_balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Charges breakdown */}
      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Charges</h2>
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
              <td className="py-3 text-sm text-right font-medium">KES {formatCurrency(invoice.base_rent)}</td>
            </tr>
            {invoice.line_items?.map((item) => (
              <tr key={item.id}>
                <td className="py-3 text-sm text-slate-700">{item.description}</td>
                <td className="py-3 text-sm text-right">KES {formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200">
              <td className="py-3 font-bold text-slate-900">Total</td>
              <td className="py-3 text-right font-bold text-slate-900">KES {formatCurrency(invoice.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payments received */}
      {payments.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-4">Payments Received</h2>
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{formatDate(p.payment_date)}</p>
                  <p className="text-xs text-slate-500">{p.method}{p.reference_number ? ` · ${p.reference_number}` : ''}</p>
                </div>
                <p className="font-semibold text-green-700">KES {formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className="card">
          <p className="text-xs text-slate-400 mb-1">Notes</p>
          <p className="text-sm text-slate-700">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
