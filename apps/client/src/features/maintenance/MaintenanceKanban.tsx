import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useAuth } from '../../lib/authContext';
import { Wrench, CheckCircle2, User, UserPlus, AlertCircle, X } from 'lucide-react';

const MaintenanceKanban: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Selected card for technician assignment or rejection
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [techName, setTechName] = useState('');
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  // 1. DATA QUERIES
  const { data: requests, isLoading } = useQuery({
    queryKey: ['maintenanceRequests'],
    queryFn: async () => {
      const response = await api.get('/maintenance-requests');
      return response.data;
    },
  });

  // 2. MUTATIONS
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, technicianName }: { id: string; status: string; technicianName?: string }) => {
      return api.patch(`/maintenance-requests/${id}`, { status, technicianName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] });
      setIsTechModalOpen(false);
      setTechName('');
      setActiveRequest(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Invalid state transition for your role.');
    },
  });

  // 3. KANBAN TRANSITION LOGIC
  const columns = [
    { title: 'Pending', status: 'PENDING', bg: 'bg-slate-100 dark:bg-slate-900' },
    { title: 'Approved', status: 'APPROVED', bg: 'bg-blue-50/50 dark:bg-blue-950/20' },
    { title: 'Tech Assigned', status: 'TECHNICIAN_ASSIGNED', bg: 'bg-amber-50/50 dark:bg-amber-950/20' },
    { title: 'In Progress', status: 'IN_PROGRESS', bg: 'bg-orange-50/50 dark:bg-orange-950/20' },
    { title: 'Resolved', status: 'RESOLVED', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
  ];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const validateTransition = (currentStatus: string, targetStatus: string): boolean => {
    const isManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';

    // 1. Pending -> Approved or Rejected: Manager only
    if (currentStatus === 'PENDING' && (targetStatus === 'APPROVED' || targetStatus === 'REJECTED')) {
      return isManager;
    }
    // 2. Approved -> Tech Assigned: Manager only
    if (currentStatus === 'APPROVED' && targetStatus === 'TECHNICIAN_ASSIGNED') {
      return isManager;
    }
    // 3. Tech Assigned -> In Progress: Anyone
    if (currentStatus === 'TECHNICIAN_ASSIGNED' && targetStatus === 'IN_PROGRESS') {
      return true;
    }
    // 4. In Progress -> Resolved: Anyone
    if (currentStatus === 'IN_PROGRESS' && targetStatus === 'RESOLVED') {
      return true;
    }

    return false;
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (!id) return;

    const request = requests?.find((r: any) => r.id === id);
    if (!request) return;

    if (!validateTransition(request.status, targetStatus)) {
      alert(`Invalid transition: You do not have permissions to move from ${request.status} to ${targetStatus}.`);
      return;
    }

    // Special case: Approved -> Tech Assigned requires inputting technician name
    if (targetStatus === 'TECHNICIAN_ASSIGNED') {
      setActiveRequest(request);
      setIsTechModalOpen(true);
    } else {
      updateStatusMutation.mutate({ id, status: targetStatus });
    }
    setDraggedCardId(null);
  };

  const handleTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest || !techName) return;
    updateStatusMutation.mutate({
      id: activeRequest.id,
      status: 'TECHNICIAN_ASSIGNED',
      technicianName: techName,
    });
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'High': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-500/10 text-muted-foreground border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold font-heading">Maintenance Management</h2>
        <p className="text-sm text-muted-foreground">Drag and drop tickets through approval, assignment, and resolution phases</p>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto min-h-[500px] pb-4">
        {columns.map((col) => {
          const colRequests = requests?.filter((r: any) => r.status === col.status) || [];

          return (
            <div
              key={col.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`p-4 rounded-xl border border-border flex flex-col h-[600px] ${col.bg} transition-all duration-200`}
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                <span className="font-heading font-semibold text-sm">{col.title}</span>
                <span className="text-xs bg-surface-hover border border-border px-2 py-0.5 rounded-full font-bold">
                  {colRequests.length}
                </span>
              </div>

              {/* Column card scroll */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-10">Loading...</p>
                ) : colRequests.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-border/50 rounded-lg">
                    <p className="text-xs text-muted-foreground italic">Column Empty</p>
                  </div>
                ) : (
                  colRequests.map((req: any) => (
                    <div
                      key={req.id}
                      draggable={req.status !== 'RESOLVED'}
                      onDragStart={(e) => handleDragStart(e, req.id)}
                      className="p-3 bg-surface border border-border rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">{req.asset.assetTag}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${getPriorityColor(req.priority)}`}>
                          {req.priority}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{req.asset.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{req.issue}</p>
                      </div>

                      {req.technicianName && (
                        <p className="text-[9px] font-semibold text-slate-600 bg-amber-500/10 px-1.5 py-0.5 rounded inline-block">
                          🔧 Tech: {req.technicianName}
                        </p>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center font-heading font-semibold text-primary text-[8px] mr-1.5">
                            {req.requestedBy.name.charAt(0)}
                          </div>
                          <span className="truncate max-w-[80px]">{req.requestedBy.name}</span>
                        </div>
                        <span className="opacity-75">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ASSIGN TECHNICIAN MODAL */}
      {isTechModalOpen && activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-surface p-6 rounded-xl border border-border shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-heading font-bold text-lg">Assign Technician</h3>
              <button onClick={() => setIsTechModalOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Assign a support engineer to ticket #{activeRequest.id.slice(-6)}.</p>

            <form onSubmit={handleTechSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Technician Full Name
                </label>
                <input
                  type="text"
                  required
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTechModalOpen(false)}
                  className="w-1/2 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="w-1/2 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceKanban;
