import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useAuth } from '../../lib/authContext';
import { getSocket } from '../../lib/socket';
import { Bell, Info, AlertTriangle, ShieldCheck, Calendar, Activity, Check } from 'lucide-react';

const NotificationsFeed: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Realtime notification state
  const [realtimeNotifs, setRealtimeNotifs] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'notifications' | 'activityLogs'>('notifications');

  // 1. DATA QUERIES
  const { data: notifications, isLoading: notifsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    },
  });

  const { data: activityLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['activityLogs'],
    queryFn: async () => {
      if (user?.role !== 'ADMIN' && user?.role !== 'ASSET_MANAGER') return [];
      const response = await api.get('/activity-logs');
      return response.data;
    },
    enabled: user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER',
  });

  // Sync initial notifications
  useEffect(() => {
    if (notifications) {
      setRealtimeNotifs(notifications);
    }
  }, [notifications]);

  // 2. SOCKET LISTENER FOR REALTIME NOTIFICATIONS
  useEffect(() => {
    const socket = getSocket();

    socket.on('notification:received', (newNotif: any) => {
      setRealtimeNotifs(prev => [newNotif, ...prev]);
    });

    return () => {
      socket.off('notification:received');
    };
  }, []);

  // 3. MUTATIONS
  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      // Loop over unread and mark them
      const unread = realtimeNotifs.filter(n => !n.isRead);
      await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'asset_assigned': return <ShieldCheck className="w-5 h-5 text-primary" />;
      case 'asset_overdue': return <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />;
      case 'booking_confirmed': return <Calendar className="w-5 h-5 text-accent" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const isManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-heading">Alerts & Logging</h2>
          <p className="text-sm text-muted-foreground">Monitor in-app notifications and review audit trail activity logs</p>
        </div>
        {activeSubTab === 'notifications' && realtimeNotifs.some(n => !n.isRead) && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="flex items-center px-3 py-1.5 border border-border bg-surface text-xs font-semibold rounded-lg hover:bg-surface-hover"
          >
            <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Tabs Selector (Managers see both, Employees only see notifications) */}
      {isManager && (
        <div className="flex border-b border-border space-x-4">
          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`flex items-center pb-3 pt-1 text-sm font-semibold border-b-2 px-1 transition-all ${
              activeSubTab === 'notifications'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="w-4 h-4 mr-2" />
            In-App Notifications
          </button>
          <button
            onClick={() => setActiveSubTab('activityLogs')}
            className={`flex items-center pb-3 pt-1 text-sm font-semibold border-b-2 px-1 transition-all ${
              activeSubTab === 'activityLogs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="w-4 h-4 mr-2" />
            System Activity Audit Trail
          </button>
        </div>
      )}

      {/* SUB-PANEL A: NOTIFICATIONS */}
      {activeSubTab === 'notifications' && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4 max-w-3xl">
          {notifsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-10">Loading notifications...</p>
          ) : realtimeNotifs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">All clear! No new notifications.</p>
          ) : (
            <div className="divide-y divide-border space-y-3">
              {realtimeNotifs.map((notif: any) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && readMutation.mutate(notif.id)}
                  className={`pt-3 first:pt-0 flex items-start justify-between cursor-pointer group ${
                    !notif.isRead ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-muted-foreground'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-background border border-border rounded-lg group-hover:border-primary/20 transition-all">
                      {getNotifIcon(notif.type)}
                    </div>
                    <div>
                      <p className="text-sm leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!notif.isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2 shadow shadow-primary/40 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-PANEL B: SYSTEM ACTIVITY LOGS (ADMIN ONLY) */}
      {activeSubTab === 'activityLogs' && isManager && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity Target</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Triggered By</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Role</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logged At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logsLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Loading audit trail...</td>
                </tr>
              ) : activityLogs?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No logs recorded.</td>
                </tr>
              ) : (
                activityLogs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-surface-hover/30 text-xs">
                    <td className="px-6 py-4 font-bold text-primary">{log.action.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 font-mono">{log.entityType} ({log.entityId.slice(-6)})</td>
                    <td className="px-6 py-4 font-semibold">{log.employee?.name}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground">{log.employee?.role}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NotificationsFeed;
