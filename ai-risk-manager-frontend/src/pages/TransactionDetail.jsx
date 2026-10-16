import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Copy, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { getTransactionDetail } from '../api/risk';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusChip from '../components/StatusChip';

const formatAmount = (amount, currency) => {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
  return `${symbol}${amount.toLocaleString()}`;
};

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getScoreColor = (score) => {
  if (score < 0.5) return '#4edea3';
  if (score < 0.75) return '#ffb95f';
  return '#ffb4ab';
};

const getScorePercent = (score) => Math.round(score * 100);

const getRecommendedActions = (decision, fraudScore, returnRisk, chargebackRisk) => {
  const actions = [];

  if (decision === 'BLOCK') {
    actions.push('Transaction blocked — no action required');
    actions.push('Review customer account for suspicious activity');
    actions.push('Consider adding to fraud watchlist');
  } else if (decision === 'FLAG') {
    actions.push('Manual review recommended');
    actions.push('Verify customer identity if possible');
    actions.push('Consider additional verification steps');
  } else {
    actions.push('Transaction approved — monitor for unusual patterns');
  }

  if (fraudScore > 0.7) {
    actions.push('High fraud risk detected — enhanced monitoring advised');
  }
  if (returnRisk > 0.7) {
    actions.push('High return risk — consider return policy adjustments');
  }
  if (chargebackRisk > 0.7) {
    actions.push('High chargeback risk — gather supporting documentation');
  }

  return actions;
};

const TransactionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeApiKey } = useAuth();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [featureSnapshotExpanded, setFeatureSnapshotExpanded] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [id, activeApiKey]);

  const loadTransaction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTransactionDetail(id);
      setTransaction(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setError('Transaction not found');
      } else {
        setError('Failed to load transaction details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(transaction.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const shortId = id ? id.slice(0, 8).toUpperCase() : '';

  if (loading) {
    return (
      <Layout title="Transaction Details">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 bg-[#1f1f27] rounded animate-pulse" />
            <div className="h-4 w-2 bg-[#1f1f27] rounded animate-pulse" />
            <div className="h-4 w-32 bg-[#1f1f27] rounded animate-pulse" />
          </div>

          {/* Two-column layout skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column skeleton */}
            <div className="glass-panel rounded-xl p-6 space-y-4">
              <div className="h-6 w-32 bg-[#1f1f27] rounded animate-pulse" />
              <div className="space-y-3">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 bg-[#1f1f27] rounded animate-pulse" />
                    <div className="h-5 w-full bg-[#1f1f27] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right column skeleton */}
            <div className="glass-panel rounded-xl p-6 space-y-4">
              <div className="h-6 w-32 bg-[#1f1f27] rounded animate-pulse" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-[#1f1f27] rounded animate-pulse" />
                    <div className="h-4 w-full bg-[#1f1f27] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature snapshot skeleton */}
          <div className="glass-panel rounded-xl p-6">
            <div className="h-6 w-40 bg-[#1f1f27] rounded animate-pulse" />
            <div className="mt-4 h-32 bg-[#1f1f27] rounded animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Transaction Details">
        <div className="max-w-7xl mx-auto">
          <div className="glass-panel rounded-xl p-12 text-center">
            <p className="text-[#ffb4ab] font-semibold mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-[#c0c1ff] text-[#1000a9] font-semibold rounded px-4 py-2 text-sm hover:bg-[#d0d1ff] transition-all flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!transaction) {
    return null;
  }

  const recommendedActions = getRecommendedActions(
    transaction.decision,
    transaction.fraud_score,
    transaction.return_risk_score,
    transaction.chargeback_risk_score
  );

  return (
    <Layout title="Transaction Details">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#c7c4d7]/60">
          <Link to="/dashboard" className="hover:text-[#c0c1ff] transition-colors">
            Dashboard
          </Link>
          <span>→</span>
          <span className="text-[#e4e1ed]">Transaction {shortId}</span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Transaction Info */}
          <div className="glass-panel rounded-xl p-6">
            <h3 className="text-lg font-bold text-[#e4e1ed] mb-6">Transaction Info</h3>

            <div className="space-y-4">
              {/* Transaction ID */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  Transaction ID
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-[#c0c1ff] bg-[#0d0d15] px-3 py-1.5 rounded flex-1 break-all">
                    {transaction.id}
                  </code>
                  <button
                    onClick={handleCopyId}
                    className="p-2 text-[#c7c4d7]/60 hover:text-[#c0c1ff] hover:bg-white/5 rounded transition-colors"
                    title="Copy ID"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  Amount
                </p>
                <p className="text-3xl font-bold text-[#e4e1ed]">
                  {formatAmount(transaction.amount, transaction.currency)}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  Payment Method
                </p>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#c0c1ff]/20 text-[#c0c1ff] capitalize">
                  {transaction.payment_method}
                </span>
              </div>

              {/* Customer ID */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  Customer ID
                </p>
                <p className="text-sm text-[#e4e1ed]">{transaction.customer_id}</p>
              </div>

              {/* Device ID */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  Device ID
                </p>
                <p className="text-sm text-[#e4e1ed]">
                  {transaction.device_id || <span className="text-[#c7c4d7]/50">Not provided</span>}
                </p>
              </div>

              {/* IP Address */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  IP Address
                </p>
                <p className="text-sm text-[#e4e1ed]">{transaction.ip_address}</p>
              </div>

              {/* International */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  International
                </p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  transaction.is_international
                    ? 'bg-[#ffb95f]/20 text-[#ffb95f]'
                    : 'bg-[#4edea3]/20 text-[#4edea3]'
                }`}>
                  {transaction.is_international ? 'Yes' : 'No'}
                </span>
              </div>

              {/* Timestamp */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                  Timestamp
                </p>
                <p className="text-sm text-[#e4e1ed]">{formatDateTime(transaction.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Right column: Risk Decision */}
          <div className="glass-panel rounded-xl p-6">
            <h3 className="text-lg font-bold text-[#e4e1ed] mb-6">Risk Decision</h3>

            <div className="space-y-6">
              {/* Decision Badge */}
              <div className="flex items-center justify-center py-4">
                <StatusChip status={transaction.decision} />
              </div>

              {/* Score Bars */}
              <div className="space-y-4">
                {/* Fraud Score */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-[#c7c4d7]/70">Fraud Score</p>
                    <p className="text-sm font-mono" style={{ color: getScoreColor(transaction.fraud_score) }}>
                      {getScorePercent(transaction.fraud_score)}%
                    </p>
                  </div>
                  <div className="h-2 bg-[#1f1f27] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${getScorePercent(transaction.fraud_score)}%`,
                        backgroundColor: getScoreColor(transaction.fraud_score),
                      }}
                    />
                  </div>
                </div>

                {/* Return Risk Score */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-[#c7c4d7]/70">Return Risk</p>
                    <p className="text-sm font-mono" style={{ color: getScoreColor(transaction.return_risk_score) }}>
                      {getScorePercent(transaction.return_risk_score)}%
                    </p>
                  </div>
                  <div className="h-2 bg-[#1f1f27] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${getScorePercent(transaction.return_risk_score)}%`,
                        backgroundColor: getScoreColor(transaction.return_risk_score),
                      }}
                    />
                  </div>
                </div>

                {/* Chargeback Risk Score */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm text-[#c7c4d7]/70">Chargeback Risk</p>
                    <p className="text-sm font-mono" style={{ color: getScoreColor(transaction.chargeback_risk_score) }}>
                      {getScorePercent(transaction.chargeback_risk_score)}%
                    </p>
                  </div>
                  <div className="h-2 bg-[#1f1f27] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${getScorePercent(transaction.chargeback_risk_score)}%`,
                        backgroundColor: getScoreColor(transaction.chargeback_risk_score),
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* AI Reason */}
              {transaction.llm_reason && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-2">
                    AI Reason
                  </p>
                  <blockquote className="text-sm text-[#c7c4d7]/80 italic bg-[#0d0d15] border-l-2 border-[#c0c1ff]/30 pl-4 py-3 rounded-r">
                    {transaction.llm_reason}
                  </blockquote>
                </div>
              )}

              {/* Recommended Actions */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-2">
                  Recommended Actions
                </p>
                <ul className="space-y-2">
                  {recommendedActions.map((action, index) => (
                    <li key={index} className="text-sm text-[#c7c4d7]/80 flex items-start gap-2">
                      <span className="text-[#c0c1ff] mt-1">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Snapshot */}
        <div className="glass-panel rounded-xl p-6">
          <button
            onClick={() => setFeatureSnapshotExpanded(!featureSnapshotExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-bold text-[#e4e1ed]">Feature Snapshot</h3>
            {featureSnapshotExpanded ? (
              <ChevronUp size={20} className="text-[#c7c4d7]/60" />
            ) : (
              <ChevronDown size={20} className="text-[#c7c4d7]/60" />
            )}
          </button>

          {featureSnapshotExpanded && (
            <div className="mt-4">
              <pre className="bg-[#0d0d15] border border-white/10 rounded-lg p-4 overflow-x-auto text-xs text-[#c7c4d7]">
                {JSON.stringify(transaction.feature_snapshot, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TransactionDetail;
