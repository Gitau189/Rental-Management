import { ArrowLeft, Edit, Home, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { errorMessage, formatCurrency } from '../../utils/helpers'

const EMPTY_UNIT = { unit_number: '', description: '', base_rent: '', status: 'vacant' }

export default function PropertyDetail() {
  const { id } = useParams()
  const [apartment, setApartment] = useState(null)
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_UNIT)
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    const [aptRes, unitsRes] = await Promise.all([
      api.get(`/apartments/${id}/`),
      api.get(`/units/?apartment=${id}&active_only=false`),
    ])
    setApartment(aptRes.data)
    setUnits(unitsRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  const openCreate = () => { setEditing(null); setForm(EMPTY_UNIT); setModal(true) }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ unit_number: u.unit_number, description: u.description, base_rent: u.base_rent, status: u.status })
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.patch(`/units/${editing.id}/`, form)
        toast.success('Unit updated.')
      } else {
        await api.post('/units/', { ...form, apartment: parseInt(id) })
        toast.success('Unit added.')
      }
      setModal(false)
      fetchAll()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (unit) => {
    if (!window.confirm(`Deactivate "${unit.unit_number}"?`)) return
    try {
      await api.delete(`/units/${unit.id}/`)
      toast.success('Unit deactivated.')
      fetchAll()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/landlord/properties" className="btn-secondary !px-3 !py-2">
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{apartment?.name}</h1>
          <p className="text-slate-500 text-sm truncate">{apartment?.address}, {apartment?.city}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-slate-500">{apartment?.total_units} units total</span>
          <span className="text-green-700 font-medium">{apartment?.occupied_units} occupied</span>
          <span className="text-slate-500">{apartment?.vacant_units} vacant</span>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Unit
        </button>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No units yet"
          description="Add units or houses to this property."
          action={<button onClick={openCreate} className="btn-primary">Add Unit</button>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-head py-3 px-4">Unit</th>
                  <th className="table-head py-3 px-4">Description</th>
                  <th className="table-head py-3 px-4">Base Rent</th>
                  <th className="table-head py-3 px-4">Tenant</th>
                  <th className="table-head py-3 px-4">Status</th>
                  <th className="table-head py-3 px-4">Active</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((unit) => (
                  <tr key={unit.id} className={`hover:bg-slate-50 ${!unit.is_active ? 'opacity-50' : ''}`}>
                    <td className="table-cell px-4 font-medium whitespace-nowrap">{unit.unit_number}</td>
                    <td className="table-cell px-4 text-slate-500">{unit.description || '—'}</td>
                    <td className="table-cell px-4 font-semibold whitespace-nowrap">KES {formatCurrency(unit.base_rent)}</td>
                    <td className="table-cell px-4 whitespace-nowrap">{unit.active_tenant_name || <span className="text-slate-400">—</span>}</td>
                    <td className="table-cell px-4"><StatusBadge status={unit.status} /></td>
                    <td className="table-cell px-4">
                      <span className={`text-xs font-medium ${unit.is_active ? 'text-green-700' : 'text-slate-400'}`}>
                        {unit.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(unit)} className="p-1.5 rounded text-slate-400 hover:text-primary-700 hover:bg-primary-50 transition-colors">
                          <Edit size={15} />
                        </button>
                        {unit.is_active && unit.status === 'vacant' && (
                          <button onClick={() => handleDeactivate(unit)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Unit' : 'Add Unit'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Unit Number / Name *</label>
            <input className="input" required value={form.unit_number}
              onChange={e => setForm({ ...form, unit_number: e.target.value })} placeholder="e.g. A1, Unit 3" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. 2 Bedroom, 1 Bathroom" />
          </div>
          <div>
            <label className="label">Base Rent (KES) *</label>
            <input type="number" step="0.01" min="0" className="input" required value={form.base_rent}
              onChange={e => setForm({ ...form, base_rent: e.target.value })} placeholder="25000.00" />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Unit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
