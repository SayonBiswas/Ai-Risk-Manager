import { useAuth } from '../context/AuthContext';

const Header = ({ title }) => {
  const { user, activeApiKey } = useAuth();

  return (
    <header className="fixed top-0 left-[260px] right-0 h-16 z-10 bg-[#13131b]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6">
      {/* Left: page title */}
      <span className="text-[#e4e1ed] font-semibold text-base">{title}</span>

      {/* Right: pills */}
      <div className="flex items-center gap-3">
        {/* LIVE pill */}
        <div className="flex items-center gap-1.5 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-full px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab] animate-pulse" />
          <span className="text-[10px] font-bold text-[#ffb4ab] uppercase tracking-wider">Live</span>
        </div>

        {/* API key badge */}
        {activeApiKey && (
          <div className="glass-panel rounded px-2.5 py-1">
            <span className="text-[11px] font-mono text-[#c7c4d7]">
              {activeApiKey.slice(0, 12)}••••
            </span>
          </div>
        )}

        {/* User avatar pill */}
        {user?.name && (
          <div className="bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 rounded-full px-3 py-1">
            <span className="text-xs text-[#c0c1ff]">
              {user.name.charAt(0).toUpperCase()} {user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;