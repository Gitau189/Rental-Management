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

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deleteTarget, setDeleteTarget] = useState(null)

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
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editing) {
        await api.patch(`/units/${editing.id}/`, form)
        toast.success("Unit updated")
      } else {
        await api.post("/units/", {
          ...form,
          apartment: parseInt(id),
        })
        toast.success("Unit added")
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

    try {
      await api.delete(`/units/${deleteTarget.id}/`)
      toast.success("Unit deactivated")
      setDeleteTarget(null)
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
        onClose={() => setDeleteTarget(null)}
        title="Deactivate Unit"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Deactivate{" "}
            <span className="font-semibold">
              {deleteTarget?.unit_number}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              onClick={confirmDeactivate}
              className="btn-danger"
            >
              Deactivate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}