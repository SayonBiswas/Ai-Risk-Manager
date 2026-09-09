import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#13131b] flex flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,193,255,0.05)_0%,transparent_65%)] pointer-events-none" />

      <div className="glass-panel w-full max-w-[500px] rounded-xl p-12 relative z-10 text-center">
        {/* Large 404 */}
        <div className="font-mono text-8xl text-[#c0c1ff]/20 mb-4">404</div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-[#e4e1ed] mb-3">Page Not Found</h1>

        {/* Subtitle */}
        <p className="text-sm text-[#c7c4d7]/60 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-[#c0c1ff] text-[#1000a9] font-semibold rounded py-2.5 px-6 text-sm hover:bg-[#d0d1ff] active:scale-[0.98] transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
