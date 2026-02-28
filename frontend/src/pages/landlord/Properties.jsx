import {
  Building2,
  Edit,
  MapPin,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { Link } from "react-router-dom"
import Modal from "../../components/Modal"
import api from "../../services/api"
import { errorMessage } from "../../utils/helpers"

const EMPTY_FORM = { name: "", address: "", city: "" }

export default function Properties() {
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchApartments = async () => {
    try {
      const res = await api.get("/apartments/")
      setApartments(res.data)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApartments()
  }, [])

  const filteredApartments = useMemo(() => {
    return apartments.filter((apt) =>
      [apt.name, apt.city]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  }, [apartments, search])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  const openEdit = (apt) => {
    setEditing(apt)
    setForm({
      name: apt.name,
      address: apt.address,
      city: apt.city,
    })
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editing) {
        await api.patch(`/apartments/${editing.id}/`, form)
        toast.success("Property updated successfully")
      } else {
        await api.post("/apartments/", form)
        toast.success("Property created successfully")
      }

      setModal(false)
      fetchApartments()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      await api.delete(`/apartments/${deleteTarget.id}/`)
      toast.success("Property deleted")
      setDeleteTarget(null)
      fetchApartments()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  /* ---------------------- UI ---------------------- */

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-xl bg-slate-100 animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Properties
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your buildings and apartments
          </p>
        </div>

        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="input pl-9"
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Empty State */}
      {filteredApartments.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-slate-50">
          <Building2 size={40} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold text-slate-800">
            No properties found
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Start by adding your first property.
          </p>
          <button
            onClick={openCreate}
            className="btn-primary mt-4"
          >
            Add Property
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredApartments.map((apt) => (
            <div
              key={apt.id}
              className="group bg-white border rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="h-11 w-11 flex items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {apt.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={12} /> {apt.city}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEdit(apt)}
                    className="p-2 rounded-lg hover:bg-primary-50 text-slate-500 hover:text-primary-700"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(apt)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-4 line-clamp-2">
                {apt.address}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 mt-5 text-center text-sm border-t pt-4">
                <div>
                  <p className="font-bold text-slate-900">
                    {apt.total_units}
                  </p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div>
                  <p className="font-bold text-green-600">
                    {apt.occupied_units}
                  </p>
                  <p className="text-xs text-slate-500">Occupied</p>
                </div>
                <div>
                  <p className="font-bold text-slate-600">
                    {apt.vacant_units}
                  </p>
                  <p className="text-xs text-slate-500">Vacant</p>
                </div>
              </div>

              <Link
                to={`/landlord/properties/${apt.id}`}
                className="block mt-4 text-sm font-medium text-primary-700 hover:underline"
              >
                Manage Units →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Property" : "Add Property"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Property Name</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="label">Address</label>
            <textarea
              required
              rows={3}
              className="input"
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />
          </div>

          <div>
            <label className="label">City</label>
            <input
              required
              className="input"
              value={form.city}
              onChange={(e) =>
                setForm({ ...form, city: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
                : "Add Property"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Property"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">
              {deleteTarget?.name}
            </span>
            ? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="btn-danger"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}