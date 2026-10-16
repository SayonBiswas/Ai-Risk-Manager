import { useState } from 'react';
import { Package, Sparkles, SearchX, RotateCcw } from 'lucide-react';
import Layout from '../components/Layout';
import StatusChip from '../components/StatusChip';
import ScoreBar from '../components/ScoreBar';
import LoadingSpinner from '../components/LoadingSpinner';
import FormField from '../components/FormField';
import { SectionCard, Segmented, Toggle } from '../components/FormControls';
import { scoreReturn } from '../api/risk';

const INPUT = 'rm-input !py-3 !text-[15px]';
const AMBER = '#ffb95f';
const AMBER_TEXT = '#1a0f00';

const PAYMENT_METHODS = [
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'netbanking', label: 'Netbanking' },
  { value: 'wallet', label: 'Wallet' },
];

const CATEGORIES = ['Fashion', 'Electronics', 'Home & Kitchen', 'Beauty', 'Grocery', 'Other'];

const newTxnId = () => `ORD-${Date.now().toString(36).toUpperCase()}`;

const emptyForm = () => ({
  transaction_id: newTxnId(),
  customer_id: '',
  amount: '',
  currency: 'INR',
  ip_address: '',
  payment_method: 'card',
  merchant_category_code: '',
  device_id: '',
  is_international: false,
  product_category: 'Fashion',
  items_in_order: '1',
});

const SAMPLES = {
  low: {
    customer_id: 'CUST-2210',
    amount: '799',
    ip_address: '103.21.58.4',
    payment_method: 'upi',
    merchant_category_code: '5411',
    device_id: 'DEV-KNOWN-21',
    is_international: false,
    product_category: 'Grocery',
    items_in_order: '2',
  },
  high: {
    customer_id: 'CUST-SERIAL-88',
    amount: '12999',
    ip_address: '203.0.113.42',
    payment_method: 'card',
    merchant_category_code: '5651',
    device_id: 'DEV-NEW-09',
    is_international: true,
    product_category: 'Fashion',
    items_in_order: '6',
  },
};

const extractError = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 401) return 'Invalid or missing API key. Check the API Keys page.';
  if (status === 429) return 'Rate limit reached (100 requests/min). Please wait a moment.';
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((d) => `${d.loc?.[d.loc.length - 1] ?? 'field'}: ${d.msg}`)
      .join(' · ');
  }
  return data?.detail || data?.message || err.message || 'Failed to score return risk';
};

const getBand = (result) => {
  if (result?.risk_band) return result.risk_band;
  const s = result?.return_risk_score || 0;
  if (s >= 0.7) return 'HIGH';
  if (s >= 0.4) return 'MEDIUM';
  return 'LOW';
};

const getBandColor = (band) => {
  const b = band?.toUpperCase();
  if (b === 'LOW') return '#4edea3';
  if (b === 'MEDIUM') return '#ffb95f';
  if (b === 'HIGH') return '#ffb4ab';
  return '#c0c1ff';
};

const BAND_COPY = {
  LOW: 'This order is unlikely to be returned.',
  MEDIUM: 'Moderate chance of a return — keep an eye on it.',
  HIGH: 'High chance of a return — consider extra checks before shipping.',
};

const ReturnScorer = () => {
  const [formData, setFormData] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleInputChange = (e) => setField(e.target.name, e.target.value);

  const validateForm = () => {
    const e = {};
    if (!formData.transaction_id.trim()) e.transaction_id = 'Required';
    if (!(Number(formData.amount) > 0)) e.amount = 'Enter an amount greater than 0';
    if (!formData.customer_id.trim()) e.customer_id = 'Required';
    const ip = formData.ip_address.trim();
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
    if (!ip) e.ip_address = 'Required';
    else if (!ipv4 && !ip.includes(':')) e.ip_address = 'Enter a valid IPv4 or IPv6 address';
    if (!/^\d{4}$/.test(formData.merchant_category_code.trim())) e.merchant_category_code = 'Enter a 4-digit MCC';
    if (!(Number(formData.items_in_order) >= 1)) e.items_in_order = 'At least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const loadSample = (kind) => {
    setFormData({ ...emptyForm(), ...SAMPLES[kind] });
    setErrors({});
    setResult(null);
    setApiError(null);
  };

  const handleReset = () => {
    setFormData(emptyForm());
    setErrors({});
    setResult(null);
    setApiError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setApiError(null);
    setResult(null);

    try {
      const { product_category, items_in_order, ...rest } = formData;
      const payload = {
        ...rest,
        transaction_id: formData.transaction_id.trim(),
        customer_id: formData.customer_id.trim(),
        ip_address: formData.ip_address.trim(),
        merchant_category_code: formData.merchant_category_code.trim(),
        device_id: formData.device_id.trim() || null,
        amount: parseFloat(formData.amount).toFixed(2),
        metadata: { product_category, items_in_order: Number(items_in_order) },
      };
      const response = await scoreReturn(payload);
      setResult(response.data);
    } catch (err) {
      setApiError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const score = result?.return_risk_score || 0;
  const band = result ? getBand(result) : null;
  const bandColor = getBandColor(band);

  return (
    <Layout title="Return Risk Scorer">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#ffb95f]/20 rounded-xl">
              <Package size={24} className="text-[#ffb95f]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#e4e1ed]">Return Risk Scorer</h2>
              <p className="text-sm text-[#c7c4d7]/60">Predict return probability before you ship</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadSample('low')}
              className="px-4 h-10 rounded-lg text-sm border border-[#4edea3]/30 text-[#4edea3] hover:bg-[#4edea3]/10 transition-colors"
            >
              Load low-risk sample
            </button>
            <button
              type="button"
              onClick={() => loadSample('high')}
              className="px-4 h-10 rounded-lg text-sm border border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-colors"
            >
              Load high-risk sample
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="xl:col-span-7 space-y-6">
            <SectionCard title="Order" subtitle="What was purchased and how it was paid for">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  label="Order / Transaction ID"
                  error={errors.transaction_id}
                  hint={
                    <button
                      type="button"
                      onClick={() => setField('transaction_id', newTxnId())}
                      className="inline-flex items-center gap-1 hover:text-[#ffb95f] transition-colors"
                    >
                      <RotateCcw size={10} /> regenerate
                    </button>
                  }
                >
                  <input
                    type="text"
                    name="transaction_id"
                    value={formData.transaction_id}
                    onChange={handleInputChange}
                    className={INPUT}
                  />
                </FormField>

                <div className="grid grid-cols-[1fr_110px] gap-3">
                  <FormField label="Order Amount" error={errors.amount}>
                    <input
                      type="number"
                      name="amount"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className={INPUT}
                    />
                  </FormField>
                  <FormField label="Currency">
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className={INPUT}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </FormField>
                </div>

                <FormField label="Product Category">
                  <select
                    name="product_category"
                    value={formData.product_category}
                    onChange={handleInputChange}
                    className={INPUT}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Items in Order" error={errors.items_in_order}>
                  <input
                    type="number"
                    name="items_in_order"
                    min="1"
                    value={formData.items_in_order}
                    onChange={handleInputChange}
                    className={INPUT}
                  />
                </FormField>

                <FormField label="Payment Method" className="sm:col-span-2">
                  <Segmented
                    options={PAYMENT_METHODS}
                    value={formData.payment_method}
                    onChange={(v) => setField('payment_method', v)}
                    accent={AMBER}
                    accentText={AMBER_TEXT}
                  />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Customer & Device" subtitle="Used for return-history and behaviour signals">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Customer ID" error={errors.customer_id}>
                  <input
                    type="text"
                    name="customer_id"
                    placeholder="CUST-2210"
                    value={formData.customer_id}
                    onChange={handleInputChange}
                    className={INPUT}
                  />
                </FormField>
                <FormField label="IP Address" error={errors.ip_address}>
                  <input
                    type="text"
                    name="ip_address"
                    placeholder="103.21.58.4"
                    value={formData.ip_address}
                    onChange={handleInputChange}
                    className={INPUT}
                  />
                </FormField>
                <FormField label="Device ID" hint="optional" className="sm:col-span-2">
                  <input
                    type="text"
                    name="device_id"
                    placeholder="Leave blank if unknown"
                    value={formData.device_id}
                    onChange={handleInputChange}
                    className={INPUT}
                  />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Merchant Context">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="MCC Code" hint="4 digits" error={errors.merchant_category_code}>
                  <input
                    type="text"
                    name="merchant_category_code"
                    maxLength={4}
                    placeholder="5651"
                    value={formData.merchant_category_code}
                    onChange={handleInputChange}
                    className={INPUT}
                  />
                </FormField>
                <FormField label="Cross-border">
                  <Toggle
                    checked={formData.is_international}
                    onChange={(v) => setField('is_international', v)}
                    label="International order"
                    hint="Ships or pays across borders"
                    accent={AMBER}
                  />
                </FormField>
              </div>
            </SectionCard>

            {apiError && (
              <div className="border border-[#ffb4ab]/40 rounded-xl p-4 bg-[#ffb4ab]/10">
                <p className="text-[#ffb4ab] text-sm">{apiError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-14 bg-[#ffb95f] text-[#1a0f00] font-semibold rounded-xl hover:bg-[#e6a658] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#ffb95f]/20"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Scoring...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Score Return Risk
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 h-14 rounded-xl border border-white/10 text-[#c7c4d7]/70 hover:bg-white/5 transition-colors"
              >
                Reset
              </button>
            </div>
          </form>

          {/* Result */}
          <aside className="xl:col-span-5 xl:sticky xl:top-24">
            <div className="glass-panel rounded-xl p-6 min-h-[460px]">
              {!result && !loading && (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                  <div className="p-4 bg-[#1f1f27] rounded-full mb-4">
                    <SearchX size={32} className="text-[#464554]" />
                  </div>
                  <p className="text-[#c7c4d7]/50 text-sm max-w-[240px]">
                    Enter the order details and score it to see the return risk here.
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-[#c7c4d7]/60 animate-pulse">Running return model…</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-6">
                  <div
                    className="rounded-xl p-5 text-center border"
                    style={{ borderColor: `${bandColor}40`, background: `${bandColor}10` }}
                  >
                    <p className="text-[11px] uppercase tracking-widest text-[#c7c4d7]/60 mb-2">
                      Return Probability
                    </p>
                    <div className="text-6xl font-bold tabular-nums" style={{ color: bandColor }}>
                      {Math.round(score * 100)}%
                    </div>
                    <div className="mt-4">
                      <StatusChip status={band} />
                    </div>
                    <p className="text-sm text-[#c7c4d7]/70 mt-3">{BAND_COPY[band?.toUpperCase()] || ''}</p>
                  </div>

                  <ScoreBar label="Return Risk Score" score={score} />

                  {result.recommended_actions?.length > 0 && (
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 mb-3">
                        Recommended Actions
                      </label>
                      <div className="space-y-2">
                        {result.recommended_actions.map((action, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 text-sm text-[#e4e1ed] bg-[#0d0d15] p-3 rounded-lg"
                          >
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: bandColor }}
                            />
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-[#c7c4d7]/40 pt-4 border-t border-white/10 flex justify-between">
                    <span>Model: {result.model_version || 'Unknown'}</span>
                    <span>{result.latency_ms || 0}ms</span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default ReturnScorer;