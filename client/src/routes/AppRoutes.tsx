import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/authContext';

// Import Screens (features)
import Login from '../features/auth/Login';
import Signup from '../features/auth/Signup';
import Dashboard from '../features/dashboard/Dashboard';
import OrgSetup from '../features/org-setup/OrgSetup';
import AssetDirectory from '../features/assets/AssetDirectory';
import AssetDetail from '../features/assets/AssetDetail';
import AllocationDirectory from '../features/allocations/AllocationDirectory';
import ResourceBooking from '../features/bookings/ResourceBooking';
import MaintenanceKanban from '../features/maintenance/MaintenanceKanban';
import AuditCycles from '../features/audit/AuditCycles';
import ReportsAnalytics from '../features/reports/ReportsAnalytics';
import NotificationsFeed from '../features/notifications/NotificationsFeed';

// Icons
import {
  LayoutDashboard,
  Settings,
  Boxes,
  ArrowLeftRight,
  CalendarClock,
  Wrench,
  ClipboardCheck,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const PrivateRoute: React.FC<{ children?: React.ReactNode }> = () => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Organization Setup', path: '/org-setup', icon: Settings, role: ['ADMIN'] },
    { name: 'Assets', path: '/assets', icon: Boxes },
    { name: 'Allocation & Transfer', path: '/allocations', icon: ArrowLeftRight },
    { name: 'Resource Booking', path: '/bookings', icon: CalendarClock },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Audit', path: '/audit', icon: ClipboardCheck },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const filteredNav = navItems.filter(item => !item.role || item.role.includes(user.role));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col w-64 bg-surface border-r border-border transition-all duration-300 z-30`}>
        <div className="h-16 flex items-center px-6 border-b border-border">
          {/* Custom App Logo */}
          <img src="/logo.png" className="h-10 w-auto max-w-[180px] object-contain" alt="AssetFlow Logo" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-heading font-semibold text-primary">
              {user.name.charAt(0)}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-surface h-full z-10 border-r border-border animate-slide-in">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border">
              <img src="/logo.png" className="h-10 w-auto max-w-[150px] object-contain" alt="AssetFlow Logo" />
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-border space-y-3">
              <button
                onClick={logout}
                className="flex items-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main App Content Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 z-20">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 mr-2 text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-6 h-6" />
            </button>
            {/* Page title placeholder */}
            <span className="font-heading text-sm font-semibold capitalize text-muted-foreground">
              {location.pathname.substring(1).replace('-', ' ') || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center space-y-0 space-x-4">

            {/* Notification Bell Badge */}
            <Link
              to="/notifications"
              className="p-2 rounded-full border border-border hover:bg-surface-hover transition-all text-muted-foreground hover:text-foreground relative"
            >
              <Bell className="w-5 h-5" />
              {/* Optional live badge counts could render here */}
            </Link>

            <div className="hidden sm:flex items-center pl-2 border-l border-border">
              <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </header>

        {/* Content Box */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/org-setup" element={<RoleGuard roles={['ADMIN']}><OrgSetup /></RoleGuard>} />
            <Route path="/assets" element={<AssetDirectory />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/allocations" element={<AllocationDirectory />} />
            <Route path="/bookings" element={<ResourceBooking />} />
            <Route path="/maintenance" element={<MaintenanceKanban />} />
            <Route path="/audit" element={<AuditCycles />} />
            <Route path="/reports" element={<ReportsAnalytics />} />
            <Route path="/notifications" element={<NotificationsFeed />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// Guard component checking authorization
export const RoleGuard: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// Guard component redirecting authenticated users away from auth pages
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="*" element={<PrivateRoute />} />
    </Routes>
  );
};
