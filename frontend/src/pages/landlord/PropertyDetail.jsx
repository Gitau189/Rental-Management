import {
  ArrowLeft,
  Edit,
  Home,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { Link, useParams } from "react-router-dom"
import Modal from "../../components/Modal"
import StatusBadge from "../../components/StatusBadge"
import api from "../../services/api"
import { errorMessage, formatCurrency } from "../../utils/helpers"

const EMPTY_UNIT = {
  unit_number: "",
  description: "",
  base_rent: "",
  status: "vacant",
}

export default function PropertyDetail() {
  const { id } = useParams()

  const [apartment, setApartment] = useState(null)
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_UNIT)
  const [saving, setSaving] = useState(false)
  const [tenants, setTenants] = useState([])
  const [selectedTenant, setSelectedTenant] = useState('')

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const fetchAll = async () => {
    try {
      const [aptRes, unitsRes] = await Promise.all([
        api.get(`/apartments/${id}/`),
        api.get(`/units/?apartment=${id}&active_only=false`),
      ])

      setApartment(aptRes.data)
      setUnits(unitsRes.data)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [id])

  const filteredUnits = useMemo(() => {
    return units
      .filter((u) =>
        u.unit_number.toLowerCase().includes(search.toLowerCase())
      )
      .filter((u) =>
        statusFilter === "all" ? true : u.status === statusFilter
      )
  }, [units, search, statusFilter])

  const occupancyRate =
    apartment?.total_units > 0
      ? Math.round(
          (apartment.occupied_units / apartment.total_units) * 100
        )
      : 0

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_UNIT)
    setSelectedTenant('')
    fetchTenants()
    setModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({
      unit_number: u.unit_number,
      description: u.description,
      base_rent: u.base_rent,
      status: u.status,
    })
    fetchTenants().then((data) => {
      // if this unit currently has an occupant, preselect them
      try {
        const occupant = (data || []).find(t => t.unit === u.id)
        setSelectedTenant(occupant ? String(occupant.id) : '')
      } catch (e) {
        setSelectedTenant('')
      }
      setModal(true)
    })
  }

  const fetchTenants = async () => {
    try {
      const res = await api.get('/tenants/?is_active=true')
      // tenants without unit (available) or those already in this unit will be candidates
      setTenants(res.data)
      return res.data
    } catch (err) {
      toast.error(errorMessage(err))
      return []
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      let unitId = null
      if (editing) {
        const res = await api.patch(`/units/${editing.id}/`, form)
        unitId = res.data.id || editing.id
        toast.success("Unit updated")
      } else {
        const res = await api.post("/units/", {
          ...form,
          apartment: parseInt(id),
        })
        unitId = res.data.id
        toast.success("Unit added")
      }

      // If status is occupied, require a tenant selection and assign tenant
      if (form.status === 'occupied') {
        if (!selectedTenant) {
          toast.error('Please select a tenant when marking unit occupied.')
          setSaving(false)
          return
        }

        try {
          await api.patch(`/tenants/${selectedTenant}/`, { unit: unitId })
        } catch (err) {
          toast.error(errorMessage(err))
        }
      }

      setModal(false)
      fetchAll()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDeactivate = async () => {
    if (!deleteTarget) return

    if (deleteConfirmText !== 'DELETE_UNIT') {
      toast.error('Please type DELETE_UNIT to confirm permanent deletion.')
      return
    }

    try {
      const url = `/units/${deleteTarget.id}/?confirm=DELETE_UNIT&delete_invoices=true`
      await api.delete(url)
      toast.success("Unit deleted")
      setDeleteTarget(null)
      setDeleteConfirmText('')
      fetchAll()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-slate-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/landlord/properties"
          className="btn-secondary !px-3 !py-2"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">
            {apartment?.name}
          </h1>
          <p className="text-sm text-slate-500 truncate">
            {apartment?.address}, {apartment?.city}
          </p>

          {/* Occupancy Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>{occupancyRate}% Occupied</span>
              <span>{apartment?.total_units} Units</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add Unit
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-9"
            placeholder="Search unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input max-w-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
        </select>
      </div>

      {/* Table */}
      {filteredUnits.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-slate-50">
          <Home size={40} className="mx-auto text-slate-400 mb-3" />
          <h3 className="font-semibold text-slate-800">
            No units found
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Add your first unit to this property.
          </p>
          <button
            onClick={openCreate}
            className="btn-primary mt-4"
          >
            Add Unit
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-left text-slate-600">
                  <th className="px-5 py-3">Unit</th>
                  <th className="px-5 py-3">Rent</th>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right"></th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredUnits.map((unit) => (
                  <tr
                    key={unit.id}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4 font-medium">
                      {unit.unit_number}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      KES {formatCurrency(unit.base_rent)}
                    </td>

                    <td className="px-5 py-4">
                      {unit.active_tenant_name || (
                        <span className="text-slate-400">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={unit.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(unit)}
                          className="p-2 rounded-lg hover:bg-primary-50 text-slate-500 hover:text-primary-700"
                        >
                          <Edit size={16} />
                        </button>

                        {unit.is_active &&
                          unit.status === "vacant" && (
                            <button
                              onClick={() =>
                                setDeleteTarget(unit)
                              }
                              className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"
                            >
                              <Trash2 size={16} />
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

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Unit" : "Add Unit"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            required
            className="input"
            placeholder="Unit Number"
            value={form.unit_number}
            onChange={(e) =>
              setForm({ ...form, unit_number: e.target.value })
            }
          />

          <textarea
            rows={3}
            className="input"
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <input
            type="number"
            required
            min="0"
            step="0.01"
            className="input"
            placeholder="Base Rent"
            value={form.base_rent}
            onChange={(e) =>
              setForm({ ...form, base_rent: e.target.value })
            }
          />

          <select
            className="input"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value })
            }
          >
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>

          {form.status === 'occupied' && (
            <div>
              <label className="label text-sm font-medium text-slate-700">Assign Tenant</label>
              <select
                className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg w-full"
                value={selectedTenant}
                onChange={e => setSelectedTenant(e.target.value)}
              >
                <option value="">-- Select tenant --</option>
                {tenants
                  .filter(t => !t.unit || t.unit === (editing ? editing.id : null))
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.user.first_name} {t.user.last_name} — {t.user.email}</option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving
                ? "Saving..."
                : editing
                ? "Save Changes"
                : "Add Unit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteConfirmText('') }}
        title="Delete Unit"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will permanently delete unit <span className="font-semibold">{deleteTarget?.unit_number}</span>.
            Any invoices/payments for this unit will be deleted. To confirm, type <span className="font-mono">DELETE_UNIT</span> below.
          </p>

          <input
            type="text"
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE_UNIT to confirm"
            className="input w-full mt-1 border-slate-200 rounded-lg"
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setDeleteTarget(null); setDeleteConfirmText('') }}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              onClick={confirmDeactivate}
              className="btn-danger"
              disabled={deleteConfirmText !== 'DELETE_UNIT'}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}