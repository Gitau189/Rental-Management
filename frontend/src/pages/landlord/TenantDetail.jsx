import { ArrowLeft, Edit, FileText, Loader2, AlertCircle, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { errorMessage, formatCurrency, formatDate, monthName } from '../../utils/helpers'

export default function TenantDetail() {
  const { id } = useParams()
  const [tenant, setTenant] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const updateForm = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const fetchAll = async () => {
    setLoading(true)
    try {
      const tRes = await api.get(`/tenants/${id}/`)
      const userId = tRes.data.user.id

      const [invRes, payRes] = await Promise.all([
        api.get(`/invoices/?tenant=${userId}`),
        api.get(`/payments/?tenant=${userId}`),
      ])

      setTenant(tRes.data)
      setInvoices(invRes.data)
      setPayments(payRes.data)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [id])

  const openEdit = () => {
    if (!tenant?.user) return
    setForm({
      first_name: tenant.user.first_name,
      last_name: tenant.user.last_name,
      phone: tenant.user.phone || '',
      id_number: tenant.id_number,
      move_in_date: tenant.move_in_date,
      is_active: tenant.is_active,
    })
    setEditModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/tenants/${id}/`, form)
      toast.success('Tenant updated successfully.')
      setEditModal(false)
      fetchAll()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const outstanding = useMemo(
    () => parseFloat(tenant?.outstanding_balance || 0),
    [tenant]
  )

  const totalInvoiced = useMemo(
    () => invoices.reduce((sum, i) => sum + parseFloat(i.total_amount), 0),
    [invoices]
  )

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
    [payments]
  )

  if (loading) return <LoadingSpinner />
  if (!tenant) return null

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/landlord/tenants" className="btn-secondary !px-3 !py-2">
          <ArrowLeft size={16} />
        </Link>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {tenant.user.first_name} {tenant.user.last_name}
            </h1>
            <StatusBadge status={tenant.is_active ? 'ACTIVE' : 'INACTIVE'} />
          </div>
          <p className="text-slate-500 text-sm">{tenant.user.email}</p>
        </div>

        <button onClick={openEdit} className="btn-secondary">
          <Edit size={16} />
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoItem label="Unit" value={
          tenant.unit_detail
            ? `${tenant.unit_detail.apartment_name} – ${tenant.unit_detail.unit_number}`
            : '—'
        } />
        <InfoItem label="Phone" value={tenant.user.phone || '—'} />
        <InfoItem label="ID Number" value={tenant.id_number} />
        <InfoItem label="Move-in Date" value={formatDate(tenant.move_in_date)} />
      </div>

      {/* Financial Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Outstanding"
          value={outstanding}
          color={outstanding > 0 ? 'red' : 'green'}
        />
        <SummaryCard
          label="Total Invoiced"
          value={totalInvoiced}
          color="blue"
        />
        <SummaryCard
          label="Total Paid"
          value={totalPaid}
          color="green"
        />
      </div>

      {/* Invoices */}
      <SectionHeader
        title="Invoices"
        action={
          <Link
            to={`/landlord/invoices/create?tenant=${id}`}
            className="btn-primary !py-2 text-xs"
          >
            <FileText size={14} /> New Invoice
          </Link>
        }
      />

      <TableCard>
        {invoices.length === 0 ? (
          <EmptyState message="No invoices yet." />
        ) : (
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <TableHead>Period</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map(inv => (
                <tr
                  key={inv.id}
                  className={`hover:bg-slate-50 ${
                    inv.status === 'OVERDUE' ? 'bg-red-50' : ''
                  }`}
                >
                  <TableCell>{monthName(inv.month)} {inv.year}</TableCell>
                  <TableCell>KES {formatCurrency(inv.total_amount)}</TableCell>
                  <TableCell className="text-green-700">
                    KES {formatCurrency(inv.amount_paid)}
                  </TableCell>
                  <TableCell className="text-red-600 font-semibold">
                    KES {formatCurrency(inv.remaining_balance)}
                  </TableCell>
                  <TableCell>{formatDate(inv.due_date)}</TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell>
                    <Link
                      to={`/landlord/invoices/${inv.id}`}
                      className="text-primary-700 hover:underline text-sm font-medium"
                    >
                      View
                    </Link>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      {/* Payments */}
      <SectionHeader title="Payment History" />

      <TableCard>
        {payments.length === 0 ? (
          <EmptyState message="No payments recorded yet." />
        ) : (
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Balance After</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <TableCell>{formatDate(p.payment_date)}</TableCell>
                  <TableCell>{p.invoice_display}</TableCell>
                  <TableCell className="font-semibold text-green-700">
                    KES {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>{p.reference_number || '—'}</TableCell>
                  <TableCell className="text-red-600">
                    KES {formatCurrency(p.balance_after)}
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Tenant">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="First Name" value={form.first_name} onChange={v => updateForm('first_name', v)} />
            <Input label="Last Name" value={form.last_name} onChange={v => updateForm('last_name', v)} />
          </div>

          <Input label="Phone" value={form.phone} onChange={v => updateForm('phone', v)} />
          <Input label="ID Number" value={form.id_number} onChange={v => updateForm('id_number', v)} />
          <Input type="date" label="Move-in Date" value={form.move_in_date} onChange={v => updateForm('move_in_date', v)} />

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active || false}
              onChange={e => updateForm('is_active', e.target.checked)}
            />
            Active tenant
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* ---------- UI Components ---------- */

function InfoItem({ label, value }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-semibold text-slate-900 truncate">{value}</p>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  const colors = {
    red: 'text-red-600',
    green: 'text-green-700',
    blue: 'text-blue-700'
  }

  return (
    <div className="card">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>
        KES {formatCurrency(value)}
      </p>
    </div>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {action}
    </div>
  )
}

function TableCard({ children }) {
  return (
    <div className="card p-0 overflow-hidden overflow-x-auto">
      {children}
    </div>
  )
}

function TableHead({ children }) {
  return <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{children}</th>
}

function TableCell({ children, className = '' }) {
  return <td className={`px-4 py-3 text-sm text-slate-700 ${className}`}>{children}</td>
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm">
      <AlertCircle size={28} className="mb-2 opacity-40" />
      {message}
    </div>
  )
}

function Input({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}