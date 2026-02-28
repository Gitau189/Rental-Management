import { Loader2, Plus, Search, User, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { Link } from "react-router-dom"
import EmptyState from "../../components/EmptyState"
import LoadingSpinner from "../../components/LoadingSpinner"
import Modal from "../../components/Modal"
import StatusBadge from "../../components/StatusBadge"
import api from "../../services/api"
import { errorMessage, formatCurrency, formatDate } from "../../utils/helpers"

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  unit: "",
  id_number: "",
  move_in_date: "",
}

export default function Tenants() {
  const [tenants, setTenants] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get("/tenants/"),
      api.get("/units/?active_only=true"),
    ])
      .then(([tRes, uRes]) => {
        setTenants(tRes.data)
        setUnits(uRes.data.filter((u) => u.status === "vacant"))
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return tenants
      .filter((t) =>
        showInactive ? true : t.is_active
      )
      .filter((t) => {
        const name =
          `${t.user.first_name} ${t.user.last_name} ${t.user.email}`.toLowerCase()
        return name.includes(search.toLowerCase())
      })
  }, [tenants, search, showInactive])

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.is_active).length,
    inactive: tenants.filter((t) => !t.is_active).length,
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post("/tenants/", {
        ...form,
        unit: parseInt(form.unit),
      })
      toast.success("Tenant created successfully")
      setModal(false)
      setForm(EMPTY_FORM)
      const tRes = await api.get("/tenants/")
      setTenants(tRes.data)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Tenants
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and track all tenant records
          </p>
        </div>

        <button
          onClick={() => setModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Add Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total Tenants
          </p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            {stats.total}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Active
          </p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">
            {stats.active}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Inactive
          </p>
          <p className="text-2xl font-bold mt-1 text-slate-400">
            {stats.inactive}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-9"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Show inactive tenants
        </label>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants found"
          description="Add a tenant and assign them to a unit."
          action={
            <button
              onClick={() => setModal(true)}
              className="btn-primary"
            >
              Add Tenant
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm divide-y">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition ${
                !t.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary-100 shrink-0">
                  <User size={16} className="text-primary-700" />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {t.user.first_name} {t.user.last_name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {t.user.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 items-center text-sm">
                <div>
                  <p className="text-xs text-slate-400">Unit</p>
                  <p className="font-medium text-slate-800 whitespace-nowrap">
                    {t.unit_detail
                      ? `${t.unit_detail.apartment_name} – ${t.unit_detail.unit_number}`
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Move-in</p>
                  <p className="font-medium text-slate-800 whitespace-nowrap">
                    {formatDate(t.move_in_date)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Outstanding</p>
                  <p className="font-semibold text-red-600 whitespace-nowrap">
                    KES {formatCurrency(t.outstanding_balance)}
                  </p>
                </div>

                <StatusBadge
                  status={t.is_active ? "occupied" : "vacant"}
                />

                <Link
                  to={`/landlord/tenants/${t.id}`}
                  className="text-primary-700 font-medium hover:underline"
                >
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal remains mostly same */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Add Tenant"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">First name *</label>
              <input
                className="input"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Last name *</label>
              <input
                className="input"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Password *</label>
              <input
                type="password"
                className="input"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Unit (optional)</label>
              <select
                className="input"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                <option value="">Assign unit (optional)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.apartment_name || (u.apartment && u.apartment.name) || ''} – {u.unit_number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">ID number</label>
              <input
                className="input"
                value={form.id_number}
                onChange={(e) => setForm({ ...form, id_number: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Move-in date</label>
              <input
                type="date"
                className="input"
                value={form.move_in_date}
                onChange={(e) => setForm({ ...form, move_in_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
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
              className="btn-primary flex items-center gap-2"
            >
              {saving && (
                <Loader2 size={15} className="animate-spin" />
              )}
              {saving ? "Creating..." : "Create Tenant"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}