import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { register } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const getStrength = (password) => {
  if (password.length === 0) return null;
  if (password.length < 8) return 'weak';
  if (password.length < 12) return 'fair';
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return 'good';
  return 'fair';
};

const getStrengthFull = (password) => {
  if (getStrength(password) === 'good' && /[^A-Za-z0-9]/.test(password)) return 'strong';
  return getStrength(password);
};

const strengthConfig = {
  weak:   { segments: 1, color: '#ffb4ab', label: 'Weak' },
  fair:   { segments: 2, color: '#ffb95f', label: 'Fair' },
  good:   { segments: 3, color: '#c0c1ff', label: 'Good' },
  strong: { segments: 4, color: '#4edea3', label: 'Strong' },
};

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What is your favorite movie?",
  "What year did you graduate high school?",
];

const Register = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
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

  const strength = getStrengthFull(password);
  const strengthInfo = strength ? strengthConfig[strength] : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!securityQuestion || !securityAnswer) {
      setError('Please select a security question and provide an answer.');
      return;
    }

    setLoading(true);
    try {
      const res = await register(name, email, password, securityQuestion, securityAnswer);
      const { access_token, merchant_id, name: rName } = res.data;
      setAuth(access_token, { merchant_id, name: rName, email, role: 'MERCHANT' });
      // Navigate to API keys page to create a key
      navigate('/api-keys');
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 400 && detail?.toLowerCase().includes('email')) {
        setError('Email already registered. Please sign in instead.');
      } else {
        setError('Something went wrong. Please try again.');
      }
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
          <h1 className="text-2xl font-bold text-[#e4e1ed] mt-3">Create Account</h1>
          <p className="text-sm text-[#c7c4d7]/60 mt-1">Join the AI Risk Manager platform</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
              Your Name
            </label>
            <input
              type="text"
              className="rm-input"
              placeholder="Acme Payments Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {/* Strength bar */}
            {password.length > 0 && strengthInfo && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor:
                          seg <= strengthInfo.segments ? strengthInfo.color : '#1f1f27',
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px]" style={{ color: strengthInfo.color }}>
                  {strengthInfo.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
              Security Question
            </label>
            <select
              className="rm-input"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              required
            >
              <option value="">Select a question</option>
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
              Security Answer
            </label>
            <input
              type="text"
              className="rm-input"
              placeholder="Your answer (case-insensitive)"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-[#ffb4ab] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-[#c0c1ff] text-[#1000a9] font-semibold rounded py-2.5 text-sm hover:bg-[#d0d1ff] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <p className="text-sm text-center text-[#c7c4d7]/60 mt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-[#c0c1ff] hover:underline">
              Sign in
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

export default Register;