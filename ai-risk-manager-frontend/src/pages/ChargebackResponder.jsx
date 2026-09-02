import { useState } from 'react';
import StatusChip from '../components/StatusChip';
import ScoreBar from '../components/ScoreBar';
import { CreditCard, Search, Clock } from 'lucide-react';

const ChargebackResponder = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const chargebacks = [
    { id: 'CB001', transactionId: 'TXN98765', amount: 1250.00, riskScore: 0.78, status: 'PENDING', reason: 'Unauthorized transaction', timestamp: '2024-01-15T08:00:00Z' },
    { id: 'CB002', transactionId: 'TXN98766', amount: 350.00, riskScore: 0.45, status: 'REVIEWING', reason: 'Product not received', timestamp: '2024-01-15T09:30:00Z' },
    { id: 'CB003', transactionId: 'TXN98767', amount: 890.00, riskScore: 0.92, status: 'PENDING', reason: 'Duplicate charge', timestamp: '2024-01-15T11:00:00Z' },
    { id: 'CB004', transactionId: 'TXN98768', amount: 175.00, riskScore: 0.23, status: 'RESOLVED', reason: 'Credit not processed', timestamp: '2024-01-15T12:30:00Z' },
    { id: 'CB005', transactionId: 'TXN98769', amount: 560.00, riskScore: 0.67, status: 'REVIEWING', reason: 'Service not provided', timestamp: '2024-01-15T14:00:00Z' },
  ];

  const filteredChargebacks = chargebacks.filter(cb =>
    cb.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cb.transactionId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#e4e1ed]">Chargeback Responder</h2>
        <div className="flex items-center gap-2">
          <Clock className="text-[#c0c1ff]" size={20} />
          <span className="text-sm text-[#c7c4d7]">Automated response system</span>
        </div>
      </div>

      <div className="data-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#c7c4d7]" size={20} />
          <input
            type="text"
            placeholder="Search by chargeback ID or transaction ID..."
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
                Chargeback ID
              </th>
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
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#c7c4d7] uppercase tracking-wider">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#464554]">
            {filteredChargebacks.map((cb) => (
              <tr key={cb.id} className="hover:bg-[#1f1f27] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#e4e1ed]">
                  {cb.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e4e1ed]">
                  {cb.transactionId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e4e1ed]">
                  ${cb.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-32">
                    <ScoreBar score={cb.riskScore} />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusChip status={cb.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#c7c4d7]">
                  {cb.reason}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#c7c4d7]">
                  {new Date(cb.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChargebackResponder;
