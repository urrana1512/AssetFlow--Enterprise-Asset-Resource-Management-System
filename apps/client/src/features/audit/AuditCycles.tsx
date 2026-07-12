import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useAuth } from '../../lib/authContext';
import { ClipboardCheck, Plus, CheckCircle, HelpCircle, AlertTriangle, Eye, Lock, Unlock, X } from 'lucide-react';

const AuditCycles: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Selection state
  const [selectedCycleId, setSelectedCycleId] = useState('');

  // 1. DATA QUERIES
  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['auditCycles'],
    queryFn: async () => {
      const response = await api.get('/audit-cycles');
      return response.data;
    },
  });

  const { data: assignments, isLoading: assgnsLoading } = useQuery({
    queryKey: ['auditAssignments', selectedCycleId],
    queryFn: async () => {
      if (!selectedCycleId) return [];
      const response = await api.get(`/audit-assignments?cycleId=${selectedCycleId}`);
      return response.data;
    },
    enabled: !!selectedCycleId,
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

  // 2. CREATE CYCLE WIZARD STATE
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [scopeType, setScopeType] = useState('department');
  const [scopeValue, setScopeValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAuditorIds, setSelectedAuditorIds] = useState<string[]>([]);
  const [wizardError, setWizardError] = useState<string | null>(null);

  // 3. MUTATIONS
  const createCycleMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/audit-cycles', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditCycles'] });
      setIsWizardOpen(false);
      resetWizard();
    },
    onError: (err: any) => {
      setWizardError(err.response?.data?.message || 'Failed to initialize audit cycle.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, verification, notes }: { id: string; verification: string; notes?: string }) => {
      return api.patch(`/audit-assignments/${id}/verify`, { verification, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditAssignments', selectedCycleId] });
    },
  });

  const closeCycleMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/audit-cycles/${id}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditCycles'] });
      queryClient.invalidateQueries({ queryKey: ['auditAssignments', selectedCycleId] });
    },
  });

  // 4. HANDLERS
  const resetWizard = () => {
    setCycleName('');
    setScopeType('department');
    setScopeValue('');
    setStartDate('');
    setEndDate('');
    setSelectedAuditorIds([]);
    setWizardError(null);
  };

  const handleAuditorCheckboxChange = (id: string) => {
    setSelectedAuditorIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleWizardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleName || !scopeValue || !startDate || !endDate || selectedAuditorIds.length === 0) {
      setWizardError('Please complete all form fields and select at least one auditor.');
      return;
    }

    createCycleMutation.mutate({
      name: cycleName,
      scopeType,
      scopeValue,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      auditorIds: selectedAuditorIds,
    });
  };

  const selectedCycle = cycles?.find((c: any) => c.id === selectedCycleId);

  // Live count totals
  const totalAssets = assignments?.length || 0;
  const verifiedCount = assignments?.filter((a: any) => a.verification === 'VERIFIED').length || 0;
  const missingCount = assignments?.filter((a: any) => a.verification === 'MISSING').length || 0;
  const damagedCount = assignments?.filter((a: any) => a.verification === 'DAMAGED').length || 0;
  const pendingCount = assignments?.filter((a: any) => a.verification === 'PENDING').length || 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-heading">Asset Audit Cycles</h2>
          <p className="text-sm text-muted-foreground">Schedule physical count audits and check verification statuses</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => {
              resetWizard();
              setIsWizardOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Audit Cycle
          </button>
        )}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: CYCLES LIST */}
        <div className="bg-surface border border-border p-5 rounded-xl flex flex-col h-[600px] shadow-sm">
          <h3 className="text-base font-heading font-semibold border-b border-border pb-2 mb-4">Audit Schedules</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {cyclesLoading ? (
              <p className="text-xs text-muted-foreground text-center py-10">Loading schedules...</p>
            ) : !cycles || cycles.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">No audit schedules registered.</p>
            ) : (
              cycles.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCycleId(c.id)}
                  className={`w-full text-left p-3.5 border rounded-xl hover:border-primary/40 hover:bg-surface-hover/30 transition-all flex justify-between items-start ${
                    selectedCycleId === c.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden">
                    <p className="font-bold text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Scope: {c.scopeType} ({c.scopeValue})</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                    c.isClosed
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  }`}>
                    {c.isClosed ? 'Closed' : 'Active'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHECKLIST DETAILS */}
        <div className="lg:col-span-2 bg-surface border border-border p-5 rounded-xl flex flex-col h-[600px] shadow-sm">
          {selectedCycle ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Checklist header & close control */}
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div>
                  <h3 className="font-heading font-bold text-base text-primary">{selectedCycle.name}</h3>
                  <p className="text-xs text-muted-foreground">Scope Value: {selectedCycle.scopeValue}</p>
                </div>
                {user?.role === 'ADMIN' && !selectedCycle.isClosed && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to close this audit cycle? Closing locks verification updates and transitions confirmed missing assets to LOST.')) {
                        closeCycleMutation.mutate(selectedCycle.id);
                      }
                    }}
                    disabled={closeCycleMutation.isPending}
                    className="flex items-center text-xs font-semibold px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    Close Cycle
                  </button>
                )}
              </div>

              {/* Status live counts banner */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs border border-border/80 p-2.5 rounded-lg bg-background font-semibold">
                <div className="text-emerald-500">
                  <p className="text-[10px] uppercase font-normal text-muted-foreground">Verified</p>
                  <p>{verifiedCount}</p>
                </div>
                <div className="text-red-500">
                  <p className="text-[10px] uppercase font-normal text-muted-foreground">Missing</p>
                  <p>{missingCount}</p>
                </div>
                <div className="text-orange-500">
                  <p className="text-[10px] uppercase font-normal text-muted-foreground">Damaged</p>
                  <p>{damagedCount}</p>
                </div>
                <div className="text-muted-foreground">
                  <p className="text-[10px] uppercase font-normal text-muted-foreground">Pending</p>
                  <p>{pendingCount}</p>
                </div>
              </div>

              {/* Checklist rows */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {assgnsLoading ? (
                  <p className="text-xs text-center text-muted-foreground py-10">Loading checklist...</p>
                ) : !assignments || assignments.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-10">No assigned assets inside cycle scope.</p>
                ) : (
                  assignments.map((as: any) => {
                    const isClosed = selectedCycle.isClosed;
                    const canVerify = !isClosed && (user?.id === as.auditorId || user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER');

                    return (
                      <div key={as.id} className="p-3 border border-border bg-background rounded-xl space-y-3 hover:border-primary/20 transition-all">
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{as.asset.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">Tag: {as.asset.assetTag}</p>
                          </div>
                          <div className="text-right text-[10px] text-muted-foreground">
                            <p>Auditor: {as.auditor.name}</p>
                          </div>
                        </div>

                        {/* 3-way Segment Control */}
                        <div className="flex border border-border rounded-lg overflow-hidden text-[10px] font-bold">
                          <button
                            type="button"
                            disabled={!canVerify}
                            onClick={() => verifyMutation.mutate({ id: as.id, verification: 'VERIFIED', notes: as.notes })}
                            className={`flex-1 py-1.5 transition-all text-center border-r border-border last:border-0 ${
                              as.verification === 'VERIFIED'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-surface hover:bg-surface-hover text-muted-foreground'
                            }`}
                          >
                            Verified
                          </button>
                          <button
                            type="button"
                            disabled={!canVerify}
                            onClick={() => verifyMutation.mutate({ id: as.id, verification: 'DAMAGED', notes: as.notes })}
                            className={`flex-1 py-1.5 transition-all text-center border-r border-border last:border-0 ${
                              as.verification === 'DAMAGED'
                                ? 'bg-orange-500 text-white'
                                : 'bg-surface hover:bg-surface-hover text-muted-foreground'
                            }`}
                          >
                            Damaged
                          </button>
                          <button
                            type="button"
                            disabled={!canVerify}
                            onClick={() => verifyMutation.mutate({ id: as.id, verification: 'MISSING', notes: as.notes })}
                            className={`flex-1 py-1.5 transition-all text-center border-r border-border last:border-0 ${
                              as.verification === 'MISSING'
                                ? 'bg-red-500 text-white'
                                : 'bg-surface hover:bg-surface-hover text-muted-foreground'
                            }`}
                          >
                            Missing
                          </button>
                        </div>

                        {/* Optional notes input */}
                        <div>
                          <input
                            type="text"
                            disabled={!canVerify}
                            defaultValue={as.notes || ''}
                            onBlur={(e) => {
                              if (e.target.value !== as.notes) {
                                verifyMutation.mutate({ id: as.id, verification: as.verification, notes: e.target.value });
                              }
                            }}
                            className="w-full px-2.5 py-1.5 border border-border rounded-lg text-xs bg-surface focus:outline-none placeholder:italic"
                            placeholder="Add notes (e.g. keyboard keys worn down, missing battery covers)"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground space-y-3">
              <ClipboardCheck className="w-10 h-10 mx-auto text-muted-foreground/45" />
              <h4 className="font-heading font-semibold">No Audit Selected</h4>
              <p className="text-xs max-w-xs mx-auto">Select an audit cycle on the left rail to view and fill out its asset verifications checklists.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE CYCLE WIZARD DIALOG */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-fade-in">
          <div className="w-full max-w-md bg-surface p-6 rounded-xl border border-border shadow-xl">
            <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
              <h3 className="font-heading font-bold text-lg">Create Audit Cycle</h3>
              <button onClick={() => setIsWizardOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {wizardError && (
              <p className="text-xs text-red-500 font-semibold bg-red-500/10 p-2.5 rounded-lg mb-4 text-center">
                {wizardError}
              </p>
            )}

            <form onSubmit={handleWizardSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Cycle Name *</label>
                <input
                  type="text"
                  required
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                  placeholder="e.g. Q3 Engineering Hardware Audit"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Scope Type *</label>
                  <select
                    value={scopeType}
                    onChange={(e) => {
                      setScopeType(e.target.value);
                      setScopeValue('');
                    }}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                  >
                    <option value="department">Department</option>
                    <option value="location">Location (Physical)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Scope Target *</label>
                  {scopeType === 'department' ? (
                    <select
                      required
                      value={scopeValue}
                      onChange={(e) => setScopeValue(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                    >
                      <option value="">-- Choose Dept --</option>
                      {departments?.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={scopeValue}
                      onChange={(e) => setScopeValue(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                      placeholder="e.g. Headquarters"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Auditors Selection Checkboxes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Assign Auditor(s) *</label>
                <div className="border border-border p-3 rounded-lg max-h-36 overflow-y-auto space-y-1.5 bg-background">
                  {employees?.map((emp: any) => (
                    <label key={emp.id} className="flex items-center space-x-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedAuditorIds.includes(emp.id)}
                        onChange={() => handleAuditorCheckboxChange(emp.id)}
                        className="rounded border-border text-primary"
                      />
                      <span>{emp.name} ({emp.role.replace('_', ' ')})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="w-1/2 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCycleMutation.isPending}
                  className="w-1/2 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90"
                >
                  Create Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditCycles;
