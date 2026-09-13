import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../api/auth';
import LoadingSpinner from '../components/LoadingSpinner';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Something went wrong. Please try again.');
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
          <h1 className="text-2xl font-bold text-[#e4e1ed] mt-3">Reset Password</h1>
          <p className="text-sm text-[#c7c4d7]/60 mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="text-[#4edea3] mx-auto" />
            <h2 className="text-lg font-semibold text-[#e4e1ed] mt-4">Check your inbox</h2>
            <p className="text-sm text-[#c7c4d7]/70 mt-2">
              A reset link has been sent to your email address.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 text-[#c0c1ff] hover:underline text-sm flex items-center gap-1 mx-auto"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </div>
        ) : (
          /* Form */
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

            {error && <p className="text-[#ffb4ab] text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#c0c1ff] text-[#1000a9] font-semibold rounded py-2.5 text-sm hover:bg-[#d0d1ff] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <div className="text-center mt-4">
              <Link
                to="/login"
                className="text-xs text-[#c7c4d7]/60 hover:text-[#c0c1ff] flex items-center gap-1 justify-center"
              >
                <ArrowLeft size={14} />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
