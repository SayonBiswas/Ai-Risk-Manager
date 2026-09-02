import { useAuth } from '../context/AuthContext';

const Header = ({ title }) => {
  const { apiKey, logout } = useAuth();

  const maskedApiKey = apiKey ? `${apiKey.slice(0, 8)}••••••••` : 'Not connected';

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-260px)] h-16 bg-[#13131b]/70 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-[#e4e1ed]">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 rounded-full">
          <div className="w-2 h-2 bg-[#ffb4ab] rounded-full animate-pulse" />
          <span className="text-xs font-bold text-[#ffb4ab] tracking-wider">LIVE</span>
        </div>
        <div className="glass-panel px-3 py-1.5 rounded-full">
          <span className="text-xs font-mono text-[#c7c4d7]">{maskedApiKey}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-[#c7c4d7] hover:text-[#e4e1ed] transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
