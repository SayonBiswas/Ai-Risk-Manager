import { useState } from 'react';
import StatusChip from '../components/StatusChip';
import ScoreBar from '../components/ScoreBar';
import { Search, Shield } from 'lucide-react';

const FraudDetect = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const transactions = [
    { id: 'TXN001', amount: 1250.00, riskScore: 0.85, status: 'BLOCK', timestamp: '2024-01-15T10:30:00Z' },
    { id: 'TXN002', amount: 450.00, riskScore: 0.45, status: 'FLAG', timestamp: '2024-01-15T11:45:00Z' },
    { id: 'TXN003', amount: 89.99, riskScore: 0.12, status: 'ALLOW', timestamp: '2024-01-15T12:00:00Z' },
    { id: 'TXN004', amount: 2100.00, riskScore: 0.92, status: 'BLOCK', timestamp: '2024-01-15T13:15:00Z' },
    { id: 'TXN005', amount: 175.00, riskScore: 0.35, status: 'ALLOW', timestamp: '2024-01-15T14:30:00Z' },
  ];

  const filteredTransactions = transactions.filter(txn =>
    txn.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#e4e1ed]">Fraud Detection</h2>
        <div className="flex items-center gap-2">
          <Shield className="text-[#4edea3]" size={20} />
          <span className="text-sm text-[#c7c4d7]">Real-time monitoring</span>
        </div>
      </div>

      <div className="data-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#c7c4d7]" size={20} />
          <input
            type="text"
            placeholder="Search by transaction ID..."
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
                Transaction ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Risk Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#464554]">
            {filteredTransactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-[#1f1f27] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#e4e1ed]">
                  {txn.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e4e1ed]">
                  ${txn.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-32">
                    <ScoreBar score={txn.riskScore} />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusChip status={txn.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#c7c4d7]">
                  {new Date(txn.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FraudDetect;
