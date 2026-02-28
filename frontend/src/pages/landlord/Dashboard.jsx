import { AlertCircle, Building2, CheckCircle, Clock, DollarSign, Home, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import api from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/helpers'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');

  .db-root {
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #111;
  }

  /* ── Fade-in stagger ── */
  @keyframes db-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .db-animate {
    opacity: 0;
    animation: db-up 320ms ease forwards;
  }
  .db-animate:nth-child(1)  { animation-delay: 0ms; }
  .db-animate:nth-child(2)  { animation-delay: 50ms; }
  .db-animate:nth-child(3)  { animation-delay: 100ms; }
  .db-animate:nth-child(4)  { animation-delay: 150ms; }
  .db-animate:nth-child(5)  { animation-delay: 200ms; }
  .db-animate:nth-child(6)  { animation-delay: 250ms; }

  /* ── Stat card ── */
  .db-stat {
    background: #fff;
    border: 1px solid #ebebeb;
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    transition: box-shadow 150ms ease, border-color 150ms ease;
  }
  .db-stat:hover {
    border-color: #d8d8d8;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }

  .db-stat-label {
    font-size: 11.5px;
    font-weight: 500;
    color: #999;
    letter-spacing: 0.01em;
    line-height: 1;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.045em;
  }

  .db-stat-value {
    font-size: 22px;
    font-weight: 700;
    color: #0f0f0f;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .db-stat-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* ── Outstanding card ── */
  .db-outstanding {
    background: #fff;
    border: 1px solid #ebebeb;
    border-radius: 12px;
    padding: 20px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    transition: box-shadow 150ms ease;
  }
  .db-outstanding:hover {
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }
  .db-outstanding-label {
    font-size: 12px;
    font-weight: 500;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }
  .db-outstanding-value {
    font-size: 28px;
    font-weight: 700;
    color: #c0392b;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .db-outstanding-icon {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    background: #fff5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* ── Status lists ── */
  .db-status-card {
    background: #fff;
    border: 1px solid #ebebeb;
    border-radius: 12px;
    padding: 18px 20px;
    transition: box-shadow 150ms ease;
  }
  .db-status-card:hover {
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }

  .db-status-header {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f2f2f2;
  }

  .db-status-title {
    font-size: 12.5px;
    font-weight: 600;
    color: #222;
    letter-spacing: -0.01em;
  }

  .db-status-count {
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    color: #aaa;
    background: #f5f5f5;
    border-radius: 20px;
    padding: 2px 8px;
  }

  .db-tenant-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px solid #f6f6f6;
  }
  .db-tenant-row:last-child { border-bottom: none; }

  .db-tenant-name {
    font-size: 13px;
    font-weight: 500;
    color: #222;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .db-tenant-unit {
    font-size: 11px;
    color: #bbb;
    margin-top: 1px;
  }

  .db-tenant-amount {
    font-size: 13px;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    text-align: right;
    line-height: 1.3;
  }

  .db-empty {
    font-size: 12.5px;
    color: #ccc;
    padding: 4px 0;
  }

  /* ── Table card ── */
  .db-table-card {
    background: #fff;
    border: 1px solid #ebebeb;
    border-radius: 12px;
    overflow: hidden;
  }

  .db-table-header {
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .db-table-title {
    font-size: 13.5px;
    font-weight: 600;
    color: #111;
    letter-spacing: -0.01em;
  }

  .db-table-count {
    font-size: 11px;
    color: #bbb;
    font-weight: 500;
  }

  table.db-table {
    width: 100%;
    border-collapse: collapse;
  }

  .db-table thead tr {
    background: #fafafa;
    border-bottom: 1px solid #efefef;
  }

  .db-table th {
    padding: 9px 16px;
    font-size: 10.5px;
    font-weight: 600;
    color: #bbb;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: left;
    white-space: nowrap;
  }

  .db-table td {
    padding: 11px 16px;
    font-size: 13px;
    color: #333;
    border-bottom: 1px solid #f5f5f5;
    line-height: 1.4;
  }

  .db-table tbody tr:last-child td { border-bottom: none; }

  .db-table tbody tr {
    transition: background 100ms ease;
  }
  .db-table tbody tr:hover { background: #fafafa; }

  .db-table .td-name {
    font-weight: 500;
    color: #111;
  }
  .db-table .td-unit {
    color: #aaa;
  }
  .db-table .td-amount {
    font-weight: 600;
    color: #1a7a4a;
    white-space: nowrap;
  }
  .db-table .td-date {
    color: #888;
    white-space: nowrap;
  }
  .db-table .td-method {
    color: #888;
  }
`

function StatCard({ label, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="db-stat db-animate">
      <div>
        <p className="db-stat-label">{label}</p>
        <p className="db-stat-value">{value}</p>
      </div>
      <div className="db-stat-icon" style={{ background: iconBg }}>
        <Icon size={17} color={iconColor} />
      </div>
    </div>
  )
}

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
      <div className="db-root" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Heading ── */}
        <div className="db-animate" style={{ animationDelay: '0ms', opacity: 0 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f0f0f', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#aaa', marginTop: '4px', letterSpacing: '-0.005em' }}>
            {monthNames[current_month.month]} {current_month.year} overview
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <StatCard label="Total Units"         value={units.total}                                   icon={Building2}  iconBg="#f0f0f0"  iconColor="#555" />
          <StatCard label="Occupied"            value={units.occupied}                                icon={Home}       iconBg="#edfaf3"  iconColor="#1a7a4a" />
          <StatCard label="Vacant"              value={units.vacant}                                  icon={Home}       iconBg="#f5f5f5"  iconColor="#aaa" />
          <StatCard label="Revenue This Month"  value={`KES ${formatCurrency(revenue_this_month)}`}  icon={TrendingUp} iconBg="#edfaf3"  iconColor="#1a7a4a" />
        </div>

        {/* ── Outstanding balance ── */}
        <div className="db-outstanding db-animate">
          <div>
            <p className="db-outstanding-label">Total Outstanding Balance</p>
            <p className="db-outstanding-value">KES {formatCurrency(total_outstanding)}</p>
          </div>
          <div className="db-outstanding-icon">
            <DollarSign size={20} color="#e05252" />
          </div>
        </div>

        {/* ── Tenant status columns ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <TenantStatusList title="Paid"                    items={current_month.paid}    icon={CheckCircle} iconColor="#1a7a4a" />
          <TenantStatusList title="Partially Paid / Overdue" items={current_month.partial} icon={Clock}       iconColor="#b07d1a" />
          <TenantStatusList title="Not Paid"                items={current_month.unpaid}  icon={AlertCircle} iconColor="#c0392b" />
        </div>

        {/* ── Recent payments ── */}
        {recent_payments.length > 0 && (
          <div className="db-table-card db-animate">
            <div className="db-table-header">
              <p className="db-table-title">Recent Payments</p>
              <p className="db-table-count">{recent_payments.length} transactions</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Unit</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_payments.map((p) => (
                    <tr key={p.id}>
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

function TenantStatusList({ title, items, icon: Icon, iconColor }) {
  const iconBgMap = {
    '#1a7a4a': '#edfaf3',
    '#b07d1a': '#fdf8ed',
    '#c0392b': '#fff5f5',
  }
  const iconBg = iconBgMap[iconColor] ?? '#f5f5f5'

  return (
    <div className="db-status-card db-animate">
      <div className="db-status-header">
        <div style={{
          width: '26px', height: '26px', borderRadius: '7px',
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={13} color={iconColor} />
        </div>
        <p className="db-status-title">{title}</p>
        <span className="db-status-count">{items.length}</span>
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
                <p className="db-tenant-amount">KES {formatCurrency(title === 'Paid' ? item.amount_paid : item.remaining_balance)}</p>
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