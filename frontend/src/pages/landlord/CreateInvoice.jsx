import { ArrowLeft, Loader2, Minus, Plus, Calendar, Home, User, FileText, CreditCard, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { currentMonth, currentYear, errorMessage, formatCurrency, MONTHS } from '../../utils/helpers'

const PRESET_CHARGES = ['Water', 'Electricity', 'Garbage Collection', 'Security', 'Parking']

export default function CreateInvoice() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedTenant = searchParams.get('tenant')

  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  const [form, setForm] = useState({
    tenant: preselectedTenant || '',
    unit: '',
    unit_display: '',
    month: currentMonth(),
    year: currentYear(),
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    base_rent: '',
    notes: '',
  })
  const [lineItems, setLineItems] = useState([])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    api.get('/tenants/?is_active=true').then(r => {
      setTenants(r.data)
      if (preselectedTenant) {
        const t = r.data.find(t => t.id === parseInt(preselectedTenant))
        if (t) {
          setForm(f => ({
            ...f,
            tenant: String(t.user.id),
            unit: t.unit || '',
            base_rent: t.unit_detail?.base_rent || '',
          }))
        }
      }
    }).finally(() => setLoading(false))
  }, [preselectedTenant])

  const handleTenantChange = (userId) => {
    const t = tenants.find(t => t.user.id === parseInt(userId))
    setForm(f => ({
      ...f,
      tenant: userId,
      unit: t?.unit || '',
      unit_display: t?.unit_detail?.unit_number || '',
      base_rent: t?.unit_detail?.base_rent || '',
    }))
  }

  const addLineItem = (description = '') => {
    setLineItems([...lineItems, { description, amount: '' }])
  }

  const updateLineItem = (idx, field, value) => {
    setLineItems(lineItems.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const removeLineItem = (idx) => {
    setLineItems(lineItems.filter((_, i) => i !== idx))
  }

  const totalAmount = () => {
    const base = parseFloat(form.base_rent) || 0
    const extras = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    return base + extras
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        tenant: parseInt(form.tenant),
        unit: parseInt(form.unit),
        month: parseInt(form.month),
        year: parseInt(form.year),
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        base_rent: parseFloat(form.base_rent),
        notes: form.notes,
        line_items: lineItems
          .filter(i => i.description && i.amount)
          .map((i, idx) => ({ description: i.description, amount: parseFloat(i.amount), order: idx })),
      }
      const { data } = await api.post('/invoices/', payload)
      setErrors({})
      toast.success('Invoice created successfully!', {
        icon: '🎉',
        duration: 4000,
      })
      navigate(`/landlord/invoices/${data.id}`)
    } catch (err) {
      if (err.response && err.response.data) {
        const data = err.response.data
        setErrors(data)
        if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          toast.error(data.non_field_errors.join(' | '))
        } else if (data.detail) {
          toast.error(data.detail)
        } else {
          toast.error(errorMessage(err))
        }
      } else {
        toast.error(errorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading tenant data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            to="/landlord/invoices" 
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create New Invoice</h1>
            <p className="text-gray-500 mt-1">Generate an invoice for a tenant</p>
          </div>
        </div>

        {/* Progress Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText size={16} />
              Invoice Details
            </span>
          </button>
          <button
            onClick={() => setActiveTab('charges')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'charges'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <CreditCard size={16} />
              Charges & Items
            </span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {errors.non_field_errors && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Please fix the following errors:</p>
            {errors.non_field_errors.map((m, i) => (
              <p key={i} className="text-sm mt-1">{m}</p>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Details Section */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${
          activeTab === 'details' ? 'block' : 'hidden'
        }`}>
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              Invoice Information
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Tenant Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Tenant <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none" 
                    required 
                    value={form.tenant} 
                    onChange={e => handleTenantChange(e.target.value)}
                  >
                    <option value="">Select tenant...</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.user.id}>
                        {t.user.first_name} {t.user.last_name} – {t.unit_detail?.unit_number || 'No unit'}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.tenant && (
                  <p className="text-sm text-red-600 mt-1">{Array.isArray(errors.tenant) ? errors.tenant.join(', ') : errors.tenant}</p>
                )}
              </div>

              {/* Unit Display */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Unit</label>
                <div className="relative">
                  <Home size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600 cursor-not-allowed" 
                    value={form.unit ? `Unit ${form.unit_display || form.unit}` : 'Select tenant first'}
                    readOnly 
                    disabled
                  />
                </div>
              </div>

              {/* Billing Period */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Billing Period <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select 
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none" 
                      required 
                      value={form.month} 
                      onChange={e => setForm({ ...form, month: e.target.value })}
                    >
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <select 
                    className="w-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none" 
                    required 
                    value={form.year} 
                    onChange={e => setForm({ ...form, year: e.target.value })}
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Invoice Date */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  required 
                  value={form.invoice_date} 
                  onChange={e => setForm({ ...form, invoice_date: e.target.value })} 
                />
                {errors.invoice_date && (
                  <p className="text-sm text-red-600 mt-1">{Array.isArray(errors.invoice_date) ? errors.invoice_date.join(', ') : errors.invoice_date}</p>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2 sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  className="w-full sm:w-1/2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  required 
                  value={form.due_date} 
                  onChange={e => setForm({ ...form, due_date: e.target.value })} 
                />
                {errors.due_date && (
                  <p className="text-sm text-red-600 mt-1">{Array.isArray(errors.due_date) ? errors.due_date.join(', ') : errors.due_date}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charges Section */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${
          activeTab === 'charges' ? 'block' : 'hidden'
        }`}>
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard size={18} className="text-blue-600" />
              Charges & Items
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Base Rent */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Base Rent (KES) <span className="text-red-500">*</span>
              </label>
              <div className="relative sm:w-96">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">KES</span>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  className="w-full pl-14 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  required 
                  value={form.base_rent}
                  onChange={e => setForm({ ...form, base_rent: e.target.value })} 
                  placeholder="0.00" 
                />
              </div>
              {errors.base_rent && (
                <p className="text-sm text-red-600 mt-1">{Array.isArray(errors.base_rent) ? errors.base_rent.join(', ') : errors.base_rent}</p>
              )}
            </div>

            {/* Line Items */}
            {lineItems.length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Additional Charges</label>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                        placeholder="Description (e.g., Water)" 
                        value={item.description}
                        onChange={e => updateLineItem(idx, 'description', e.target.value)} 
                      />
                    </div>
                    <div className="relative w-40">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">KES</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                        placeholder="Amount"
                        value={item.amount} 
                        onChange={e => updateLineItem(idx, 'amount', e.target.value)} 
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeLineItem(idx)}
                      className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                    >
                      <Minus size={18} />
                    </button>
                    {errors.line_items && errors.line_items[idx] && (
                      <p className="text-sm text-red-600 mt-1">
                        {Object.entries(errors.line_items[idx]).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Buttons */}
            <div>
              <p className="text-sm text-gray-500 mb-3">Quick add charges:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_CHARGES.map(charge => (
                  <button 
                    key={charge} 
                    type="button" 
                    onClick={() => addLineItem(charge)}
                    className="px-4 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent transition-all duration-200"
                  >
                    + {charge}
                  </button>
                ))}
                <button 
                  type="button" 
                  onClick={() => addLineItem('')}
                  className="px-4 py-2 text-xs font-medium border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                >
                  <Plus size={14} className="inline mr-1" />
                  Custom Item
                </button>
              </div>
            </div>

            {/* Total Amount */}
            <div className="mt-6 pt-6 border-t-2 border-gray-100">
              <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white p-5 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="text-xs text-gray-400 mt-1">Including all charges</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-blue-600">KES {formatCurrency(totalAmount())}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Additional Notes</h2>
          </div>
          <div className="p-6">
            <textarea 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
              rows={3} 
              value={form.notes} 
              onChange={e => setForm({ ...form, notes: e.target.value })} 
              placeholder="Add any additional notes or comments about this invoice..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link 
            to="/landlord/invoices" 
            className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200"
          >
            Cancel
          </Link>
          <button 
            type="submit" 
            disabled={saving} 
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-200 inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Invoice...
              </>
            ) : (
              <>
                <Plus size={18} />
                Create Invoice
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}