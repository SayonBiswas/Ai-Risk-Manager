import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, RotateCcw, FileWarning, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { apiKey } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/fraud', label: 'Fraud Detect', icon: AlertTriangle },
    { path: '/returns', label: 'Return Risk', icon: RotateCcw },
    { path: '/chargebacks', label: 'Chargebacks', icon: FileWarning },
  ];

  return (
    <aside className="fixed left-0 top-0 w-[260px] min-h-screen bg-[#0d0d15]/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-50">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={24} className="text-[#c0c1ff]" />
          <h1 className="text-lg font-bold text-[#c0c1ff]">AI Risk Manager</h1>
        </div>
        <p className="text-xs text-[#c7c4d7]/50">Razorpay Buildathon</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-l-2 border-[#c0c1ff] bg-[#c0c1ff]/10 text-[#c0c1ff]'
                      : 'text-[#c7c4d7] hover:bg-white/5 hover:text-[#e4e1ed]'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-[#c7c4d7]">
            {apiKey ? 'API Connected' : 'API Disconnected'}
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
