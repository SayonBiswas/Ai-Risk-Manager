import { useState } from 'react';
import Layout from '../components/Layout';
import StatusChip from '../components/StatusChip';
import ScoreBar from '../components/ScoreBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { SearchX } from 'lucide-react';
import apiClient from '../api/client';

const FraudDetect = () => {
  const [formData, setFormData] = useState({
    transaction_id: '',
    customer_id: '',
    amount: '',
    currency: 'INR',
    ip_address: '',
    payment_method: '',
    merchant_category_code: '',
    device_id: '',
    is_international: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['transaction_id', 'amount', 'currency', 'customer_id', 'ip_address', 'merchant_category_code'];
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const loadSampleTransaction = () => {
    setFormData({
      transaction_id: 'TXN-DEMO-001',
      amount: '45000',
      currency: 'INR',
      customer_id: 'CUST-DEMO-99',
      payment_method: 'card',
      ip_address: '203.0.113.42',
      merchant_category_code: '5411',
      device_id: 'DEV-UNKNOWN',
      is_international: true,
    });
    setErrors({});
    setResult(null);
    setApiError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setApiError(null);
    setResult(null);

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount).toFixed(2),
        metadata: {},
      };

      const response = await apiClient.post('/v1/fraud/detect', payload);
      setResult(response.data);
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Failed to analyze transaction');
    } finally {
      setLoading(false);
    }
  };

  const getBulletColor = (decision) => {
    const decisionUpper = decision?.toUpperCase();
    if (decisionUpper === 'ALLOW') return '#4edea3';
    if (decisionUpper === 'FLAG') return '#ffb95f';
    if (decisionUpper === 'BLOCK') return '#ffb4ab';
    return '#c0c1ff';
  };

  return (
    <Layout title="Fraud Detection">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Form (45%) */}
        <div className="lg:col-span-[9/20]">
          <div className="glass-panel rounded-lg p-6">
            <h3 className="text-[#e4e1ed] font-semibold text-base mb-4">Analyze Transaction</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Transaction ID | Customer ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    name="transaction_id"
                    value={formData.transaction_id}
                    onChange={handleInputChange}
                    className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                  />
                  {errors.transaction_id && (
                    <p className="text-xs text-[#ffb4ab] mt-1">{errors.transaction_id}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                    Customer ID
                  </label>
                  <input
                    type="text"
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleInputChange}
                    className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                  />
                  {errors.customer_id && (
                    <p className="text-xs text-[#ffb4ab] mt-1">{errors.customer_id}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Amount | Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                  />
                  {errors.amount && (
                    <p className="text-xs text-[#ffb4ab] mt-1">{errors.amount}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                  {errors.currency && (
                    <p className="text-xs text-[#ffb4ab] mt-1">{errors.currency}</p>
                  )}
                </div>
              </div>

              {/* Row 3: IP Address */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  name="ip_address"
                  value={formData.ip_address}
                  onChange={handleInputChange}
                  className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                />
                {errors.ip_address && (
                  <p className="text-xs text-[#ffb4ab] mt-1">{errors.ip_address}</p>
                )}
              </div>

              {/* Row 4: Payment Method | MCC Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                    Payment Method
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                  >
                    <option value="">Select method</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Netbanking</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                    MCC Code
                  </label>
                  <input
                    type="text"
                    name="merchant_category_code"
                    value={formData.merchant_category_code}
                    onChange={handleInputChange}
                    placeholder="5411"
                    className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                  />
                  {errors.merchant_category_code && (
                    <p className="text-xs text-[#ffb4ab] mt-1">{errors.merchant_category_code}</p>
                  )}
                </div>
              </div>

              {/* Row 5: Device ID */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  Device ID (Optional)
                </label>
                <input
                  type="text"
                  name="device_id"
                  value={formData.device_id}
                  onChange={handleInputChange}
                  placeholder="Leave blank if unknown"
                  className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                />
              </div>

              {/* Row 6: International Transaction Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_international"
                  id="is_international"
                  checked={formData.is_international}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-[#464554] bg-[#0d0d15] text-[#c0c1ff] focus:ring-[#c0c1ff]"
                />
                <label htmlFor="is_international" className="text-sm text-[#e4e1ed]">
                  International Transaction
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#c0c1ff] text-[#1000a9] font-semibold py-2.5 rounded mt-4 hover:bg-[#a0a1e0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Analyzing...
                  </>
                ) : (
                  'Run Risk Analysis'
                )}
              </button>

              {/* Load Sample Button */}
              <button
                type="button"
                onClick={loadSampleTransaction}
                className="w-full text-sm text-[#c7c4d7]/60 hover:text-[#c0c1ff] transition-colors py-2"
              >
                Load Sample Transaction
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - Result Panel (55%) */}
        <div className="lg:col-span-[11/20]">
          <div className="glass-panel rounded-lg p-6 h-full">
            {!result && !apiError && (
              /* Placeholder State */
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <SearchX size={48} className="text-[#464554] mb-4" />
                <p className="text-[#c7c4d7]/50 text-sm">Submit a transaction to see the risk analysis</p>
              </div>
            )}

            {apiError && (
              /* Error State */
              <div className="border border-[#ffb4ab] rounded-lg p-4 bg-[#ffb4ab]/10">
                <p className="text-[#ffb4ab] text-sm">{apiError}</p>
              </div>
            )}

            {result && !apiError && (
              /* Result State */
              <div className="space-y-6">
                {/* Transaction ID */}
                <div className="text-xs font-mono text-[#c7c4d7]/70">
                  {result.transaction_id || formData.transaction_id}
                </div>

                {/* Decision Badge */}
                <div className="flex justify-center">
                  <div className="transform scale-125">
                    <StatusChip 
                      status={result.decision} 
                      className="text-base px-4 py-1.5"
                    />
                  </div>
                </div>

                {/* AI Risk Assessment */}
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-2">
                    AI Risk Assessment
                  </label>
                  <div className="bg-[#0d0d15] rounded p-3 border-l-2 border-[#c0c1ff]">
                    <p className="italic text-sm text-[#c7c4d7]">
                      {result.reason || 'No reason provided'}
                    </p>
                  </div>
                </div>

                {/* Score Bars */}
                <div className="space-y-3">
                  <ScoreBar 
                    label="Fraud Risk" 
                    score={result.fraud_score || 0} 
                  />
                  <ScoreBar 
                    label="Return Risk" 
                    score={result.return_risk_score || 0} 
                  />
                  <ScoreBar 
                    label="Chargeback Risk" 
                    score={result.chargeback_risk_score || 0} 
                  />
                </div>

                {/* Recommended Actions */}
                {result.recommended_actions && result.recommended_actions.length > 0 && (
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-2">
                      Recommended Actions
                    </label>
                    <div className="space-y-2">
                      {result.recommended_actions.map((action, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-[#e4e1ed]">
                          <div 
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: getBulletColor(result.decision) }}
                          />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="text-xs text-[#c7c4d7]/40 pt-4 border-t border-[#464554]">
                  Model: {result.model_version || 'Unknown'} · {result.latency_ms || 0}ms
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FraudDetect;