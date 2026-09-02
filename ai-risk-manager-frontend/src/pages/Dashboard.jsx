import StatusChip from '../components/StatusChip';
import { Activity, ShieldOff, AlertTriangle, TrendingDown, ArrowUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Dashboard = () => {
  const transactions = [
    { id: "TXN-8821", amount: "₹12,500", method: "card", decision: "BLOCK", score: 0.91, time: "2 min ago" },
    { id: "TXN-8820", amount: "₹3,200",  method: "upi",  decision: "ALLOW", score: 0.08, time: "4 min ago" },
    { id: "TXN-8819", amount: "₹45,000", method: "card", decision: "FLAG",  score: 0.62, time: "7 min ago" },
    { id: "TXN-8818", amount: "₹800",    method: "wallet", decision: "ALLOW", score: 0.04, time: "9 min ago" },
    { id: "TXN-8817", amount: "₹28,750", method: "netbanking", decision: "FLAG", score: 0.55, time: "12 min ago" },
    { id: "TXN-8816", amount: "₹1,100",  method: "upi",  decision: "ALLOW", score: 0.11, time: "15 min ago" },
    { id: "TXN-8815", amount: "₹99,999", method: "card", decision: "BLOCK", score: 0.95, time: "18 min ago" },
    { id: "TXN-8814", amount: "₹5,500",  method: "card", decision: "ALLOW", score: 0.22, time: "21 min ago" },
    { id: "TXN-8813", amount: "₹7,800",  method: "upi",  decision: "ALLOW", score: 0.18, time: "25 min ago" },
    { id: "TXN-8812", amount: "₹34,200", method: "card", decision: "FLAG",  score: 0.71, time: "29 min ago" },
    { id: "TXN-8811", amount: "₹2,300",  method: "wallet", decision: "ALLOW", score: 0.07, time: "33 min ago" },
    { id: "TXN-8810", amount: "₹18,000", method: "card", decision: "BLOCK", score: 0.88, time: "38 min ago" }
  ];

  const chartData = [
    { day: "Mon", allow: 180, flag: 12, block: 3 },
    { day: "Tue", allow: 220, flag: 18, block: 5 },
    { day: "Wed", allow: 195, flag: 9,  block: 2 },
    { day: "Thu", allow: 310, flag: 24, block: 8 },
    { day: "Fri", allow: 280, flag: 31, block: 12 },
    { day: "Sat", allow: 150, flag: 7,  block: 2 },
    { day: "Sun", allow: 149, flag: 11, block: 4 }
  ];

  const getScoreColor = (score) => {
    if (score < 0.5) return 'text-[#4edea3]';
    if (score < 0.8) return 'text-[#ffb95f]';
    return 'text-[#ffb4ab]';
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-lg">
          <p className="text-sm font-medium text-[#e4e1ed] mb-2">{payload[0].payload.day}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs text-[#c7c4d7]">
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.name.toUpperCase()}:
              </span> {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
        {/* Top row - 4 stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Transactions Today */}
          <div className="data-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="text-[#c0c1ff]" size={24} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70">
                TRANSACTIONS TODAY
              </span>
            </div>
            <p className="text-3xl font-bold text-[#e4e1ed] font-mono">1,284</p>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUp size={14} className="text-[#4edea3]" />
              <span className="text-sm text-[#4edea3]">+12% vs yesterday</span>
            </div>
          </div>

          {/* Card 2: Blocked */}
          <div className="data-card p-6">
            <div className="flex items-center justify-between mb-4">
              <ShieldOff className="text-[#ffb4ab]" size={24} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70">
                BLOCKED
              </span>
            </div>
            <p className="text-3xl font-bold text-[#ffb4ab]">23</p>
            <p className="text-sm text-[#c7c4d7] mt-2">1.8% block rate</p>
          </div>

          {/* Card 3: Flagged for Review */}
          <div className="data-card p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="text-[#ffb95f]" size={24} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70">
                FLAGGED
              </span>
            </div>
            <p className="text-3xl font-bold text-[#ffb95f]">67</p>
            <p className="text-sm text-[#c7c4d7] mt-2">5.2% flag rate</p>
          </div>

          {/* Card 4: Avg Fraud Score */}
          <div className="data-card p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingDown className="text-[#4edea3]" size={24} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70">
                AVG FRAUD SCORE
              </span>
            </div>
            <p className="text-3xl font-bold text-[#4edea3]">0.14</p>
            <p className="text-sm text-[#c7c4d7] mt-2">Low risk baseline</p>
          </div>
        </div>

        {/* Second row - 2 panels */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left panel - Recent Decisions table */}
          <div className="lg:col-span-3 glass-panel rounded-lg p-5">
            <h3 className="text-lg font-semibold text-[#e4e1ed] mb-4">Recent Decisions</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 pb-3">
                      Transaction ID
                    </th>
                    <th className="text-left text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 pb-3">
                      Amount
                    </th>
                    <th className="text-left text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 pb-3">
                      Method
                    </th>
                    <th className="text-left text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 pb-3">
                      Decision
                    </th>
                    <th className="text-left text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 pb-3">
                      Fraud Score
                    </th>
                    <th className="text-left text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 pb-3">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr 
                      key={txn.id} 
                      className="hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      <td className="py-3 text-sm text-[#e4e1ed] font-mono">{txn.id}</td>
                      <td className="py-3 text-sm text-[#e4e1ed]">{txn.amount}</td>
                      <td className="py-3 text-sm text-[#c7c4d7] capitalize">{txn.method}</td>
                      <td className="py-3">
                        <StatusChip status={txn.decision} />
                      </td>
                      <td className={`py-3 text-sm font-medium ${getScoreColor(txn.score)}`}>
                        {(txn.score * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 text-sm text-[#c7c4d7]">{txn.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel - Risk Distribution chart */}
          <div className="lg:col-span-2 glass-panel rounded-lg p-5">
            <h3 className="text-lg font-semibold text-[#e4e1ed] mb-4">
              Decision Breakdown — Last 7 Days
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#c7c4d7', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#c7c4d7', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                  formatter={(value) => value.toUpperCase()}
                />
                <Bar 
                  dataKey="allow" 
                  stackId="a" 
                  fill="#4edea3" 
                  fillOpacity={0.3}
                  name="allow"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="flag" 
                  stackId="a" 
                  fill="#ffb95f" 
                  fillOpacity={0.4}
                  name="flag"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="block" 
                  stackId="a" 
                  fill="#ffb4ab" 
                  fillOpacity={0.5}
                  name="block"
                  radius={[0, 0, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
  );
};

export default Dashboard;
