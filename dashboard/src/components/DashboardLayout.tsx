import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Overview', icon: '🏠' },
  { path: '/bookings', label: 'Bookings', icon: '📋' },
  { path: '/schedule', label: 'Jadwal', icon: '📅' },
  { path: '/finance', label: 'Finance', icon: '💰' },
  { path: '/customers', label: 'Customer', icon: '👥' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();

  return (
    <div className="h-dvh flex flex-col bg-bg text-[#EBF0F5]">
      {/* Top bar */}
      <header className="flex-shrink-0 bg-bg2 border-b border-white/10 safe-top">
        <div className="flex items-center px-4 py-2.5 gap-2">
          <div className="flex-1 text-[15px] font-black tracking-tight">
            🎾 TENNIS<span className="text-green">ANS</span>
          </div>
          <span className="text-[9px] bg-green/10 text-green border border-green/25 px-2 py-0.5 rounded-full font-bold">LIVE</span>
          <span className="text-[10px] text-gray-500 font-mono">
            {new Date().toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 safe-bottom">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex bg-bg2 border-t border-white/10 safe-bottom z-50">
        {navItems.map(({ path, label, icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                isActive ? 'text-green' : 'text-gray-500'
              }`}
            >
              <span className="text-[19px]">{icon}</span>
              <span className="text-[9px] font-semibold">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
