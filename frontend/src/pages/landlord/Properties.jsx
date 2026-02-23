import { Building2, Edit, MapPin, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import api from '../../services/api'
import { errorMessage } from '../../utils/helpers'

const EMPTY_FORM = { name: '', address: '', city: '' }

export default function Properties() {
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetch = () =>
    api.get('/apartments/').then(r => setApartments(r.data)).finally(() => setLoading(false))

  useEffect(() => { fetch() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit = (apt) => { setEditing(apt); setForm({ name: apt.name, address: apt.address, city: apt.city }); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.patch(`/apartments/${editing.id}/`, form)
        toast.success('Property updated.')
      } else {
        await api.post('/apartments/', form)
        toast.success('Property added.')
      }
      setModal(false)
      fetch()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (apt) => {
    if (!window.confirm(`Delete "${apt.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/apartments/${apt.id}/`)
      toast.success('Property deleted.')
      fetch()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Property
        </button>
      </div>

      {apartments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first apartment or building to get started."
          action={<button onClick={openCreate} className="btn-primary">Add Property</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apartments.map((apt) => (
            <div key={apt.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                    <Building2 size={20} className="text-primary-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{apt.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={11} />{apt.city}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(apt)} className="p-1.5 rounded text-slate-400 hover:text-primary-700 hover:bg-primary-50 transition-colors">
                    <Edit size={15} />
                  </button>
                  <button onClick={() => handleDelete(apt)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{apt.address}</p>
              <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{apt.total_units}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-700">{apt.occupied_units}</p>
                  <p className="text-xs text-slate-500">Occupied</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-500">{apt.vacant_units}</p>
                  <p className="text-xs text-slate-500">Vacant</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <Link to={`/landlord/properties/${apt.id}`} className="text-sm text-primary-700 hover:underline font-medium">
                  Manage Units →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Property' : 'Add Property'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Property Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sunset Apartments" />
          </div>
          <div>
            <label className="label">Address *</label>
            <textarea className="input" required rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
          </div>
          <div>
            <label className="label">City *</label>
            <input className="input" required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Nairobi" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
