import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useAuth } from '../../lib/authContext';
import { ArrowRight, AlertOctagon, CheckCircle2, RotateCcw, Send, Check, X, ShieldAlert } from 'lucide-react';

const AllocationDirectory: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Selected state
  const [selectedAssetId, setSelectedAssetId] = useState('');
  
  // Allocation Form State
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [allocError, setAllocError] = useState<string | null>(null);

  // Transfer Form State
  const [transferToId, setTransferToId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Return Form State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnAllocId, setReturnAllocId] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnNotes, setReturnNotes] = useState('');

  // 1. DATA QUERIES
  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await api.get('/assets');
      return response.data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees');
      return response.data;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments');
      return response.data;
    },
  });

  const { data: transfers } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      const response = await api.get('/transfer-requests');
      return response.data;
    },
  });

  // 2. MUTATIONS
  const allocateMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/allocations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      resetAllocForm();
    },
    onError: (err: any) => {
      setAllocError(err.response?.data?.message || 'Failed to allocate asset');
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/transfer-requests', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setTransferSuccess('Transfer request submitted successfully!');
      setTransferToId('');
      setTransferReason('');
      setTimeout(() => setTransferSuccess(null), 3000);
    },
  });

  const returnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.post(`/allocations/${id}/return`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsReturnModalOpen(false);
      setReturnAllocId('');
      setReturnNotes('');
    },
  });

  const resolveTransferMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      return api.patch(`/transfer-requests/${id}/resolve`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });

  // 3. SELECTION ANALYSIS
  const selectedAsset = assets?.find((a: any) => a.id === selectedAssetId);
  const activeAllocation = selectedAsset?.allocations?.find((al: any) => al.isActive === true);

  const resetAllocForm = () => {
    setEmployeeId('');
    setDepartmentId('');
    setExpectedReturnDate('');
    setAllocError(null);
  };

  const handleAllocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;
    allocateMutation.mutate({
      assetId: selectedAssetId,
      employeeId: employeeId || undefined,
      departmentId: departmentId || undefined,
      expectedReturnDate: expectedReturnDate || undefined,
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAllocation || !transferToId) return;
    transferMutation.mutate({
      allocationId: activeAllocation.id,
      toEmployeeId: transferToId,
      reason: transferReason,
    });
  };

  const openReturnModal = (allocId: string) => {
    setReturnAllocId(allocId);
    setIsReturnModalOpen(true);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnAllocId) return;
    returnMutation.mutate({
      id: returnAllocId,
      data: {
        conditionOnReturn: returnCondition,
        notes: returnNotes,
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT COLUMN: ALLOCATION FLIGHT DECK */}
      <div className="space-y-6">
        <div className="bg-surface border border-border p-5 rounded-xl space-y-4">
          <h3 className="text-lg font-heading font-semibold">Allocation & Returns Deck</h3>

          {/* Select Asset Trigger */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Select Asset
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => {
                setSelectedAssetId(e.target.value);
                setAllocError(null);
              }}
              className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
            >
              <option value="">-- Choose Asset --</option>
              {assets?.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} - {a.name} ({a.status})
                </option>
              ))}
            </select>
          </div>

          {selectedAsset ? (
            <div className="pt-2 space-y-4 border-t border-border">
              {/* Asset quick overview */}
              <div className="p-3 bg-background border rounded-lg text-xs grid grid-cols-2 gap-2">
                <p><span className="font-semibold text-muted-foreground">Asset Tag:</span> {selectedAsset.assetTag}</p>
                <p><span className="font-semibold text-muted-foreground">Category:</span> {selectedAsset.category.name}</p>
                <p><span className="font-semibold text-muted-foreground">Condition:</span> {selectedAsset.condition}</p>
                <p><span className="font-semibold text-muted-foreground">Location:</span> {selectedAsset.location || 'Headquarters'}</p>
              </div>

              {/* CASE 1: ASSET IS ALLOCATED (Show Conflict Banner & Transfer Form or Return Action) */}
              {selectedAsset.status === 'ALLOCATED' && activeAllocation ? (
                <div className="space-y-4">
                  {/* RED CONFLICT BANNER */}
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg space-y-2">
                    <div className="flex items-start">
                      <AlertOctagon className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">Double-Allocation Prevention Conflict</p>
                        <p className="text-xs">
                          Already allocated to{' '}
                          <span className="font-semibold">
                            {activeAllocation.employee ? activeAllocation.employee.name : `Department: ${activeAllocation.departmentId}`}
                          </span>
                        </p>
                      </div>
                    </div>
                    {/* Return Action button */}
                    <button
                      type="button"
                      onClick={() => openReturnModal(activeAllocation.id)}
                      className="flex items-center text-xs font-semibold px-3 py-1.5 bg-red-500/20 rounded-md hover:bg-red-500/30 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Mark Returned / Check-in Condition
                    </button>
                  </div>

                  {/* TRANSFER FORM PANEL */}
                  <div className="border border-border p-4 rounded-lg bg-background space-y-3">
                    <h4 className="font-heading font-semibold text-sm flex items-center text-primary">
                      <Send className="w-4 h-4 mr-2" />
                      Initiate Transfer Request
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Request current holder to transfer custody of the asset directly.
                    </p>

                    {transferSuccess && (
                      <p className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 p-2 text-center rounded">
                        {transferSuccess}
                      </p>
                    )}

                    <form onSubmit={handleTransferSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Transfer To</label>
                        <select
                          required
                          value={transferToId}
                          onChange={(e) => setTransferToId(e.target.value)}
                          className="w-full px-3 py-1.5 border border-border bg-surface rounded-lg text-xs"
                        >
                          <option value="">-- Choose Employee --</option>
                          {employees?.filter((emp: any) => emp.id !== activeAllocation.employeeId).map((emp: any) => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Reason for Transfer</label>
                        <textarea
                          value={transferReason}
                          onChange={(e) => setTransferReason(e.target.value)}
                          className="w-full px-3 py-1.5 border border-border bg-surface rounded-lg text-xs focus:outline-none"
                          rows={2}
                          placeholder="e.g. Needs higher RAM for rendering task"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={transferMutation.isPending}
                        className="w-full py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg"
                      >
                        Submit Direct Transfer Request
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* CASE 2: ASSET IS AVAILABLE (Show standard allocation form) */
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Asset is available for allocation.
                  </div>

                  {allocError && (
                    <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-xs text-center">
                      {allocError}
                    </div>
                  )}

                  <form onSubmit={handleAllocateSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Allocate to Employee</label>
                        <select
                          value={employeeId}
                          onChange={(e) => {
                            setEmployeeId(e.target.value);
                            setDepartmentId(''); // Mutually exclusive choice
                          }}
                          className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm"
                        >
                          <option value="">-- Choose Employee --</option>
                          {employees?.map((emp: any) => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Allocate to Dept</label>
                        <select
                          value={departmentId}
                          onChange={(e) => {
                            setDepartmentId(e.target.value);
                            setEmployeeId(''); // Mutually exclusive choice
                          }}
                          className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm"
                        >
                          <option value="">-- Choose Department --</option>
                          {departments?.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Expected Return Date</label>
                      <input
                        type="date"
                        value={expectedReturnDate}
                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={allocateMutation.isPending}
                      className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/95 transition-all shadow-sm"
                    >
                      Confirm Asset Allocation
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Please select an asset above to manage allocations or request direct transfers.</p>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: TRANSFER REQUESTS DIRECTORY */}
      <div className="space-y-6">
        <div className="bg-surface border border-border p-5 rounded-xl space-y-4 h-[550px] flex flex-col">
          <h3 className="text-lg font-heading font-semibold border-b border-border pb-2">Active Transfer Steppers</h3>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {!transfers || transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-20">No transfer requests pending.</p>
            ) : (
              transfers.map((t: any) => {
                const asset = t.allocation.asset;
                const fromEmp = t.allocation.employee?.name || 'Departmental';
                const toEmpName = t.toEmployee?.name || 'N/A';
                
                // Stepper index based on status
                const statusIdx =
                  t.status === 'REQUESTED' ? 1 :
                  t.status === 'APPROVED' ? 2 :
                  t.status === 'COMPLETED' ? 3 : 0;

                return (
                  <div key={t.id} className="p-4 border border-border bg-background rounded-xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-primary">{asset.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">Tag: {asset.assetTag}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'REQUESTED' ? 'bg-amber-500/10 text-amber-600' :
                        t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    {/* Horizontal Stepper Animation layout */}
                    <div className="grid grid-cols-3 gap-1 items-center relative text-[9px] font-semibold text-center text-muted-foreground">
                      <div className={`space-y-1 ${statusIdx >= 1 ? 'text-primary' : ''}`}>
                        <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center border font-bold ${
                          statusIdx >= 1 ? 'border-primary bg-primary text-white' : 'border-border'
                        }`}>1</div>
                        <p>Requested</p>
                      </div>
                      <div className={`space-y-1 ${statusIdx >= 2 ? 'text-primary' : ''}`}>
                        <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center border font-bold ${
                          statusIdx >= 2 ? 'border-primary bg-primary text-white' : 'border-border'
                        }`}>2</div>
                        <p>Approved</p>
                      </div>
                      <div className={`space-y-1 ${statusIdx >= 3 ? 'text-primary' : ''}`}>
                        <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center border font-bold ${
                          statusIdx >= 3 ? 'border-primary bg-primary text-white' : 'border-border'
                        }`}>3</div>
                        <p>Re-allocated</p>
                      </div>
                    </div>

                    {/* Detailed info & actions */}
                    <div className="pt-2 border-t border-border text-xs space-y-1">
                      <p><span className="font-semibold text-muted-foreground">From:</span> {fromEmp}</p>
                      <p><span className="font-semibold text-muted-foreground">To Target:</span> {toEmpName}</p>
                      {t.reason && <p><span className="font-semibold text-muted-foreground">Reason:</span> "{t.reason}"</p>}
                    </div>

                    {/* Approve/Reject Controls (Manager/Admin only, only on pending requests) */}
                    {t.status === 'REQUESTED' && (user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER') && (
                      <div className="flex space-x-2 pt-1.5">
                        <button
                          onClick={() => resolveTransferMutation.mutate({ id: t.id, action: 'reject' })}
                          className="flex-1 py-1.5 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-semibold flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </button>
                        <button
                          onClick={() => resolveTransferMutation.mutate({ id: t.id, action: 'approve' })}
                          className="flex-1 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg text-xs font-semibold flex items-center justify-center"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Approve Transfer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RETURN NOTES DIALOG MODAL */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-surface p-6 rounded-xl border border-border shadow-xl">
            <h3 className="font-heading font-bold text-lg mb-2">Check-in Returned Asset</h3>
            <p className="text-xs text-muted-foreground mb-4">Validate the physical condition of the hardware upon return receipt.</p>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Condition Rating
                </label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                >
                  <option value="New">New / Unused</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair / Worn</option>
                  <option value="Damaged">Damaged</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Check-in Notes
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none text-sm"
                  placeholder="e.g. Returned charger missing rubber band wrap, laptop works"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReturnModalOpen(false);
                    setReturnAllocId('');
                  }}
                  className="w-1/2 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnMutation.isPending}
                  className="w-1/2 py-2 bg-emerald-500 text-white font-semibold text-sm rounded-lg hover:bg-emerald-600"
                >
                  Complete Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationDirectory;
