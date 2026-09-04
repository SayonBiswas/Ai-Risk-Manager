import { useState } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { Info, CheckSquare, Copy } from 'lucide-react';
import apiClient from '../api/client';

const ChargebackResponder = () => {
  const [formData, setFormData] = useState({
    transaction_id: '',
    amount: '',
    chargeback_reason_code: '',
    dispute_deadline: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['transaction_id', 'amount', 'chargeback_reason_code', 'dispute_deadline'];
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        transaction_id: formData.transaction_id,
        chargeback_reason_code: formData.chargeback_reason_code,
        amount: parseFloat(formData.amount).toFixed(2),
        dispute_deadline: formData.dispute_deadline,
      };

        const response = await apiClient.post('/v1/chargebacks/respond', payload, {
          headers: { 'X-API-Key': localStorage.getItem('rm_active_api_key') }
        });
      setResult(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setApiError('Transaction not found. Make sure this transaction was first processed through Fraud Detect.');
      } else {
        setApiError(error.response?.data?.message || error.message || 'Failed to generate evidence package');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (result?.recommended_response) {
      navigator.clipboard.writeText(result.recommended_response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <Layout title="Chargeback Responder">
      <div className="space-y-6">
        {/* Top Section - Evidence Request Form */}
        <div className="glass-panel rounded-lg p-6">
          <h3 className="text-[#e4e1ed] font-semibold text-base mb-1">Generate Dispute Evidence</h3>
          <p className="text-sm text-[#c7c4d7]/70 mb-4">
            AI will compile an evidence package to contest this chargeback
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Transaction ID | Amount */}
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
            </div>

            {/* Row 2: Chargeback Reason Code | Dispute Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  Chargeback Reason Code
                </label>
                <input
                  type="text"
                  name="chargeback_reason_code"
                  value={formData.chargeback_reason_code}
                  onChange={handleInputChange}
                  placeholder="4853"
                  className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                />
                {errors.chargeback_reason_code && (
                  <p className="text-xs text-[#ffb4ab] mt-1">{errors.chargeback_reason_code}</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  Dispute Deadline
                </label>
                <input
                  type="date"
                  name="dispute_deadline"
                  value={formData.dispute_deadline}
                  onChange={handleInputChange}
                  min={getTodayDate()}
                  className="bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] outline-none w-full"
                />
                {errors.dispute_deadline && (
                  <p className="text-xs text-[#ffb4ab] mt-1">{errors.dispute_deadline}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c0c1ff] text-[#1000a9] font-semibold py-2.5 rounded hover:bg-[#a0a1e0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Generating...
                </>
              ) : (
                'Generate Evidence Package'
              )}
            </button>

            {/* Info Banner */}
            <div className="bg-[#c0c1ff]/5 border border-[#c0c1ff]/20 rounded p-3 flex gap-2 items-start">
              <Info size={16} className="text-[#c0c1ff] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#c7c4d7]">
                Evidence generation uses AI and may take 5–10 seconds. The package includes a dispute narrative, supporting document checklist, and recommended response strategy.
              </p>
            </div>
          </form>
        </div>

        {/* Bottom Section - Evidence Package Result */}
        {result && !apiError && (
          <div className="glass-panel rounded-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[#e4e1ed] font-semibold text-base">Evidence Package Ready</h3>
              {result.confidence && (
                <div className="bg-[#4edea3]/10 border border-[#4edea3]/30 px-3 py-1 rounded-full">
                  <span className="text-xs font-semibold text-[#4edea3]">
                    {result.confidence}% Confidence
                  </span>
                </div>
              )}
            </div>

            {/* Evidence Summary */}
            <div className="mb-6">
              <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-2">
                Evidence Summary
              </label>
              <div className="bg-[#0d0d15] rounded p-4 border-l-2 border-[#4edea3]">
                <p className="text-sm text-[#e4e1ed] italic">
                  {result.evidence_summary || 'No summary provided'}
                </p>
              </div>
            </div>

            {/* Evidence Documents Checklist */}
            {result.evidence_documents && result.evidence_documents.length > 0 && (
              <div className="mb-6">
                <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-2">
                  Evidence Documents Checklist
                </label>
                <div className="space-y-0">
                  {result.evidence_documents.map((doc, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 py-2 border-b border-white/5 text-sm text-[#e4e1ed]"
                    >
                      <CheckSquare size={14} className="text-[#4edea3] flex-shrink-0" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Response */}
            {result.recommended_response && (
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-2">
                  Recommended Response
                </label>
                <div className="space-y-3">
                  <p className="text-sm text-[#e4e1ed]">
                    {result.recommended_response}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyResponse}
                    className="text-sm text-[#c7c4d7]/60 hover:text-[#c0c1ff] transition-colors flex items-center gap-1"
                  >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy Response'}
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-xs text-[#c7c4d7]/40 pt-4 border-t border-[#464554] mt-6">
              Model: {result.model_version || 'Unknown'} · {result.latency_ms || 0}ms
            </div>
          </div>
        )}

        {/* Error State */}
        {apiError && (
          <div className="glass-panel rounded-lg p-6">
            <div className="border border-[#ffb4ab] rounded-lg p-4 bg-[#ffb4ab]/10">
              <p className="text-[#ffb4ab] text-sm">{apiError}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChargebackResponder;