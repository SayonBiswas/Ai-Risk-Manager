import { useState } from 'react';
import StatusChip from '../components/StatusChip';
import ScoreBar from '../components/ScoreBar';
import { RotateCcw, Search } from 'lucide-react';

const ReturnScorer = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const returns = [
    { id: 'RET001', orderId: 'ORD12345', amount: 89.99, riskScore: 0.25, riskLevel: 'LOW', reason: 'Item damaged', timestamp: '2024-01-15T09:00:00Z' },
    { id: 'RET002', orderId: 'ORD12346', amount: 250.00, riskScore: 0.65, riskLevel: 'MEDIUM', reason: 'Wrong item', timestamp: '2024-01-15T10:30:00Z' },
    { id: 'RET003', orderId: 'ORD12347', amount: 450.00, riskScore: 0.88, riskLevel: 'HIGH', reason: 'No longer needed', timestamp: '2024-01-15T11:45:00Z' },
    { id: 'RET004', orderId: 'ORD12348', amount: 125.00, riskScore: 0.15, riskLevel: 'LOW', reason: 'Defective', timestamp: '2024-01-15T13:00:00Z' },
    { id: 'RET005', orderId: 'ORD12349', amount: 899.00, riskScore: 0.72, riskLevel: 'HIGH', reason: 'Not as described', timestamp: '2024-01-15T14:15:00Z' },
  ];

  const filteredReturns = returns.filter(ret =>
    ret.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#e4e1ed]">Return Scorer</h2>
        <div className="flex items-center gap-2">
          <RotateCcw className="text-[#ffb95f]" size={20} />
          <span className="text-sm text-[#c7c4d7]">Risk-based return analysis</span>
        </div>
      </div>

      <div className="data-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#c7c4d7]" size={20} />
          <input
            type="text"
            placeholder="Search by return ID or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1f1f27] border border-[#464554] rounded-lg text-[#e4e1ed] placeholder-[#464554] focus:outline-none focus:border-[#c0c1ff] focus:ring-1 focus:ring-[#c0c1ff]"
          />
        </div>
      </div>

      <div className="data-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1f1f27]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Return ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Risk Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Risk Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#464554]">
            {filteredReturns.map((ret) => (
              <tr key={ret.id} className="hover:bg-[#1f1f27] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#e4e1ed]">
                  {ret.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e4e1ed]">
                  {ret.orderId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e4e1ed]">
                  ${ret.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-32">
                    <ScoreBar score={ret.riskScore} />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusChip status={ret.riskLevel} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#c7c4d7]">
                  {ret.reason}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#c7c4d7]">
                  {new Date(ret.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReturnScorer;
