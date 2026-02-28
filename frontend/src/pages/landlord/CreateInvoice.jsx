import { ArrowLeft, Loader2, Minus, Plus } from 'lucide-react'
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

  const [form, setForm] = useState({
    tenant: preselectedTenant || '',
    unit: '',
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
        // preselectedTenant is a TenantProfile ID; resolve to User ID for the form
        const t = r.data.find(t => t.id === parseInt(preselectedTenant))
        if (t) {
          setForm(f => ({
            ...f,
            tenant: String(t.user.id),   // Invoice.tenant FK expects User ID
            unit: t.unit || '',
            base_rent: t.unit_detail?.base_rent || '',
          }))
        }
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleTenantChange = (userId) => {
    // Options use t.user.id as value, so look up by user ID
    const t = tenants.find(t => t.user.id === parseInt(userId))
    setForm(f => ({
      ...f,
      tenant: userId,                    // User ID — what the API expects
      unit: t?.unit || '',
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
      toast.success('Invoice created successfully.')
      navigate(`/landlord/invoices/${data.id}`)
    } catch (err) {
      // Surface API validation errors inline and show a friendly toast
      if (err.response && err.response.data) {
        const data = err.response.data
        setErrors(data)
        // Prefer showing non-field messages directly without the key name
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

  if (loading) return <div className="animate-pulse text-slate-400 py-8 text-center">Loading…</div>

  return (
    <div className="space-y-6 max-w-3xl">
      {errors.non_field_errors && (
        <div className="card bg-red-50 border border-red-100 text-red-700">
          {errors.non_field_errors.map((m, i) => (
            <div key={i}>{m}</div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <Link to="/landlord/invoices" className="btn-secondary !px-3 !py-2"><ArrowLeft size={16} /></Link>
        <h1 className="text-2xl font-bold text-slate-900">Create Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant & Period */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-800">Invoice Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Tenant *</label>
              <select className="input" required value={form.tenant} onChange={e => handleTenantChange(e.target.value)}>
                <option value="">Select tenant…</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.user.id}>
                    {t.user.first_name} {t.user.last_name} – {t.unit_detail?.unit_number || 'No unit'}
                  </option>
                ))}
              </select>
              {errors.tenant && <div className="text-sm text-red-600 mt-1">{Array.isArray(errors.tenant) ? errors.tenant.join(', ') : errors.tenant}</div>}
            </div>
            <div>
              <label className="label">Billing Period *</label>
              <div className="flex gap-2">
                <select className="input" required value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select className="input" required value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Invoice Date *</label>
              <input type="date" className="input" required value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} />
              {errors.invoice_date && <div className="text-sm text-red-600 mt-1">{Array.isArray(errors.invoice_date) ? errors.invoice_date.join(', ') : errors.invoice_date}</div>}
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" className="input" required value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              {errors.due_date && <div className="text-sm text-red-600 mt-1">{Array.isArray(errors.due_date) ? errors.due_date.join(', ') : errors.due_date}</div>}
            </div>
          </div>
        </div>

        {/* Charges */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-800">Charges</h2>

          <div>
            <label className="label">Base Rent (KES) *</label>
            <input type="number" step="0.01" min="0" className="input" required value={form.base_rent}
              onChange={e => setForm({ ...form, base_rent: e.target.value })} placeholder="0.00" />
            {errors.base_rent && <div className="text-sm text-red-600 mt-1">{Array.isArray(errors.base_rent) ? errors.base_rent.join(', ') : errors.base_rent}</div>}
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="space-y-2">
              <label className="label">Additional Charges</label>
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input className="input flex-1" placeholder="Description (e.g. Water)" value={item.description}
                    onChange={e => updateLineItem(idx, 'description', e.target.value)} />
                  <input type="number" step="0.01" min="0" className="input w-36" placeholder="Amount"
                    value={item.amount} onChange={e => updateLineItem(idx, 'amount', e.target.value)} />
                  <button type="button" onClick={() => removeLineItem(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                    <Minus size={16} />
                  </button>
                  {errors.line_items && errors.line_items[idx] && (
                    <div className="text-sm text-red-600 mt-1">{Object.entries(errors.line_items[idx]).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Preset charge buttons */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_CHARGES.map(charge => (
                <button key={charge} type="button" onClick={() => addLineItem(charge)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors">
                  + {charge}
                </button>
              ))}
              <button type="button" onClick={() => addLineItem('')}
                className="text-xs px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-primary-400 hover:text-primary-700 transition-colors">
                <Plus size={12} className="inline mr-1" />Custom
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Total Amount</span>
            <span className="text-xl font-bold text-primary-700">KES {formatCurrency(totalAmount())}</span>
          </div>
        </div>

        <div className="card">
          <label className="label">Notes (optional)</label>
          <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes…" />
        </div>

        <div className="flex gap-3">
          <Link to="/landlord/invoices" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
