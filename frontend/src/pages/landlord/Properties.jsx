import {
  Building2,
  Edit,
  MapPin,
  Plus,
  Search,
  Trash2,
  Home,
  Users,
  Percent,
  X,
  CheckCircle,
  AlertCircle,
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
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // grid or list

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
      [apt.name, apt.city, apt.address]
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
  const totalVacant = totalUnits - totalOccupied
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
    if (deleteConfirmText !== 'DELETE_APARTMENT') {
      toast.error('Please type DELETE_APARTMENT to confirm.')
      return
    }

    setDeleting(true)
    try {
      const url = `/apartments/${deleteTarget.id}/?confirm=DELETE_APARTMENT&delete_invoices=true`
      const res = await api.delete(url)
      toast.success('Property deleted successfully')
      setDeleteTarget(null)
      setDeleteConfirmText('')
      fetchApartments()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  /* --------- Loading Skeleton --------- */

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-4 w-64 bg-gray-200 rounded-lg animate-pulse"></div>
          
          {/* Summary Cards Skeleton */}
          <div className="grid sm:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>

          {/* Search Bar Skeleton */}
          <div className="h-10 w-64 bg-gray-200 rounded-xl animate-pulse" />

          {/* Grid Skeleton */}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Building2 size={28} className="text-blue-600" />
              Properties
            </h1>
            <p className="text-gray-500 text-base">
              Manage and monitor your real estate portfolio
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg shadow-blue-200"
          >
            <Plus size={18} className="mr-2" />
            Add New Property
          </button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Total Properties</p>
            <div className="p-2 bg-blue-50 rounded-xl">
              <Building2 size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalProperties}</p>
          <p className="text-xs text-gray-400 mt-2">Active properties</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Total Units</p>
            <div className="p-2 bg-purple-50 rounded-xl">
              <Home size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalUnits}</p>
          <p className="text-xs text-gray-400 mt-2">Across all properties</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Occupied Units</p>
            <div className="p-2 bg-green-50 rounded-xl">
              <Users size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">{totalOccupied}</p>
          <p className="text-xs text-gray-400 mt-2">{totalVacant} vacant</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
            <div className="p-2 bg-orange-50 rounded-xl">
              <Percent size={20} className="text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-orange-600">{occupancyRate}%</p>
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="Search by property name, city, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              viewMode === 'grid'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg inline-block">
          Showing <span className="font-semibold text-gray-900">{filteredApartments.length}</span> properties
          {filteredApartments.length !== apartments.length && (
            <span className="text-gray-400"> out of {apartments.length} total</span>
          )}
        </p>
      </div>

      {/* Properties Grid/List */}
      {filteredApartments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No properties found
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            {search 
              ? "Try adjusting your search criteria"
              : "Add your first property to begin tracking units."}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="mt-6 inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200"
            >
              <Plus size={18} className="mr-2" />
              Add Your First Property
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredApartments.map((apt) => {
            const rate =
              apt.total_units > 0
                ? Math.round((apt.occupied_units / apt.total_units) * 100)
                : 0

            return (
              <div
                key={apt.id}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                {/* Card Header with Gradient */}
                <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
                
                <div className="p-6">
                  {/* Top Section */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center">
                        <Building2 size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {apt.name}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-gray-400" />
                          {apt.city}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => openEdit(apt)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                        title="Edit property"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(apt)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors duration-200"
                        title="Delete property"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Address */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 bg-gray-50 p-3 rounded-xl">
                    {apt.address}
                  </p>

                  {/* Occupancy Stats */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Occupancy Rate</span>
                      <span className="font-semibold text-gray-900">{rate}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>

                  {/* Unit Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">{apt.total_units || 0}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">{apt.occupied_units || 0}</p>
                      <p className="text-xs text-green-600">Occupied</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded-lg">
                      <p className="text-lg font-bold text-orange-600">{apt.vacant_units || 0}</p>
                      <p className="text-xs text-orange-600">Vacant</p>
                    </div>
                  </div>

                  {/* Manage Link */}
                  <Link
                    to={`/landlord/properties/${apt.id}`}
                    className="block w-full text-center py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors duration-200"
                  >
                    Manage Units & Tenants →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Units</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Occupied</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Vacant</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Occupancy</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApartments.map((apt) => {
                  const rate = apt.total_units > 0
                    ? Math.round((apt.occupied_units / apt.total_units) * 100)
                    : 0

                  return (
                    <tr key={apt.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Building2 size={16} className="text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{apt.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{apt.address}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{apt.city}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">{apt.total_units || 0}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-green-600 font-medium">{apt.occupied_units || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-orange-600 font-medium">{apt.vacant_units || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            rate >= 70 ? 'text-green-600' : rate >= 30 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {rate}%
                          </span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                rate >= 70 ? 'bg-green-500' : rate >= 30 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(apt)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(apt)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          >
                            <Trash2 size={16} />
                          </button>
                          <Link
                            to={`/landlord/properties/${apt.id}`}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors duration-200 ml-2"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Property Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Property" : "Add New Property"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Property Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="e.g., Sunset Apartments"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="Full street address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              City <span className="text-red-500">*</span>
            </label>
            <input
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="e.g., Nairobi"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-200"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚪</span>
                  {editing ? "Updating..." : "Creating..."}
                </span>
              ) : (
                editing ? "Save Changes" : "Add Property"
              )}
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
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
              <AlertCircle size={24} className="text-red-600 shrink-0" />
              <div>
                <p className="text-sm text-gray-700">
                  Permanently delete
                  <span className="font-semibold text-gray-900"> {deleteTarget?.name}</span>?
                </p>
                <p className="text-xs text-red-600 mt-1">
                  This will remove the property and its units. All invoices and payments for those units will also be permanently deleted.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-600">Type <span className="font-mono">DELETE_APARTMENT</span> to confirm</p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE_APARTMENT to confirm"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText('') }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== 'DELETE_APARTMENT' || deleting}
                className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg ${deleteConfirmText === 'DELETE_APARTMENT' && !deleting ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                {deleting ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
          </div>
      </Modal>
    </div>
  )
}