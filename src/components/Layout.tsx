import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Users, Clock, LogOut, Home, ShieldCheck, UserCircle } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { to: '/schedules', label: 'Grafiki', icon: CalendarDays, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { to: '/shifts', label: 'Moje zmiany', icon: Clock, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { to: '/availability', label: 'Dostępność', icon: CalendarDays, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { to: '/users', label: 'Pracownicy', icon: Users, roles: ['MANAGER', 'ADMIN'] },
  { to: '/admin', label: 'Administracja', icon: ShieldCheck, roles: ['ADMIN'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visible = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Scheduler</h1>
          <p className="text-xs text-gray-400 mt-1">System zarządzania grafikami</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visible.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <UserCircle size={20} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Wyloguj
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
