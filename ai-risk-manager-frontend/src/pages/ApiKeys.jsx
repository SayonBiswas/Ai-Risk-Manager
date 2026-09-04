import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { generateApiKey } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import StatusChip from '../components/StatusChip';
import LoadingSpinner from '../components/LoadingSpinner';

const ApiKeys = () => {
  const navigate = useNavigate();
  const { jwt, activeApiKey, setActiveApiKey } = useAuth();

  const [step, setStep] = useState('idle'); // idle | confirm | loading | revealed
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const isRegenerating = !!activeApiKey;

  const handleGenerateClick = () => {
    setStep('confirm');
    setError('');
  };

  const handleCancel = () => {
    setStep('idle');
    setError('');
  };

  const handleConfirm = async () => {
    setStep('loading');
    setError('');
    try {
      const res = await generateApiKey(jwt);
      const key = res.data.api_key;
      setNewKey(key);
      setActiveApiKey(key);
      setStep('revealed');
    } catch (err) {
      setError('Failed to generate key. Please try again.');
      setStep('idle');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <Layout title="API Keys">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Section 1 — Context banner */}
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Key size={20} className="text-[#c0c1ff] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[#e4e1ed] font-semibold text-base">API Key Required</p>
              <p className="text-sm text-[#c7c4d7]/70 mt-1">
                Risk scoring endpoints (Fraud Detect, Return Risk, Chargebacks) require an API key
                sent as the <span className="font-mono text-[#c0c1ff]">X-API-Key</span> header.
                Generate one below to unlock the risk dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2 — Current key status */}
        <div className="data-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase tracking-widest text-[#c7c4d7]/70 font-bold">
              Active Key
            </span>
            <StatusChip status={activeApiKey ? 'ALLOW' : 'BLOCK'} />
          </div>

          {activeApiKey ? (
            <>
              <div className="bg-[#0d0d15] rounded p-3 font-mono text-sm text-[#c7c4d7] break-all">
                {activeApiKey.slice(0, 12)}••••••••••••••••••••
              </div>
              <p className="text-xs text-[#c7c4d7]/40 mt-2">
                Key is stored locally in your browser
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-[#4edea3] text-[#0d1f18] font-semibold rounded px-4 py-2 text-sm hover:bg-[#6eeab5] active:scale-[0.98] transition-all"
                >
                  Use This Key
                </button>
                <button
                  onClick={handleGenerateClick}
                  className="border border-[#ffb95f]/40 text-[#ffb95f] text-sm rounded px-4 py-2 hover:bg-[#ffb95f]/10 transition-colors"
                >
                  Regenerate Key
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[#c7c4d7]/60">No API key configured.</p>
              <button
                onClick={handleGenerateClick}
                className="mt-3 bg-[#c0c1ff] text-[#1000a9] font-semibold rounded px-5 py-2.5 text-sm hover:bg-[#d0d1ff] active:scale-[0.98] transition-all"
              >
                Generate Key
              </button>
            </>
          )}
        </div>

        {/* Section 3 — Generate flow */}
        {step === 'confirm' && (
          <div
            className={`glass-panel rounded-xl p-6 border ${
              isRegenerating ? 'border-[#ffb95f]/20' : 'border-[#c0c1ff]/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className={isRegenerating ? 'text-[#ffb95f] mt-0.5' : 'text-[#c0c1ff] mt-0.5'}
              />
              <div className="flex-1">
                <p className="text-[#e4e1ed] font-semibold text-sm">
                  {isRegenerating ? 'Regenerate API Key?' : 'Generate API Key?'}
                </p>
                {isRegenerating && (
                  <p className="text-xs text-[#ffb95f] mt-1">
                    This will invalidate your current key immediately.
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleConfirm}
                    className="bg-[#c0c1ff] text-[#1000a9] font-semibold rounded px-4 py-2 text-sm hover:bg-[#d0d1ff] transition-all"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleCancel}
                    className="border border-white/10 text-[#c7c4d7]/60 text-sm rounded px-4 py-2 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="glass-panel rounded-xl p-10 flex flex-col items-center gap-3">
            <LoadingSpinner size="md" />
            <p className="text-sm text-[#c7c4d7]/60">Generating secure key...</p>
          </div>
        )}

        {step === 'revealed' && (
          <div className="bg-[#0d1f18] border border-[#4edea3]/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={20} className="text-[#4edea3]" />
              <span className="text-[#4edea3] font-semibold text-base">New API Key Generated</span>
            </div>
            <p className="text-xs text-[#ffb95f] mb-4">
              Copy this key now. It will not be shown again after you leave this page.
            </p>
            <div className="bg-[#0d0d15] rounded p-4 font-mono text-sm text-[#c0c1ff] break-all">
              {newKey}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCopy}
                className="bg-[#4edea3] text-[#0d1f18] font-semibold rounded px-4 py-2 text-sm hover:bg-[#6eeab5] transition-all"
              >
                {copied ? '✓ Copied!' : 'Copy Key'}
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-[#c0c1ff]/10 text-[#c0c1ff] border border-[#c0c1ff]/20 rounded px-4 py-2 text-sm hover:bg-[#c0c1ff]/20 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-[#ffb4ab] text-sm">{error}</p>
        )}

        {/* Section 4 — How it works */}
        <div className="glass-panel rounded-xl p-6">
          <p className="text-[#e4e1ed] font-semibold text-sm mb-4">How API Keys Work</p>
          <ol className="space-y-3">
            {[
              'Generate a key above — it\'s cryptographically secure (riskmgr_ prefix + 32 random chars)',
              'The key is hashed and stored on the server — we never store the raw key',
              'Include it as the X-API-Key header on every risk scoring request',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#c7c4d7]/70">
                <span className="w-5 h-5 rounded-full bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 text-[#c0c1ff] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {text}
              </li>
            ))}
          </ol>
          <div className="bg-[#0d0d15] rounded p-3 font-mono text-xs text-[#c7c4d7] mt-4 whitespace-pre overflow-x-auto">
{`curl -X POST https://api.example.com/v1/fraud/detect \\
  -H "X-API-Key: riskmgr_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"transaction_id": "TXN-001", ...}'`}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default ApiKeys;