import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, ArrowLeft } from 'lucide-react';
import { forgotPassword, forgotPasswordVerify } from '../api/auth';
import LoadingSpinner from '../components/LoadingSpinner';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: enter email, 2: answer question

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res.data.security_question) {
        setSecurityQuestion(res.data.security_question);
        setStep(2);
      } else {
        setError('No security question found for this account. Please contact support.');
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotPasswordVerify(email, securityAnswer);
      if (res.data.verified && res.data.reset_token) {
        // Redirect to reset password page with the token
        navigate(`/reset-password?token=${res.data.reset_token}`);
      } else {
        setError('Incorrect answer. Please try again.');
      }
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
            {step === 1 ? 'Enter your email to get started.' : 'Answer your security question.'}
          </p>
        </div>

        {/* Step 1: Enter Email */}
        {step === 1 ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                  Loading...
                </>
              ) : (
                'Continue'
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
        ) : (
          /* Step 2: Answer Security Question */
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                Security Question
              </label>
              <div className="bg-[#1f1f27] rounded p-3 text-sm text-[#e4e1ed]">
                {securityQuestion}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                Your Answer
              </label>
              <input
                type="text"
                className="rm-input"
                placeholder="Enter your answer"
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
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                  setSecurityAnswer('');
                }}
                className="text-xs text-[#c7c4d7]/60 hover:text-[#c0c1ff] flex items-center gap-1 justify-center"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
