import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { Settings, ShieldAlert, Users, FolderCheck, Plus, Pencil, Power, X } from 'lucide-react';

const OrgSetup: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'departments' | 'categories' | 'employees'>('departments');

  // 1. DATA QUERIES
  const { data: departments, isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments');
      return response.data;
    },
  });

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
  });

  const { data: employees, isLoading: empsLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees');
      return response.data;
    },
  });

  // 2. MODAL STATES
  // Department modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptHeadId, setDeptHeadId] = useState('');
  const [deptParentId, setDeptParentId] = useState('');
  const [deptError, setDeptError] = useState<string | null>(null);

  // Category modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [catName, setCatName] = useState('');
  const [customFields, setCustomFields] = useState<{ [key: string]: boolean }>({});
  const [newFieldName, setNewFieldName] = useState('');
  const [catError, setCatError] = useState<string | null>(null);

  // Employee role promotion modal
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promotingEmp, setPromotingEmp] = useState<any | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  // 3. MUTATIONS
  // Departments
  const saveDeptMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingDept) {
        return api.patch(`/departments/${editingDept.id}`, data);
      }
      return api.post('/departments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsDeptModalOpen(false);
      resetDeptForm();
    },
    onError: (err: any) => {
      setDeptError(err.response?.data?.message || 'Failed to save department');
    },
  });

  const toggleDeptStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/departments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  // Categories
  const saveCatMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCat) {
        return api.patch(`/categories/${editingCat.id}`, data);
      }
      return api.post('/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsCatModalOpen(false);
      resetCatForm();
    },
    onError: (err: any) => {
      setCatError(err.response?.data?.message || 'Failed to save category');
    },
  });

  // Employee promotion
  const promoteMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return api.patch(`/employees/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setPromoteSuccess('Role updated successfully!');
      setTimeout(() => {
        setIsPromoteModalOpen(false);
        setPromotingEmp(null);
        setPromoteSuccess(null);
      }, 1200);
    },
  });

  // 4. WORKFLOW HELPERS
  const resetDeptForm = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptHeadId('');
    setDeptParentId('');
    setDeptError(null);
  };

  const openAddDept = () => {
    resetDeptForm();
    setIsDeptModalOpen(true);
  };

  const openEditDept = (dept: any) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptHeadId(dept.headId || '');
    setDeptParentId(dept.parentId || '');
    setDeptError(null);
    setIsDeptModalOpen(true);
  };

  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName) return;
    saveDeptMutation.mutate({
      name: deptName,
      headId: deptHeadId || null,
      parentId: deptParentId || null,
    });
  };

  const resetCatForm = () => {
    setEditingCat(null);
    setCatName('');
    setCustomFields({});
    setNewFieldName('');
    setCatError(null);
  };

  const openAddCat = () => {
    resetCatForm();
    setIsCatModalOpen(true);
  };

  const openEditCat = (cat: any) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCustomFields(cat.extraFields || {});
    setNewFieldName('');
    setCatError(null);
    setIsCatModalOpen(true);
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    setCustomFields(prev => ({
      ...prev,
      [newFieldName.trim()]: true,
    }));
    setNewFieldName('');
  };

  const removeCustomField = (key: string) => {
    setCustomFields(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    saveCatMutation.mutate({
      name: catName,
      extraFields: customFields,
    });
  };

  const openPromote = (emp: any) => {
    setPromotingEmp(emp);
    setTargetRole(emp.role);
    setIsPromoteModalOpen(true);
  };

  const handlePromoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingEmp || !targetRole) return;
    promoteMutation.mutate({ id: promotingEmp.id, role: targetRole });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold font-heading">Organization Setup</h2>
        <p className="text-sm text-muted-foreground">Manage departments, asset schemas, and promote employees</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border space-x-4">
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center pb-3 pt-1 text-sm font-semibold border-b-2 px-1 transition-all ${
            activeTab === 'departments'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderCheck className="w-4 h-4 mr-2" />
          Departments
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center pb-3 pt-1 text-sm font-semibold border-b-2 px-1 transition-all ${
            activeTab === 'categories'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4 mr-2" />
          Asset Categories
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center pb-3 pt-1 text-sm font-semibold border-b-2 px-1 transition-all ${
            activeTab === 'employees'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Employee Directory
        </button>
      </div>

      {/* TAB CONTENTS */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-heading font-semibold">Departments</h3>
            <button
              onClick={openAddDept}
              className="flex items-center px-3.5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-hover">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department Head</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parent Department</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {deptsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Loading departments...</td>
                  </tr>
                ) : departments?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No departments registered yet.</td>
                  </tr>
                ) : (
                  departments?.map((dept: any) => (
                    <tr key={dept.id} className="hover:bg-surface-hover/30">
                      <td className="px-6 py-4 font-semibold">{dept.name}</td>
                      <td className="px-6 py-4">{dept.head?.name || <span className="text-xs text-muted-foreground italic">None Assigned</span>}</td>
                      <td className="px-6 py-4">{dept.parent?.name || <span className="text-xs text-muted-foreground italic">Root</span>}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          dept.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {dept.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openEditDept(dept)}
                          className="p-1.5 border border-border rounded hover:bg-surface-hover transition-all text-muted-foreground hover:text-foreground inline-flex"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleDeptStatusMutation.mutate({
                            id: dept.id,
                            status: dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                          })}
                          className={`p-1.5 border border-border rounded hover:bg-surface-hover transition-all inline-flex ${
                            dept.status === 'ACTIVE' ? 'text-red-500 hover:bg-red-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-heading font-semibold">Asset Categories</h3>
            <button
              onClick={openAddCat}
              className="flex items-center px-3.5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/95 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-hover">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Schema Fields</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {catsLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">Loading categories...</td>
                  </tr>
                ) : categories?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">No categories defined.</td>
                  </tr>
                ) : (
                  categories?.map((cat: any) => {
                    const fields = Object.keys(cat.extraFields || {});
                    return (
                      <tr key={cat.id} className="hover:bg-surface-hover/30">
                        <td className="px-6 py-4 font-semibold">{cat.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {fields.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">Standard fields only</span>
                            ) : (
                              fields.map(f => (
                                <span key={f} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono border border-border">
                                  {f}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openEditCat(cat)}
                            className="p-1.5 border border-border rounded hover:bg-surface-hover transition-all text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="space-y-4">
          <h3 className="text-lg font-heading font-semibold">Employee Directory</h3>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-hover">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {empsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">Loading employee list...</td>
                  </tr>
                ) : (
                  employees?.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-surface-hover/30">
                      <td className="px-6 py-4 font-semibold">{emp.name}</td>
                      <td className="px-6 py-4 font-mono">{emp.email}</td>
                      <td className="px-6 py-4">{emp.department?.name || <span className="text-xs text-muted-foreground italic">Unassigned</span>}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          emp.role === 'ADMIN'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : emp.role === 'ASSET_MANAGER'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : emp.role === 'DEPARTMENT_HEAD'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-slate-500/10 text-muted-foreground border-slate-500/20'
                        }`}>
                          {emp.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openPromote(emp)}
                          className="px-2.5 py-1.5 border border-border rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-all"
                        >
                          Promote / Set Role
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DEPARTMENT MODAL */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-fade-in">
          <div className="w-full max-w-md bg-surface p-6 rounded-xl border border-border shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading font-bold text-lg">
                {editingDept ? 'Edit Department' : 'Create Department'}
              </h3>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {deptError && (
              <p className="text-sm text-red-500 font-semibold bg-red-500/10 p-2.5 rounded-lg mb-4 text-center">
                {deptError}
              </p>
            )}

            <form onSubmit={handleDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2"
                  placeholder="e.g. Engineering"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Department Head
                </label>
                <select
                  value={deptHeadId}
                  onChange={(e) => setDeptHeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                >
                  <option value="">-- Select Employee --</option>
                  {employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Parent Department (Optional)
                </label>
                <select
                  value={deptParentId}
                  onChange={(e) => setDeptParentId(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                >
                  <option value="">-- Root (No Parent) --</option>
                  {departments
                    ?.filter((d: any) => !editingDept || d.id !== editingDept.id)
                    .map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="w-1/2 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveDeptMutation.isPending}
                  className="w-1/2 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-surface p-6 rounded-xl border border-border shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading font-bold text-lg">
                {editingCat ? 'Edit Category Schema' : 'Create Category Schema'}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {catError && (
              <p className="text-sm text-red-500 font-semibold bg-red-500/10 p-2.5 rounded-lg mb-4 text-center">
                {catError}
              </p>
            )}

            <form onSubmit={handleCatSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                  placeholder="e.g. Mobile Phones"
                />
              </div>

              {/* Dynamic schema editor */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Custom Specification Fields
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none"
                    placeholder="Field name (e.g. Screen Size)"
                  />
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg"
                  >
                    Add Field
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-border p-3 rounded-lg bg-background">
                  {Object.keys(customFields).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">No custom specification fields added yet.</p>
                  ) : (
                    Object.keys(customFields).map(key => (
                      <div key={key} className="flex justify-between items-center text-xs bg-surface p-1.5 border border-border rounded font-mono">
                        <span>{key}</span>
                        <button
                          type="button"
                          onClick={() => removeCustomField(key)}
                          className="text-red-500 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="w-1/2 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveCatMutation.isPending}
                  className="w-1/2 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMOTION DIALOG */}
      {isPromoteModalOpen && promotingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-surface p-6 rounded-xl border border-border shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-heading font-bold text-lg">Promote Employee</h3>
              <button onClick={() => setIsPromoteModalOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Set role promotions for {promotingEmp.name}.</p>

            {promoteSuccess && (
              <p className="text-sm text-emerald-500 font-semibold bg-emerald-500/10 p-2.5 rounded-lg mb-4 text-center">
                {promoteSuccess}
              </p>
            )}

            <form onSubmit={handlePromoteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Assign System Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                >
                  <option value="EMPLOYEE">Employee (Standard Access)</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="ADMIN">System Admin</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="w-1/2 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={promoteMutation.isPending}
                  className="w-1/2 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90"
                >
                  Confirm Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgSetup;
