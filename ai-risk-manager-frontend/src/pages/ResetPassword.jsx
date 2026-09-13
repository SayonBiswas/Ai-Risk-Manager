import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../api/auth';
import LoadingSpinner from '../components/LoadingSpinner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    // Clear API error when form fields change
    if (error) setError('');
  }, [newPassword, confirmPassword]);

  const validatePasswords = () => {
    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswords()) return;
    
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen bg-[#13131b] flex flex-col items-center justify-center">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,193,255,0.05)_0%,transparent_65%)] pointer-events-none" />

        <div className="glass-panel w-full max-w-[400px] rounded-xl p-8 relative z-10 text-center">
          <AlertCircle size={48} className="text-[#ffb4ab] mx-auto" />
          <h2 className="text-xl font-bold text-[#e4e1ed] mt-4">Invalid Reset Link</h2>
          <p className="text-sm text-[#c7c4d7]/70 mt-2">
            The password reset link is missing or invalid.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-block bg-[#c0c1ff] text-[#1000a9] font-semibold rounded py-2.5 px-6 text-sm hover:bg-[#d0d1ff] active:scale-[0.98] transition-all"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#13131b] flex flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,193,255,0.05)_0%,transparent_65%)] pointer-events-none" />

      <div className="glass-panel w-full max-w-[400px] rounded-xl p-8 relative z-10">
        {/* Top */}
        <div className="text-center mb-8">
          <ShieldCheck size={36} className="text-[#c0c1ff] mx-auto" />
          <h1 className="text-2xl font-bold text-[#e4e1ed] mt-3">Set New Password</h1>
          <p className="text-sm text-[#c7c4d7]/60 mt-1">
            Enter your new password below.
          </p>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="text-[#4edea3] mx-auto" />
            <h2 className="text-lg font-semibold text-[#e4e1ed] mt-4">Password Updated!</h2>
            <p className="text-sm text-[#c7c4d7]/70 mt-2">
              Signing you in...
            </p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                New Password
              </label>
              <input
                type="password"
                className="rm-input"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                className="rm-input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {validationError && <p className="text-[#ffb4ab] text-sm">{validationError}</p>}
            {error && <p className="text-[#ffb4ab] text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#c0c1ff] text-[#1000a9] font-semibold rounded py-2.5 text-sm hover:bg-[#d0d1ff] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Updating...
                </>
              ) : (
                'Update Password'
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

export default ResetPassword;
