import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth, activeApiKey } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showColdStart, setShowColdStart] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowColdStart(true), 3000);
    fetch(`${import.meta.env.VITE_API_BASE_URL}/health`)
      .then(() => setShowColdStart(false))
      .catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      const { access_token, merchant_id, name } = res.data;
      setAuth(access_token, { merchant_id, name, email, role: 'MERCHANT' });
      const storedKey = localStorage.getItem('rm_active_api_key');
      navigate(storedKey ? '/dashboard' : '/api-keys');
    } catch (err) {
      const status = err?.response?.status;
      setError(status === 401 ? 'Invalid email or password.' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#13131b] flex flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,193,255,0.05)_0%,transparent_65%)] pointer-events-none" />

      <div className="glass-panel w-full max-w-[400px] rounded-xl p-8 relative z-10">
        {/* Top */}
        <div className="text-center mb-8">
          <ShieldCheck size={36} className="text-[#c0c1ff] mx-auto" />
          <h1 className="text-2xl font-bold text-[#e4e1ed] mt-3">Sign In</h1>
          <p className="text-[10px] text-[#c7c4d7]/40 mt-1 uppercase tracking-widest">
            AI Risk Manager · Razorpay Buildathon
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
              Email Address
            </label>
            <input
              type="email"
              className="rm-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
              Password
            </label>
            <input
              type="password"
              className="rm-input"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-[#ffb4ab] text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-[#c0c1ff] text-[#1000a9] font-semibold rounded py-2.5 text-sm hover:bg-[#d0d1ff] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <p className="text-sm text-center text-[#c7c4d7]/60 mt-2">
            No account yet?{' '}
            <Link to="/register" className="text-[#c0c1ff] hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>

      {/* Cold start notice */}
      {showColdStart && (
        <div className="mt-6 flex items-center gap-2 bg-[#ffb95f]/10 border border-[#ffb95f]/30 rounded-full px-4 py-2 z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ffb95f] animate-pulse" />
          <span className="text-xs text-[#ffb95f]">
            Backend warming up — this may take ~30 seconds on first visit
          </span>
        </div>
      )}
    </div>
  );
};

export default Login;