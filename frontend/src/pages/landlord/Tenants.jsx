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
  
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, uRes] = await Promise.all([
          api.get("/tenants/"),
          api.get("/units/?active_only=true"),
        ])
        setTenants(tRes.data)
        setUnits(uRes.data.filter((u) => u.status === "vacant"))
      } catch (err) {
        toast.error(errorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredAndSorted = useMemo(() => {
    let filteredTenants = tenants
      .filter((t) => {
        const name = `${t.user.first_name} ${t.user.last_name} ${t.user.email}`.toLowerCase()
        return name.includes(search.toLowerCase())
      })

    // Add sorting
    filteredTenants.sort((a, b) => {
      let aValue, bValue
      switch (sortConfig.key) {
        case 'name':
          aValue = `${a.user.first_name} ${a.user.last_name}`.toLowerCase()
          bValue = `${b.user.first_name} ${b.user.last_name}`.toLowerCase()
          break
        case 'move_in_date':
          aValue = new Date(a.move_in_date)
          bValue = new Date(b.move_in_date)
          break
        case 'outstanding_balance':
          aValue = a.outstanding_balance
          bValue = b.outstanding_balance
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return filteredTenants
  }, [tenants, search, sortConfig])

  const stats = useMemo(() => {
    const total = tenants.length
    const active = tenants.filter((t) => t.unit_detail && t.unit_detail.status === 'occupied').length
    const inactive = total - active
    return { total, active, inactive }
  }, [tenants])

  const requestSort = (key) => {
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

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      toast.error("Please fill all required fields")
      return
    }
    setSaving(true)
    try {
      await api.post("/tenants/", {
        ...form,
        unit: form.unit ? parseInt(form.unit) : null,
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
    <div className="space-y-6 p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Tenants
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and track all tenant records
          </p>
        </div>

        <button
          onClick={() => setModal(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
        >
          <Plus size={16} />
          Add Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-slate-100">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total Tenants
          </p>
          <p className="text-xl md:text-2xl font-bold mt-1 text-slate-900">
            {stats.total}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-slate-100">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Active
          </p>
          <p className="text-xl md:text-2xl font-bold mt-1 text-emerald-600">
            {stats.active}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-slate-100">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Inactive
          </p>
          <p className="text-xl md:text-2xl font-bold mt-1 text-slate-400">
            {stats.inactive}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-slate-100">
        <div className="relative w-full sm:w-auto sm:flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-9 w-full border-slate-200 focus:border-primary-500 rounded-lg"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* removed active-only filter: show all tenants by default */}
      </div>

      {/* List - Switched to Table for better alignment and UX */}
      {filteredAndSorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants found"
          description="Add a tenant and assign them to a unit."
          action={
            <button
              onClick={() => setModal(true)}
              className="btn-primary px-4 py-2 rounded-lg"
            >
              Add Tenant
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('name')}
                  >
                    Tenant {getSortIcon('name')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('move_in_date')}
                  >
                    Move-in {getSortIcon('move_in_date')}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('outstanding_balance')}
                  >
                    Outstanding {getSortIcon('outstanding_balance')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredAndSorted.map((t) => (
                  <tr 
                    key={t.id} 
                    className={`hover:bg-slate-50 transition ${!t.is_active ? "opacity-60" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary-100 shrink-0">
                          <User size={14} className="text-primary-700" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {t.user.first_name} {t.user.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {t.unit_detail
                        ? `${t.unit_detail.apartment_name} – ${t.unit_detail.unit_number}`
                        : "—"}
                      {t.unit_detail && t.unit_detail.status !== 'occupied' && (
                        <p className="text-xs text-slate-400 mt-0.5">Previously occupied</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDate(t.move_in_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      KES {formatCurrency(t.outstanding_balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusBadge
                        status={
                          (t.is_active && t.unit_detail && t.unit_detail.status === 'occupied')
                            ? 'occupied'
                            : 'inactive'
                        }
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/landlord/tenants/${t.id}`}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - Improved grid layout and input styling */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Add New Tenant"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label text-sm font-medium text-slate-700">First name *</label>
              <input
                className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>

            <div>
              <label className="label text-sm font-medium text-slate-700">Last name *</label>
              <input
                className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>

            <div>
              <label className="label text-sm font-medium text-slate-700">Email *</label>
              <input
                type="email"
                className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="label text-sm font-medium text-slate-700">Phone</label>
              <input
                className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="label text-sm font-medium text-slate-700">Password *</label>
              <input
                type="password"
                className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div>
              <label className="label text-sm font-medium text-slate-700">Unit (optional)</label>
              <select
                className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                <option value="">Select unit (optional)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.apartment_name || (u.apartment && u.apartment.name) || ''} – {u.unit_number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-sm font-medium text-slate-700">ID number</label>
              <input
                className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg"
                value={form.id_number}
                onChange={(e) => setForm({ ...form, id_number: e.target.value })}
              />
            </div>

            <div>
              <label className="label text-sm font-medium text-slate-700">Move-in date</label>
              <input
                type="date"
                className="input mt-1 border-slate-200 focus:border-primary-500 rounded-lg"
                value={form.move_in_date}
                onChange={(e) => setForm({ ...form, move_in_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
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