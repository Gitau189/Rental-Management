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

  /* --------- Analytics --------- */

  const totalProperties = apartments.length
  const totalUnits = apartments.reduce(
    (sum, a) => sum + (a.total_units || 0),
    0
  )
  const totalOccupied = apartments.reduce(
    (sum, a) => sum + (a.occupied_units || 0),
    0
  )
  const occupancyRate =
    totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0

  /* --------- Actions --------- */

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
        toast.success("Property updated")
      } else {
        await api.post("/apartments/", form)
        toast.success("Property created")
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

  /* --------- Loading Skeleton --------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-52 rounded-2xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">

      {/* ===== Header ===== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Properties
          </h1>
          <p className="text-slate-500 mt-1">
            Manage and monitor your real estate portfolio
          </p>
        </div>

        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* ===== Portfolio Summary ===== */}
      <div className="grid sm:grid-cols-3 gap-5">
        <SummaryCard label="Total Properties" value={totalProperties} />
        <SummaryCard label="Total Units" value={totalUnits} />
        <SummaryCard
          label="Occupancy Rate"
          value={`${occupancyRate}%`}
        />
      </div>

      {/* ===== Search ===== */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="input pl-9"
          placeholder="Search property..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ===== Properties Grid ===== */}
      {filteredApartments.length === 0 ? (
        <div className="text-center py-24 border rounded-2xl bg-slate-50">
          <Building2
            size={44}
            className="mx-auto text-slate-400 mb-4"
          />
          <h3 className="text-lg font-semibold">
            No properties found
          </h3>
          <p className="text-slate-500 mt-2">
            Add your first property to begin tracking units.
          </p>
          <button
            onClick={openCreate}
            className="btn-primary mt-6"
          >
            Add Property
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredApartments.map((apt) => {
            const rate =
              apt.total_units > 0
                ? Math.round(
                    (apt.occupied_units / apt.total_units) * 100
                  )
                : 0

            return (
              <div
                key={apt.id}
                className="group bg-white border rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                {/* Top Section */}
                <div className="flex justify-between">
                  <div className="flex gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
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

                {/* Address */}
                <p className="text-sm text-slate-500 mt-4 line-clamp-2">
                  {apt.address}
                </p>

                {/* Occupancy Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{rate}% Occupied</span>
                    <span>{apt.total_units} Units</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 transition-all"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Stats */}
                <div className="grid grid-cols-3 mt-6 text-center text-sm border-t pt-4">
                  <Stat label="Total" value={apt.total_units} />
                  <Stat
                    label="Occupied"
                    value={apt.occupied_units}
                    color="text-green-600"
                  />
                  <Stat
                    label="Vacant"
                    value={apt.vacant_units}
                  />
                </div>

                <Link
                  to={`/landlord/properties/${apt.id}`}
                  className="block mt-5 text-sm font-medium text-primary-700 hover:underline"
                >
                  Manage Units →
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== Modal Forms (same as yours) ===== */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Property" : "Add Property"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            required
            className="input"
            placeholder="Property Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <textarea
            required
            rows={3}
            className="input"
            placeholder="Address"
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />

          <input
            required
            className="input"
            placeholder="City"
            value={form.city}
            onChange={(e) =>
              setForm({ ...form, city: e.target.value })
            }
          />

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

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Property"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Delete{" "}
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

/* ===== Small Reusable Components ===== */

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  )
}

function Stat({ label, value, color = "text-slate-900" }) {
  return (
    <div>
      <p className={`font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}