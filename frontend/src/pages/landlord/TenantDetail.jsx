import { ArrowLeft, Edit, FileText, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
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

  const fetchAll = async () => {
    const tRes = await api.get(`/tenants/${id}/`)
    const userId = tRes.data.user.id
    const [invRes, payRes] = await Promise.all([
      api.get(`/invoices/?tenant=${userId}`),
      api.get(`/payments/?tenant=${userId}`),
    ])
    setTenant(tRes.data)
    setInvoices(invRes.data)
    setPayments(payRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  const openEdit = () => {
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
      toast.success('Tenant updated.')
      setEditModal(false)
      fetchAll()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!tenant) return null

  const outstanding = parseFloat(tenant.outstanding_balance || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/landlord/tenants" className="btn-secondary !px-3 !py-2 shrink-0"><ArrowLeft size={16} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
            {tenant.user.first_name} {tenant.user.last_name}
          </h1>
          <p className="text-slate-500 text-sm truncate">{tenant.user.email}</p>
        </div>
        <button onClick={openEdit} className="btn-secondary shrink-0"><Edit size={16} /></button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <InfoItem label="Unit" value={tenant.unit_detail ? `${tenant.unit_detail.apartment_name} – ${tenant.unit_detail.unit_number}` : '—'} />
        <InfoItem label="Phone" value={tenant.user.phone || '—'} />
        <InfoItem label="ID Number" value={tenant.id_number} />
        <InfoItem label="Move-in Date" value={formatDate(tenant.move_in_date)} />
      </div>

      <div className="card">
        <p className="text-sm text-slate-500 mb-1">Total Outstanding Balance</p>
        <p className={`text-2xl sm:text-3xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-700'}`}>
          KES {formatCurrency(outstanding)}
        </p>
      </div>

      {/* Invoices */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 gap-3">
          <h2 className="font-semibold text-slate-900">Invoices</h2>
          <Link to={`/landlord/invoices/create?tenant=${id}`} className="btn-primary !py-2 text-xs shrink-0">
            <FileText size={14} /> New Invoice
          </Link>
        </div>
        {invoices.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-head py-3 px-4">Period</th>
                  <th className="table-head py-3 px-4">Total</th>
                  <th className="table-head py-3 px-4">Paid</th>
                  <th className="table-head py-3 px-4">Balance</th>
                  <th className="table-head py-3 px-4">Due</th>
                  <th className="table-head py-3 px-4">Status</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="table-cell px-4 font-medium whitespace-nowrap">{monthName(inv.month)} {inv.year}</td>
                    <td className="table-cell px-4 whitespace-nowrap">KES {formatCurrency(inv.total_amount)}</td>
                    <td className="table-cell px-4 text-green-700 whitespace-nowrap">KES {formatCurrency(inv.amount_paid)}</td>
                    <td className="table-cell px-4 text-red-600 font-semibold whitespace-nowrap">KES {formatCurrency(inv.remaining_balance)}</td>
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
        )}
      </div>

      {/* Payment history */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Payment History</h2>
        </div>
        {payments.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-head py-3 px-4">Date</th>
                  <th className="table-head py-3 px-4">Invoice</th>
                  <th className="table-head py-3 px-4">Amount</th>
                  <th className="table-head py-3 px-4">Method</th>
                  <th className="table-head py-3 px-4">Reference</th>
                  <th className="table-head py-3 px-4">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="table-cell px-4 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                    <td className="table-cell px-4 text-slate-500">{p.invoice_display}</td>
                    <td className="table-cell px-4 font-semibold text-green-700 whitespace-nowrap">KES {formatCurrency(p.amount)}</td>
                    <td className="table-cell px-4">{p.method}</td>
                    <td className="table-cell px-4 text-slate-500">{p.reference_number || '—'}</td>
                    <td className="table-cell px-4 text-red-600 whitespace-nowrap">KES {formatCurrency(p.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Tenant">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name || ''} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name || ''} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">ID Number</label>
            <input className="input" value={form.id_number || ''} onChange={e => setForm({ ...form, id_number: e.target.value })} />
          </div>
          <div>
            <label className="label">Move-in Date</label>
            <input type="date" className="input" value={form.move_in_date || ''} onChange={e => setForm({ ...form, move_in_date: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active || false} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
            <span className="font-medium text-slate-700">Active tenant</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary">Cancel</button>
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

function InfoItem({ label, value }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">{value}</p>
    </div>
  )
}
