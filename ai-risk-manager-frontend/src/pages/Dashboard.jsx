import { useState, useEffect } from 'react';
import {
  Activity, ShieldOff, AlertTriangle, TrendingDown, TrendingUp, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import Layout from '../components/Layout';
import StatusChip from '../components/StatusChip';
import { useTransactionStats, useTransactionList } from '../hooks/useTransactions';

// Helper to format date to day name
const formatDayName = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

// Helper to format time ago
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// Helper to format amount
const formatAmount = (amount, currency) => {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
  return `${symbol}${amount.toLocaleString()}`;
};

const scoreColor = (score) => {
  if (score < 0.5) return '#4edea3';
  if (score < 0.8) return '#ffb95f';
  return '#ffb4ab';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded p-2 text-xs text-[#e4e1ed]">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ icon: Icon, iconColor, value, valueColor, label, sub, trend, loading }) => {
  if (loading) {
    return (
      <div className="data-card rounded-xl p-5 flex flex-col gap-3">
        <div className="w-5 h-5 rounded bg-[#1f1f27] animate-pulse" />
        <div className="space-y-2">
          <div className="h-8 rounded bg-[#1f1f27] animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-[#1f1f27] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="data-card rounded-xl p-5 flex flex-col gap-3">
      <Icon size={18} color={iconColor} />
      <div>
        <p className="text-3xl font-bold font-mono" style={{ color: valueColor || '#e4e1ed' }}>
          {value}
        </p>
        <p className="text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mt-1">{label}</p>
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          <TrendingUp size={12} color="#4edea3" />
          <span className="text-xs text-[#4edea3]">{trend}</span>
        </div>
      )}
      {sub && <p className="text-xs text-[#c7c4d7]/50">{sub}</p>}
    </div>
  );
};

const Dashboard = () => {
  const [visible, setVisible] = useState(false);
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useTransactionStats();
  const { data, loading: transactionsLoading, error: transactionsError, refetch: refetchTransactions } = useTransactionList({ limit: 12 });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  // Prepare chart data from stats
  const chartData = stats?.seven_day_breakdown?.map(day => {
    const allow = Math.max(0, day.count - day.blocked - day.flagged);
    return {
      day: formatDayName(day.date),
      allow,
      flag: day.flagged,
      block: day.blocked,
    };
  }) || [];

  // Calculate rates
  const blockRate = stats?.today_count > 0 
    ? ((stats.blocked_count / stats.today_count) * 100).toFixed(1) 
    : '0.0';
  const flagRate = stats?.today_count > 0 
    ? ((stats.flagged_count / stats.today_count) * 100).toFixed(1) 
    : '0.0';

  if (!visible) {
    return (
      <Layout title="Risk Operations Center">
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-[#1f1f27] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3 h-72 rounded-xl bg-[#1f1f27] animate-pulse" />
          <div className="col-span-2 h-72 rounded-xl bg-[#1f1f27] animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Risk Operations Center">
      {/* Error banner */}
      {(statsError || transactionsError) && (
        <div className="mb-4 bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-[#ffb4ab]">Could not load data — please try again</span>
          <button
            onClick={() => {
              refetchStats();
              refetchTransactions();
            }}
            className="text-sm text-[#ffb4ab] hover:underline flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          iconColor="#c0c1ff"
          value={stats?.today_count?.toLocaleString() || '--'}
          label="Transactions Today"
          trend="+12.4% vs yesterday"
          loading={statsLoading}
        />
        <StatCard
          icon={ShieldOff}
          iconColor="#ffb4ab"
          value={stats?.blocked_count?.toLocaleString() || '--'}
          valueColor="#ffb4ab"
          label="Blocked"
          sub={`${blockRate}% block rate`}
          loading={statsLoading}
        />
        <StatCard
          icon={AlertTriangle}
          iconColor="#ffb95f"
          value={stats?.flagged_count?.toLocaleString() || '--'}
          valueColor="#ffb95f"
          label="Flagged for Review"
          sub={`${flagRate}% flag rate`}
          loading={statsLoading}
        />
        <StatCard
          icon={TrendingDown}
          iconColor="#4edea3"
          value={stats?.avg_fraud_score?.toFixed(2) || '--'}
          valueColor="#4edea3"
          label="Avg Fraud Score"
          sub="Low risk baseline"
          loading={statsLoading}
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-5 gap-4 mt-4">

        {/* Recent decisions table */}
        <div className="col-span-3 glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[#e4e1ed] font-semibold text-sm">Recent Decisions</p>
            <p className="text-xs text-[#c7c4d7]/50">Last 12 transactions</p>
          </div>
          
          {transactionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded bg-[#1f1f27] animate-pulse" />
              ))}
            </div>
          ) : data?.items?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#c7c4d7]/50">No transactions found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['TXN ID', 'Amount', 'Method', 'Decision', 'Fraud Score', 'Time'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] uppercase tracking-widest text-[#c7c4d7]/50 pb-3 font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 font-mono text-xs text-[#c7c4d7]">
                      {row.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 text-[#e4e1ed]">
                      {formatAmount(Number(row.amount), row.currency)}
                    </td>
                    <td className="py-3 text-[#c7c4d7]/70 capitalize">{row.payment_method}</td>
                    <td className="py-3"><StatusChip status={row.decision} /></td>
                    <td className="py-3 font-mono text-xs" style={{ color: scoreColor(row.fraud_score) }}>
                      {row.fraud_score.toFixed(2)}
                    </td>
                    <td className="py-3 text-xs text-[#c7c4d7]/40">
                      {formatTimeAgo(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Chart */}
        <div className="col-span-2 glass-panel rounded-xl p-5">
          <p className="text-[#e4e1ed] font-semibold text-sm mb-4">7-Day Decision Breakdown</p>
          {statsLoading ? (
            <div className="h-[220px] rounded bg-[#1f1f27] animate-pulse" />
          ) : chartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-sm text-[#c7c4d7]/50">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={14} barGap={2}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: 'rgba(199,196,215,0.5)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="allow" name="Allow" fill="#4edea3" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                <Bar dataKey="flag"  name="Flag"  fill="#ffb95f" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                <Bar dataKey="block" name="Block" fill="#ffb4ab" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default Dashboard;