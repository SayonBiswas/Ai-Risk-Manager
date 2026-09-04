import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, RotateCcw,
  FileWarning, Key, ShieldCheck, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard',    path: '/dashboard',   Icon: LayoutDashboard },
  { label: 'Fraud Detect', path: '/fraud',        Icon: AlertTriangle },
  { label: 'Return Risk',  path: '/returns',      Icon: RotateCcw },
  { label: 'Chargebacks',  path: '/chargebacks',  Icon: FileWarning },
  { label: 'API Keys',     path: '/api-keys',     Icon: Key },
];

const Sidebar = () => {
  const { user, activeApiKey, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 w-[260px] h-screen bg-[#0d0d15]/90 backdrop-blur-xl border-r border-white/5 flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#c0c1ff]" />
          <span className="text-[#c0c1ff] font-bold text-sm">AI Risk Manager</span>
        </div>
        <p className="text-[10px] text-[#c7c4d7]/40 uppercase tracking-widest mt-0.5">
          Razorpay Buildathon
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 mt-2 overflow-y-auto">
        {navItems.map(({ label, path, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2.5 mx-2 rounded text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#c0c1ff]/10 text-[#c0c1ff] border-l-2 border-[#c0c1ff] rounded-l-none pl-[14px] pr-4'
                  : 'text-[#c7c4d7] hover:bg-white/5 hover:text-[#e4e1ed] px-4'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom status + logout */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2 mb-1">
          {activeApiKey ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
              <span className="text-xs text-[#4edea3]">Connected</span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#ffb95f]" />
              <span className="text-xs text-[#ffb95f]">No API Key</span>
            </>
          )}
        </div>
        {user?.name && (
          <p className="text-xs text-[#c7c4d7]/60 truncate mb-2">{user.name}</p>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-[#c7c4d7]/50 hover:text-[#ffb4ab] transition-colors w-full mt-1"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;