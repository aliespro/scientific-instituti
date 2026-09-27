import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  BookMarked,
  CalendarDays,
  Settings,
  Menu,
  X,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Network,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui';
import { toPersianDate } from '@/lib/persianDate';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'داشبورد' },
  { to: '/projects', icon: FolderKanban, label: 'پروژه‌ها' },
  { to: '/tasks', icon: CheckSquare, label: 'وظایف' },
  { to: '/members', icon: Users, label: 'پژوهشگران' },
  { to: '/publications', icon: BookMarked, label: 'انتشارات' },
  { to: '/events', icon: CalendarDays, label: 'رویدادها' },
  { to: '/organization', icon: Network, label: 'ساختار سازمانی' },
];

export function MainLayout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentNav = navItems.find((item) => item.to === location.pathname) ?? navItems[0];

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 right-0 z-50
          w-72 h-screen bg-white border-l border-slate-100
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-5 border-b border-slate-100">
          <Logo size="md" />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            منوی اصلی
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}

          <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            سیستم
          </div>
          <NavLink
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            <Settings size={20} />
            تنظیمات
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 border border-emerald-100">
            <p className="text-xs text-emerald-700 font-medium mb-1">امروز</p>
            <p className="text-sm font-semibold text-emerald-800">{toPersianDate(new Date())}</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <h1 className="text-lg font-bold text-slate-800">{currentNav.label}</h1>
            </div>

            <div className="flex items-center gap-2 lg:gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 w-64">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو..."
                  className="bg-transparent border-0 outline-none text-sm flex-1 placeholder-slate-400"
                />
              </div>

              <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <Bell size={20} className="text-slate-600" />
                <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <Avatar name={user?.email?.split('@')[0] ?? 'کاربر'} size="sm" />
                  <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user?.email?.split('@')[0] ?? 'کاربر'}
                  </span>
                  <ChevronDown size={16} className="text-slate-400 hidden md:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute left-0 mt-2 w-56 card p-2 z-50 animate-slide-up">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <p className="text-sm font-medium text-slate-700 truncate">{user?.email ?? 'کاربر مهمان'}</p>
                        <p className="text-xs text-slate-400">حساب کاربری</p>
                      </div>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        خروج از حساب
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
