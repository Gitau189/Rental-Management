import { ArrowLeft, Edit, FileText, Loader2, AlertCircle, Wallet, Trash2 } from 'lucide-react'
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
  const [deleteModal, setDeleteModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' }) // Default sort for tables

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

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/tenants/${id}/`)
      toast.success('Tenant deleted successfully.')
      // Redirect to tenants list after delete
      window.location.href = '/landlord/tenants'
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setDeleting(false)
      setDeleteModal(false)
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

  const sortedInvoices = useMemo(() => {
    let sorted = [...invoices]
    sorted.sort((a, b) => {
      let aValue, bValue
      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.due_date)
          bValue = new Date(b.due_date)
          break
        case 'amount':
          aValue = parseFloat(a.total_amount)
          bValue = parseFloat(b.total_amount)
          break
        default:
          return 0
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [invoices, sortConfig])

  const sortedPayments = useMemo(() => {
    let sorted = [...payments]
    sorted.sort((a, b) => {
      let aValue, bValue
      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.payment_date)
          bValue = new Date(b.payment_date)
          break
        case 'amount':
          aValue = parseFloat(a.amount)
          bValue = parseFloat(b.amount)
          break
        default:
          return 0
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [payments, sortConfig])

  const requestSort = (key, table) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  if (loading) return <LoadingSpinner />
  if (!tenant) return null

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Link to="/landlord/tenants" className="btn-secondary px-3 py-2 rounded-lg">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {tenant.user.first_name} {tenant.user.last_name}
              </h1>
              <StatusBadge status={tenant.is_active ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <p className="text-sm text-slate-500">{tenant.user.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={openEdit} className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-lg">
            <Edit size={16} /> Edit
          </button>
          <button onClick={() => setDeleteModal(true)} className="btn-danger flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          icon={Wallet}
          label="Outstanding Balance"
          value={outstanding}
          color={outstanding > 0 ? 'red' : 'green'}
        />
        <SummaryCard
          icon={FileText}
          label="Total Invoiced"
          value={totalInvoiced}
          color="blue"
        />
        <SummaryCard
          icon={Wallet}
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
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          >
            <FileText size={16} /> New Invoice
          </Link>
        }
      />

      <TableCard>
        {sortedInvoices.length === 0 ? (
          <EmptyState message="No invoices yet." />
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <TableHead onClick={() => requestSort('date')}>Period {getSortIcon('date')}</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead onClick={() => requestSort('date')}>Due {getSortIcon('date')}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {sortedInvoices.map(inv => (
                <tr
                  key={inv.id}
                  className={`hover:bg-slate-50 transition ${inv.status === 'OVERDUE' ? 'bg-red-50' : ''}`}
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
                      className="text-primary-600 hover:text-primary-800 font-medium text-sm"
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
        {sortedPayments.length === 0 ? (
          <EmptyState message="No payments recorded yet." />
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <TableHead onClick={() => requestSort('date')}>Date {getSortIcon('date')}</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead onClick={() => requestSort('amount')}>Amount {getSortIcon('amount')}</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Balance After</TableHead>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {sortedPayments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
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
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Tenant Details" size="md">
        <form onSubmit={handleEdit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="First Name" value={form.first_name} onChange={v => updateForm('first_name', v)} required />
            <Input label="Last Name" value={form.last_name} onChange={v => updateForm('last_name', v)} required />
          </div>

          <Input label="Phone" value={form.phone} onChange={v => updateForm('phone', v)} />
          <Input label="ID Number" value={form.id_number} onChange={v => updateForm('id_number', v)} />
          <Input type="date" label="Move-in Date" value={form.move_in_date} onChange={v => updateForm('move_in_date', v)} />

          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active || false}
              onChange={e => updateForm('is_active', e.target.checked)}
              className="rounded border-slate-300"
            />
            Active tenant
          </label>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary px-4 py-2 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg">
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Tenant" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this tenant? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteModal(false)} className="btn-secondary px-4 py-2 rounded-lg">
              Cancel
            </button>
            <button 
              onClick={handleDelete} 
              disabled={deleting} 
              className="btn-danger flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              {deleting && <Loader2 size={15} className="animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ---------- UI Components ---------- */

function InfoItem({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <p className="font-semibold text-slate-900 truncate text-sm md:text-base">{value}</p>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color }) {
  const colors = {
    red: 'text-red-600',
    green: 'text-green-700',
    blue: 'text-blue-700'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 border border-slate-100">
      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100">
        <Icon size={20} className={colors[color]} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</p>
        <p className={`text-xl font-bold ${colors[color]}`}>
          KES {formatCurrency(value)}
        </p>
      </div>
    </div>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {action}
    </div>
  )
}

function TableCard({ children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  )
}

function TableHead({ children, onClick }) {
  return (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
      onClick={onClick}
    >
      {children}
    </th>
  )
}

function TableCell({ children, className = '' }) {
  return <td className={`px-6 py-4 whitespace-nowrap text-sm text-slate-900 ${className}`}>{children}</td>
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
      <AlertCircle size={32} className="mb-3 opacity-50" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

function Input({ label, type = 'text', value, onChange, required = false }) {
  return (
    <div>
      <label className="label text-sm font-medium text-slate-700">{label}{required && ' *'}</label>
      <input
        type={type}
        className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required={required}
      />
    </div>
  )
}