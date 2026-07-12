import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/axios';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../lib/authContext';
import { Link } from 'react-router-dom';
import {
  Boxes,
  ArrowLeftRight,
  CalendarClock,
  Wrench,
  AlertTriangle,
  Clock,
  PlusCircle,
  Play,
  CheckCircle,
  FileText
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeLogs, setRealtimeLogs] = useState<any[]>([]);

  // 1. Fetch Dashboard Analytics
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const response = await api.get('/reports/dashboard');
      return response.data;
    },
  });

  // Sync initial logs from API
  useEffect(() => {
    if (dashboardData?.recentActivity) {
      setRealtimeLogs(dashboardData.recentActivity);
    }
  }, [dashboardData]);

  // 2. Realtime Updates via Socket.io
  useEffect(() => {
    const socket = getSocket();
    
    socket.on('activity_log:created', (newLog: any) => {
      setRealtimeLogs(prev => [newLog, ...prev.slice(0, 9)]);
      // Re-trigger KPI refetch
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    });

    return () => {
      socket.off('activity_log:created');
    };
  }, [queryClient]);

  // 3. Quick Action Modal State (Raise Maintenance)
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [maintenanceAssetId, setMaintenanceAssetId] = useState('');
  const [maintenanceIssue, setMaintenanceIssue] = useState('');
  const [maintenancePriority, setMaintenancePriority] = useState('Medium');
  const [maintenanceSuccess, setMaintenanceSuccess] = useState<string | null>(null);

  // Fetch assets for maintenance request selector
  const { data: assets } = useQuery({
    queryKey: ['myAssets'],
    queryFn: async () => {
      const response = await api.get('/assets');
      return response.data;
    },
  });

  const raiseMaintenanceMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/maintenance-requests', data);
    },
    onSuccess: () => {
      setMaintenanceSuccess('Maintenance request raised successfully!');
      setMaintenanceAssetId('');
      setMaintenanceIssue('');
      setMaintenancePriority('Medium');
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      setTimeout(() => {
        setIsMaintenanceOpen(false);
        setMaintenanceSuccess(null);
      }, 1500);
    },
  });

  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceAssetId || !maintenanceIssue) return;
    raiseMaintenanceMutation.mutate({
      assetId: maintenanceAssetId,
      issue: maintenanceIssue,
      priority: maintenancePriority,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-surface-hover w-48 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-surface rounded-xl border border-border animate-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-surface rounded-xl border border-border animate-shimmer" />
          <div className="h-96 bg-surface rounded-xl border border-border animate-shimmer" />
        </div>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {
    assetsAvailable: 0,
    assetsAllocated: 0,
    maintenanceToday: 0,
    activeBookings: 0,
    pendingTransfers: 0,
    upcomingReturnsCount: 0,
  };

  const overdueReturns = dashboardData?.overdueReturns || [];

  const cards = [
    { name: 'Assets Available', value: kpis.assetsAvailable, icon: Boxes, color: 'text-emerald-500 bg-emerald-500/10' },
    { name: 'Assets Allocated', value: kpis.assetsAllocated, icon: ArrowLeftRight, color: 'text-primary bg-primary/10' },
    { name: 'Under Maintenance', value: kpis.maintenanceToday, icon: Wrench, color: 'text-orange-500 bg-orange-500/10' },
    { name: 'Active Bookings', value: kpis.activeBookings, icon: CalendarClock, color: 'text-amber-500 bg-amber-500/10' },
    { name: 'Pending Transfers', value: kpis.pendingTransfers, icon: ArrowLeftRight, color: 'text-purple-500 bg-purple-500/10' },
    { name: 'Upcoming Returns', value: kpis.upcomingReturnsCount, icon: Clock, color: 'text-slate-500 bg-slate-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Overdue returns banner */}
      {overdueReturns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-3 shrink-0" />
            <div>
              <p className="font-bold text-sm">Critical: Overdue Asset Returns Detected</p>
              <p className="text-xs opacity-90">
                {overdueReturns.length} allocation(s) are past their expected check-in dates. Check the return directory to contact holders.
              </p>
            </div>
          </div>
          <Link to="/allocations" className="text-xs font-semibold underline hover:no-underline px-3 py-1.5 bg-red-500/20 rounded-lg">
            Resolve Returns
          </Link>
        </motion.div>
      )}

      {/* KPI Section */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          show: { transition: { staggerChildren: 0.05 } },
        }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}
              className="bg-surface border border-border p-4 rounded-xl flex flex-col justify-between transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground truncate">{card.name}</span>
                <span className={`p-1.5 rounded-lg ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold font-heading">{card.value}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Actions Panel */}
      <div className="bg-surface border border-border p-5 rounded-xl">
        <h3 className="font-heading font-semibold text-base mb-4">Quick Workflows</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/assets"
            className="flex items-center p-4 rounded-lg border border-border hover:bg-surface-hover hover:border-primary/30 transition-all"
          >
            <PlusCircle className="w-6 h-6 mr-3 text-primary" />
            <div className="text-left">
              <p className="text-sm font-semibold">Register Asset</p>
              <p className="text-xs text-muted-foreground">Add new items into inventory</p>
            </div>
          </Link>

          <Link
            to="/bookings"
            className="flex items-center p-4 rounded-lg border border-border hover:bg-surface-hover hover:border-primary/30 transition-all"
          >
            <CalendarClock className="w-6 h-6 mr-3 text-accent" />
            <div className="text-left">
              <p className="text-sm font-semibold">Book Resource</p>
              <p className="text-xs text-muted-foreground">Reserve meeting space or laptop</p>
            </div>
          </Link>

          <button
            onClick={() => setIsMaintenanceOpen(true)}
            className="flex items-center p-4 rounded-lg border border-border hover:bg-surface-hover hover:border-primary/30 transition-all w-full text-left"
          >
            <Wrench className="w-6 h-6 mr-3 text-orange-500" />
            <div>
              <p className="text-sm font-semibold">Raise Maintenance</p>
              <p className="text-xs text-muted-foreground">Report damages or hardware failures</p>
            </div>
          </button>
        </div>
      </div>

      {/* Grid: Overdue returns list & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border p-5 rounded-xl flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <h3 className="font-heading font-semibold text-base">Realtime Activity Log</h3>
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {realtimeLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No recent activity logged.</p>
            ) : (
              <AnimatePresence initial={false}>
                {realtimeLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 border border-border bg-background rounded-lg flex items-start justify-between text-sm hover:border-primary/30 transition-all"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.entityType}: {log.entityId}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{log.employee?.name || 'System'}</p>
                      <p className="opacity-75">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Info panel: Upcoming returns */}
        <div className="bg-surface border border-border p-5 rounded-xl flex flex-col h-[400px]">
          <h3 className="font-heading font-semibold text-base mb-4 border-b border-border pb-2">Returns This Week</h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            {dashboardData?.upcomingReturns?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No returns expected this week.</p>
            ) : (
              dashboardData?.upcomingReturns?.map((alloc: any) => (
                <div key={alloc.id} className="p-3 border border-border rounded-lg text-sm bg-background">
                  <p className="font-semibold">{alloc.asset.name}</p>
                  <p className="text-xs text-muted-foreground">Tag: {alloc.asset.assetTag}</p>
                  <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                    <span>Holder: {alloc.employee?.name || 'Department'}</span>
                    <span className="font-semibold">Due: {new Date(alloc.expectedReturnDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Raise Maintenance Request Modal */}
      {isMaintenanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-surface p-6 rounded-xl border border-border shadow-xl">
            <h3 className="font-heading font-bold text-lg mb-2">Raise Maintenance Request</h3>
            <p className="text-xs text-muted-foreground mb-4">Select the asset and report its technical issue details.</p>

            {maintenanceSuccess && (
              <p className="text-sm text-emerald-500 font-semibold bg-emerald-500/10 p-2.5 rounded-lg mb-4 text-center">
                {maintenanceSuccess}
              </p>
            )}

            <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Select Asset
                </label>
                <select
                  required
                  value={maintenanceAssetId}
                  onChange={(e) => setMaintenanceAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2"
                >
                  <option value="">-- Choose Asset --</option>
                  {assets?.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.assetTag})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Issue Details
                </label>
                <textarea
                  required
                  value={maintenanceIssue}
                  onChange={(e) => setMaintenanceIssue(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2"
                  placeholder="Describe the failure details (e.g. keyboard keys not working, screen flicker)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Priority
                </label>
                <select
                  value={maintenancePriority}
                  onChange={(e) => setMaintenancePriority(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMaintenanceOpen(false)}
                  className="w-1/2 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={raiseMaintenanceMutation.isPending}
                  className="w-1/2 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
