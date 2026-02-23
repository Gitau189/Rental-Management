import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { formatCurrency, formatDate, monthName } from '../../utils/helpers'

export default function TenantInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tenant/invoices/').then(r => setInvoices(r.data)).finally(() => setLoading(false))
  }, [])

  const totalOutstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + parseFloat(i.remaining_balance || 0), 0)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Invoices</h1>

      {invoices.length > 0 && (
        <div className="card">
          <p className="text-sm text-slate-500">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600">KES {formatCurrency(totalOutstanding)}</p>
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Your invoices will appear here once your landlord creates them."
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              to={`/tenant/invoices/${inv.id}`}
              className="card hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {monthName(inv.month)} {inv.year}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">{inv.unit_display}</p>
                </div>
                <StatusBadge status={inv.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Total Amount</p>
                  <p className="font-semibold text-slate-800">KES {formatCurrency(inv.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Amount Paid</p>
                  <p className="font-semibold text-green-700">KES {formatCurrency(inv.amount_paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Balance Due</p>
                  <p className={`font-semibold ${parseFloat(inv.remaining_balance) > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    KES {formatCurrency(inv.remaining_balance)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>Invoice date: {formatDate(inv.invoice_date)}</span>
                <span>Due: {formatDate(inv.due_date)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
