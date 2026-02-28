import { AlertCircle, Building2, CheckCircle, Clock, DollarSign, Home, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/helpers'

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .db {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: #f4f6f9;
    min-height: 100%;
    padding: 28px 28px 40px;
    box-sizing: border-box;
  }

  /* ── fade up ── */
  @keyframes db-up {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .db-fade { animation: db-up 280ms ease both; }
  .db-fade:nth-child(1) { animation-delay: 0ms; }
  .db-fade:nth-child(2) { animation-delay: 60ms; }
  .db-fade:nth-child(3) { animation-delay: 120ms; }
  .db-fade:nth-child(4) { animation-delay: 180ms; }
  .db-fade:nth-child(5) { animation-delay: 240ms; }

  /* ── white card ── */
  .db-card {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  }

  /* ── greeting bar ── */
  .db-greeting {
    margin-bottom: 24px;
  }
  .db-greeting-name {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a2e;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .db-greeting-sub {
    font-size: 12.5px;
    color: #9399a6;
    margin-top: 3px;
  }

  /* ── section title ── */
  .db-section-title {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a2e;
    letter-spacing: -0.01em;
    margin-bottom: 14px;
  }

  /* ── overview grid ── */
  .db-overview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  @media (max-width: 900px) {
    .db-overview { grid-template-columns: 1fr; }
  }

  /* overview left: stat cards */
  .db-overview-left {
    padding: 20px 22px;
  }

  .db-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
    margin-top: 4px;
  }

  .db-metric {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .db-metric-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .db-metric-label {
    font-size: 10.5px;
    font-weight: 500;
    color: #9399a6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1;
    margin-bottom: 4px;
  }

  .db-metric-value {
    font-size: 26px;
    font-weight: 700;
    color: #1a1a2e;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .db-metric-value.sm {
    font-size: 17px;
    letter-spacing: -0.02em;
  }

  .db-metric-delta {
    font-size: 11px;
    color: #9399a6;
    margin-top: 2px;
    display: flex;
    align-items: center;
    gap: 3px;
  }

  /* overview right: outstanding */
  .db-overview-right {
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .db-outstanding-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .db-outstanding-label {
    font-size: 11px;
    font-weight: 500;
    color: #9399a6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }

  .db-outstanding-value {
    font-size: 30px;
    font-weight: 700;
    color: #d63031;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  .db-outstanding-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #fff0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* ── status section ── */
  .db-status-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }
  @media (max-width: 800px) {
    .db-status-grid { grid-template-columns: 1fr; }
  }

  .db-status-card {
    padding: 18px 20px;
  }

  .db-status-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid #f2f4f7;
  }

  .db-status-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .db-status-label {
    font-size: 12.5px;
    font-weight: 600;
    color: #1a1a2e;
    flex: 1;
    min-width: 0;
    letter-spacing: -0.01em;
  }

  .db-status-badge {
    font-size: 10.5px;
    font-weight: 600;
    color: #9399a6;
    background: #f2f4f7;
    border-radius: 20px;
    padding: 2px 8px;
    flex-shrink: 0;
  }

  .db-tenant-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px solid #f7f8fa;
  }
  .db-tenant-row:last-child { border-bottom: none; }

  .db-tenant-name {
    font-size: 12.5px;
    font-weight: 500;
    color: #2d3142;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .db-tenant-unit {
    font-size: 11px;
    color: #c0c6d4;
    margin-top: 1px;
  }

  .db-tenant-amount {
    font-size: 12.5px;
    font-weight: 600;
    color: #2d3142;
    white-space: nowrap;
    text-align: right;
  }

  .db-empty {
    font-size: 12px;
    color: #c0c6d4;
    padding: 4px 0;
  }

  /* ── table card ── */
  .db-table-card {
    overflow: hidden;
  }

  .db-table-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 14px;
    border-bottom: 1px solid #f2f4f7;
  }

  .db-table-title {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a2e;
    letter-spacing: -0.01em;
  }

  .db-table-meta {
    font-size: 11.5px;
    color: #b0b8c8;
    font-weight: 400;
  }

  table.db-table {
    width: 100%;
    border-collapse: collapse;
  }

  .db-table thead tr {
    background: #f8f9fb;
    border-bottom: 1px solid #eff1f5;
  }

  .db-table th {
    padding: 9px 18px;
    font-size: 10.5px;
    font-weight: 600;
    color: #aab0be;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: left;
    white-space: nowrap;
  }

  .db-table td {
    padding: 12px 18px;
    font-size: 12.5px;
    color: #444c60;
    border-bottom: 1px solid #f2f4f7;
    line-height: 1.4;
  }

  .db-table tbody tr:last-child td { border-bottom: none; }
  .db-table tbody tr { transition: background 100ms ease; }
  .db-table tbody tr:hover { background: #fafbfc; }

  .db-table .td-name { font-weight: 500; color: #1a1a2e; }
  .db-table .td-unit { color: #aab0be; }
  .db-table .td-amount { font-weight: 600; color: #0e7a4a; white-space: nowrap; }
  .db-table .td-date  { color: #8a93a6; white-space: nowrap; }
  .db-table .td-method { color: #8a93a6; }

  /* row number */
  .db-table .td-num {
    color: #c0c6d4;
    font-size: 11.5px;
    font-weight: 500;
    width: 32px;
  }
`

/* ─────────────────────────────────────────
   STAT METRIC
───────────────────────────────────────── */
function Metric({ label, value, icon: Icon, iconBg, iconColor, small }) {
  return (
    <div className="db-metric">
      <div className="db-metric-icon-wrap" style={{ background: iconBg }}>
        <Icon size={16} color={iconColor} />
      </div>
      <p className="db-metric-label">{label}</p>
      <p className={`db-metric-value${small ? ' sm' : ''}`}>{value}</p>
    </div>
  )
}

/* ─────────────────────────────────────────
   STATUS LIST
───────────────────────────────────────── */
function TenantStatusList({ title, items, icon: Icon, iconColor, iconBg }) {
  return (
    <div className="db-card db-status-card db-fade">
      <div className="db-status-head">
        <div className="db-status-icon" style={{ background: iconBg }}>
          <Icon size={13} color={iconColor} />
        </div>
        <p className="db-status-label">{title}</p>
        <span className="db-status-badge">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="db-empty">None this month</p>
      ) : (
        <div>
          {items.map((item) => (
            <div key={item.invoice_id} className="db-tenant-row">
              <div style={{ minWidth: 0 }}>
                <p className="db-tenant-name">{item.tenant_name}</p>
                <p className="db-tenant-unit">{item.unit}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p className="db-tenant-amount">KES {formatCurrency(item.remaining_balance)}</p>
                <div style={{ marginTop: '3px' }}>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────── */
export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reports/dashboard/')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  const { units, revenue_this_month, total_outstanding, current_month, recent_payments } = data
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <>
      <style>{STYLES}</style>
      <div className="db">

        {/* ── Greeting ── */}
        <div className="db-greeting db-fade">
          <p className="db-greeting-name">Dashboard</p>
          <p className="db-greeting-sub">
            {monthNames[current_month.month]} {current_month.year} overview
          </p>
        </div>

        {/* ── Works Overview + Outstanding ── */}
        <p className="db-section-title db-fade">Works Overview</p>
        <div className="db-overview db-fade">

          {/* Left: 4 metrics */}
          <div className="db-card db-overview-left">
            <div className="db-metrics-grid">
              <Metric
                label="Total Units"
                value={units.total}
                icon={Building2}
                iconBg="#eef0ff"
                iconColor="#4c5bd4"
              />
              <Metric
                label="Occupied"
                value={units.occupied}
                icon={Home}
                iconBg="#e6faf3"
                iconColor="#0e7a4a"
              />
              <Metric
                label="Vacant"
                value={units.vacant}
                icon={Home}
                iconBg="#f4f4f6"
                iconColor="#9399a6"
              />
              <Metric
                label="Revenue This Month"
                value={`KES ${formatCurrency(revenue_this_month)}`}
                icon={TrendingUp}
                iconBg="#e6faf3"
                iconColor="#0e7a4a"
                small
              />
            </div>
          </div>

          {/* Right: outstanding */}
          <div className="db-card db-overview-right">
            <div className="db-outstanding-row">
              <div>
                <p className="db-outstanding-label">Total Outstanding Balance</p>
                <p className="db-outstanding-value">KES {formatCurrency(total_outstanding)}</p>
              </div>
              <div className="db-outstanding-icon">
                <DollarSign size={22} color="#d63031" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment Status ── */}
        <p className="db-section-title db-fade" style={{ marginTop: '4px' }}>
          {monthNames[current_month.month]} Payment Status
        </p>
        <div className="db-status-grid">
          <TenantStatusList
            title="Paid"
            items={current_month.paid}
            icon={CheckCircle}
            iconColor="#0e7a4a"
            iconBg="#e6faf3"
          />
          <TenantStatusList
            title="Partially Paid / Overdue"
            items={current_month.partial}
            icon={Clock}
            iconColor="#b07d10"
            iconBg="#fdf8e6"
          />
          <TenantStatusList
            title="Not Paid"
            items={current_month.unpaid}
            icon={AlertCircle}
            iconColor="#d63031"
            iconBg="#fff0f0"
          />
        </div>

        {/* ── Recent Payments ── */}
        {recent_payments.length > 0 && (
          <div className="db-card db-table-card db-fade" style={{ marginTop: '4px' }}>
            <div className="db-table-head">
              <p className="db-table-title">Recent Payments</p>
              <p className="db-table-meta">Showing 1–{recent_payments.length} of {recent_payments.length}</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="db-table">
                <thead>
                  <tr>
                    <th style={{ width: '32px' }}>No.</th>
                    <th>Tenant</th>
                    <th>Unit</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_payments.map((p, i) => (
                    <tr key={p.id}>
                      <td className="td-num">{i + 1}</td>
                      <td className="td-name">{p.tenant_name}</td>
                      <td className="td-unit">{p.unit}</td>
                      <td className="td-amount">KES {formatCurrency(p.amount)}</td>
                      <td className="td-date">{formatDate(p.payment_date)}</td>
                      <td className="td-method">{p.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  )
}