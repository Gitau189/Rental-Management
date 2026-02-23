import { Loader2, Plus, Search, User, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { errorMessage, formatCurrency, formatDate } from '../../utils/helpers'

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', phone: '',
  password: '', unit: '', id_number: '', move_in_date: '',
}

export default function Tenants() {
  const [tenants, setTenants] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const fetchTenants = () =>
    api.get(`/tenants/?is_active=${!showInactive}`).then(r => setTenants(r.data))

  useEffect(() => {
    Promise.all([
      api.get('/tenants/'),
      api.get('/units/?active_only=true'),
    ]).then(([tRes, uRes]) => {
      setTenants(tRes.data)
      setUnits(uRes.data.filter(u => u.status === 'vacant'))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (!loading) fetchTenants() }, [showInactive])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/tenants/', { ...form, unit: parseInt(form.unit) })
      toast.success('Tenant created and assigned to unit.')
      setModal(false)
      setForm(EMPTY_FORM)
      const [tRes, uRes] = await Promise.all([
        api.get('/tenants/'),
        api.get('/units/?active_only=true'),
      ])
      setTenants(tRes.data)
      setUnits(uRes.data.filter(u => u.status === 'vacant'))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const filtered = tenants.filter(t => {
    const name = `${t.user.first_name} ${t.user.last_name} ${t.user.email}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Tenants</h1>
        <button onClick={() => setModal(true)} className="btn-primary shrink-0">
          <Plus size={16} /> Add Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
          Show inactive
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants found"
          description="Add a tenant and assign them to a unit."
          action={<button onClick={() => setModal(true)} className="btn-primary">Add Tenant</button>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-head py-3 px-4">Tenant</th>
                  <th className="table-head py-3 px-4">Unit</th>
                  <th className="table-head py-3 px-4">Move-in</th>
                  <th className="table-head py-3 px-4">Outstanding</th>
                  <th className="table-head py-3 px-4">Status</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className={`hover:bg-slate-50 ${!t.is_active ? 'opacity-60' : ''}`}>
                    <td className="table-cell px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 shrink-0">
                          <User size={14} className="text-primary-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 whitespace-nowrap">
                            {t.user.first_name} {t.user.last_name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{t.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell px-4 whitespace-nowrap">{t.unit_detail ? `${t.unit_detail.apartment_name} – ${t.unit_detail.unit_number}` : '—'}</td>
                    <td className="table-cell px-4 whitespace-nowrap">{formatDate(t.move_in_date)}</td>
                    <td className="table-cell px-4 font-semibold text-red-600 whitespace-nowrap">
                      KES {formatCurrency(t.outstanding_balance)}
                    </td>
                    <td className="table-cell px-4">
                      <StatusBadge status={t.is_active ? 'occupied' : 'vacant'} />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/landlord/tenants/${t.id}`} className="text-sm text-primary-700 hover:underline font-medium whitespace-nowrap">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create tenant modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Tenant" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">First Name *</label>
              <input className="input" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Email (used to login) *</label>
            <input type="email" className="input" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0712345678" />
            </div>
            <div>
              <label className="label">ID Number *</label>
              <input className="input" required value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Unit *</label>
              <select className="input" required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                <option value="">Select a vacant unit…</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.apartment_name} – {u.unit_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Move-in Date *</label>
              <input type="date" className="input" required value={form.move_in_date} onChange={e => setForm({ ...form, move_in_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Temporary Password *</label>
            <input type="password" className="input" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Tenant will use this to log in" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Creating…' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
