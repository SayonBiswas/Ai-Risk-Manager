import { useState, useEffect } from 'react';
import {
  Activity, ShieldOff, AlertTriangle, TrendingDown, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import Layout from '../components/Layout';
import StatusChip from '../components/StatusChip';

const RECENT = [
  { id: 'TXN-8821', amount: '₹12,500', method: 'card',       decision: 'BLOCK', score: 0.91, time: '2m ago' },
  { id: 'TXN-8820', amount: '₹3,200',  method: 'upi',        decision: 'ALLOW', score: 0.08, time: '4m ago' },
  { id: 'TXN-8819', amount: '₹45,000', method: 'card',       decision: 'FLAG',  score: 0.62, time: '7m ago' },
  { id: 'TXN-8818', amount: '₹800',    method: 'wallet',     decision: 'ALLOW', score: 0.04, time: '9m ago' },
  { id: 'TXN-8817', amount: '₹28,750', method: 'netbanking', decision: 'FLAG',  score: 0.55, time: '12m ago' },
  { id: 'TXN-8816', amount: '₹1,100',  method: 'upi',        decision: 'ALLOW', score: 0.11, time: '15m ago' },
  { id: 'TXN-8815', amount: '₹99,999', method: 'card',       decision: 'BLOCK', score: 0.95, time: '18m ago' },
  { id: 'TXN-8814', amount: '₹5,500',  method: 'card',       decision: 'ALLOW', score: 0.22, time: '21m ago' },
  { id: 'TXN-8813', amount: '₹7,800',  method: 'upi',        decision: 'ALLOW', score: 0.18, time: '25m ago' },
  { id: 'TXN-8812', amount: '₹34,200', method: 'card',       decision: 'FLAG',  score: 0.71, time: '29m ago' },
  { id: 'TXN-8811', amount: '₹2,300',  method: 'wallet',     decision: 'ALLOW', score: 0.07, time: '33m ago' },
  { id: 'TXN-8810', amount: '₹18,000', method: 'card',       decision: 'BLOCK', score: 0.88, time: '38m ago' },
];

const CHART = [
  { day: 'Mon', allow: 180, flag: 12, block: 3 },
  { day: 'Tue', allow: 220, flag: 18, block: 5 },
  { day: 'Wed', allow: 195, flag: 9,  block: 2 },
  { day: 'Thu', allow: 310, flag: 24, block: 8 },
  { day: 'Fri', allow: 280, flag: 31, block: 12 },
  { day: 'Sat', allow: 150, flag: 7,  block: 2 },
  { day: 'Sun', allow: 149, flag: 11, block: 4 },
];

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

const StatCard = ({ icon: Icon, iconColor, value, valueColor, label, sub, trend }) => (
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

const Dashboard = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

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
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          iconColor="#c0c1ff"
          value="1,284"
          label="Transactions Today"
          trend="+12.4% vs yesterday"
        />
        <StatCard
          icon={ShieldOff}
          iconColor="#ffb4ab"
          value="23"
          valueColor="#ffb4ab"
          label="Blocked"
          sub="1.8% block rate"
        />
        <StatCard
          icon={AlertTriangle}
          iconColor="#ffb95f"
          value="67"
          valueColor="#ffb95f"
          label="Flagged for Review"
          sub="5.2% flag rate"
        />
        <StatCard
          icon={TrendingDown}
          iconColor="#4edea3"
          value="0.14"
          valueColor="#4edea3"
          label="Avg Fraud Score"
          sub="Low risk baseline"
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
              {RECENT.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="py-3 font-mono text-xs text-[#c7c4d7]">{row.id}</td>
                  <td className="py-3 text-[#e4e1ed]">{row.amount}</td>
                  <td className="py-3 text-[#c7c4d7]/70 capitalize">{row.method}</td>
                  <td className="py-3"><StatusChip status={row.decision} /></td>
                  <td className="py-3 font-mono text-xs" style={{ color: scoreColor(row.score) }}>
                    {row.score.toFixed(2)}
                  </td>
                  <td className="py-3 text-xs text-[#c7c4d7]/40">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <div className="col-span-2 glass-panel rounded-xl p-5">
          <p className="text-[#e4e1ed] font-semibold text-sm mb-4">7-Day Decision Breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHART} barSize={14} barGap={2}>
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
        </div>

      </div>
    </Layout>
  );
};

export default Dashboard;