import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import apiClient from '../api/client';

const Login = () => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setApiKey: saveApiKey } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For development, just save the API key without validation
      // The health endpoint doesn't require authentication
      saveApiKey(apiKey);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid API key. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: '#13131b',
        backgroundImage: 'radial-gradient(ellipse at center, rgba(192,193,255,0.04) 0%, transparent 70%)'
      }}
    >
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-6">
          <ShieldCheck size={40} className="text-[#c0c1ff] mb-4" />
          <h1 className="text-2xl font-bold text-[#e4e1ed] text-center">AI Risk Manager</h1>
          <p className="text-sm text-[#c7c4d7] text-center mt-1">
            Enter your merchant API key to access the dashboard
          </p>
        </div>

        <div className="glass-panel rounded-lg p-8">
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="apiKey" className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-2">
                API KEY
              </label>
              <input
                type="text"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full font-mono text-sm bg-[#0d0d15] border border-[#464554] text-[#e4e1ed] rounded px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#c0c1ff] focus:border-[#c0c1ff] placeholder-[#464554]"
                placeholder="rm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
            </div>

            {error && (
              <div className="mt-3">
                <p className="text-sm text-[#ffb4ab]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c0c1ff] text-[#1000a9] font-semibold rounded py-2.5 mt-4 hover:bg-[#d0d1ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Authenticate'
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-[#c7c4d7]/40">
            Razorpay Buildathon · Track 02 · AI Risk Manager
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
