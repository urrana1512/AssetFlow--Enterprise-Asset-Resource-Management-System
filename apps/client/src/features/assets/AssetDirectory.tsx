import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';
import { useAuth } from '../../lib/authContext';
import { Search, Plus, Filter, FileUp, QrCode, ClipboardList, Info, Eye, X } from 'lucide-react';

const AssetDirectory: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // 1. DATA QUERIES
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', search, statusFilter, categoryFilter, locationFilter],
    queryFn: async () => {
      const response = await api.get('/assets', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          location: locationFilter || undefined,
        },
      });
      return response.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
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

  // 2. MULTI-STEP REGISTRATION SHEET STATE
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = Basic Info, 2 = Dynamic Fields, 3 = Files, 4 = Preview/Confirm

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState('New');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [isBookable, setIsBookable] = useState(false);
  const [departmentId, setDepartmentId] = useState('');

  // Dynamic spec field values
  const [specValues, setSpecValues] = useState<{ [key: string]: string }>({});

  // File states
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // 3. MUTATIONS
  const registerAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/assets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsOpen(false);
      resetRegForm();
    },
    onError: (err: any) => {
      setRegError(err.response?.data?.message || 'Failed to register asset');
    },
  });

  // 4. ACTION HANDLERS
  const resetRegForm = () => {
    setStep(1);
    setName('');
    setCategoryId('');
    setSerialNumber('');
    setLocation('');
    setCondition('New');
    setAcquisitionCost('');
    setAcquisitionDate('');
    setIsBookable(false);
    setDepartmentId('');
    setSpecValues({});
    setUploadedPhotos([]);
    setUploadedDocs([]);
    setRegError(null);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setCategoryId(id);
    setSpecValues({});
  };

  const selectedCat = categories?.find((c: any) => c.id === categoryId);
  const dynamicFieldKeys = selectedCat ? Object.keys(selectedCat.extraFields || {}) : [];

  const handleSpecFieldChange = (key: string, value: string) => {
    setSpecValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Upload helper using express static folder destination
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'doc') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = response.data.url;
      if (type === 'photo') {
        setUploadedPhotos(prev => [...prev, url]);
      } else {
        setUploadedDocs(prev => [...prev, url]);
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('File upload failed. Ensure server is running.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitRegistration = () => {
    registerAssetMutation.mutate({
      name,
      categoryId,
      serialNumber: serialNumber || undefined,
      location: location || undefined,
      condition,
      acquisitionCost: acquisitionCost ? Number(acquisitionCost) : undefined,
      acquisitionDate: acquisitionDate || undefined,
      isBookable,
      departmentId: departmentId || undefined,
      extraFields: specValues,
      photoUrls: uploadedPhotos,
      documentUrls: uploadedDocs,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-heading">Asset Directory</h2>
          <p className="text-sm text-muted-foreground">Register and manage organizational hardware schemas and statuses</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER') && (
          <button
            onClick={() => {
              resetRegForm();
              setIsOpen(true);
            }}
            className="flex items-center px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/95 transition-all shadow-sm"
          >
            <Plus className="w-4.5 h-4.5 mr-2" />
            Register Asset
          </button>
        )}
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-surface border border-border p-4 rounded-xl shadow-sm">
        <div className="relative">
          <Search className="w-4.5 h-4.5 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Search tag/serial/name..."
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ALLOCATED">Allocated</option>
          <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          <option value="LOST">Lost</option>
          <option value="RETIRED">Retired</option>
          <option value="DISPOSED">Disposed</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories?.map((c: any) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <input
          type="text"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none"
          placeholder="Location (e.g. Headquarters)"
        />
      </div>

      {/* Assets Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-hover">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asset Tag</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asset Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Serial</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">Loading directory assets...</td>
              </tr>
            ) : assets?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">No assets found matching filters.</td>
              </tr>
            ) : (
              assets?.map((asset: any) => (
                <tr key={asset.id} className="hover:bg-surface-hover/30">
                  <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">{asset.assetTag}</td>
                  <td className="px-6 py-4 font-semibold">{asset.name}</td>
                  <td className="px-6 py-4">{asset.category.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{asset.serialNumber || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      asset.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-600' :
                      asset.status === 'ALLOCATED' ? 'bg-status-allocated/10 text-status-allocated' :
                      asset.status === 'UNDER_MAINTENANCE' ? 'bg-orange-500/10 text-orange-600' :
                      asset.status === 'LOST' ? 'bg-red-500/10 text-red-500' :
                      'bg-slate-500/10 text-muted-foreground'
                    }`}>
                      {asset.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">{asset.location || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/assets/${asset.id}`}
                      className="p-1.5 border border-border rounded hover:bg-surface-hover transition-all text-muted-foreground hover:text-foreground inline-flex items-center space-x-1 text-xs font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REGISTRATION MULTI-STEP SLIDE-OVER SHEET */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col border-l border-border animate-slide-in">
            {/* Sheet Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-6">
              <div>
                <h3 className="font-heading font-bold text-lg">Register Asset</h3>
                <p className="text-xs text-muted-foreground">Step {step} of 4</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Sheet Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {regError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm text-center">
                  {regError}
                </div>
              )}

              {/* STEP 1: BASIC INFO */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Asset Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                      placeholder="e.g. MacBook Pro M3"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Category *</label>
                    <select
                      required
                      value={categoryId}
                      onChange={handleCategoryChange}
                      className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                    >
                      <option value="">-- Select Category --</option>
                      {categories?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                        placeholder="SN-12345"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Default Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                        placeholder="Headquarters"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Acquisition Cost</label>
                      <input
                        type="number"
                        value={acquisitionCost}
                        onChange={(e) => setAcquisitionCost(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                        placeholder="1200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Acquisition Date</label>
                      <input
                        type="date"
                        value={acquisitionDate}
                        onChange={(e) => setAcquisitionDate(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Initial Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                    >
                      <option value="New">New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="bookable"
                      checked={isBookable}
                      onChange={(e) => setIsBookable(e.target.checked)}
                      className="rounded border-border focus:ring-primary"
                    />
                    <label htmlFor="bookable" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Mark as Shared/Bookable Resource
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 2: CATEGORY SPECIFIC FIELDS */}
              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="font-heading font-semibold text-sm">Specification Details for {selectedCat?.name}</h4>
                  {dynamicFieldKeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-6">No custom specification fields required for this category.</p>
                  ) : (
                    dynamicFieldKeys.map(key => (
                      <div key={key}>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          {key}
                        </label>
                        <input
                          type="text"
                          value={specValues[key] || ''}
                          onChange={(e) => handleSpecFieldChange(key, e.target.value)}
                          className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                          placeholder={`Enter ${key}`}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* STEP 3: UPLOAD FILES */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-heading font-semibold text-sm mb-2">Upload Asset Images</h4>
                    <div className="border-2 border-dashed border-border p-4 rounded-xl text-center space-y-2 hover:border-primary/30 transition-all relative">
                      <FileUp className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Drag and drop images or click to select</p>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        onChange={(e) => handleFileUpload(e, 'photo')}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    {/* Thumbnail previews */}
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {uploadedPhotos.map((url, idx) => (
                        <div key={idx} className="relative h-16 border rounded-lg overflow-hidden bg-surface">
                          <img src={url} alt="asset thumbnail" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-heading font-semibold text-sm mb-2">Upload Invoice / Manual Documents</h4>
                    <div className="border-2 border-dashed border-border p-4 rounded-xl text-center space-y-2 hover:border-primary/30 transition-all relative">
                      <FileUp className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Select PDF or Doc manual</p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        disabled={uploading}
                        onChange={(e) => handleFileUpload(e, 'doc')}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <ul className="mt-3 space-y-1.5 text-xs">
                      {uploadedDocs.map((url, idx) => (
                        <li key={idx} className="p-2 bg-background border rounded flex items-center justify-between">
                          <span className="truncate">{url.split('/').pop()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* STEP 4: PREVIEW */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="p-4 bg-background border rounded-xl space-y-3">
                    <h4 className="font-heading font-bold text-base text-primary">{name}</h4>
                    <p className="text-xs text-muted-foreground">Category: {selectedCat?.name}</p>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <p><span className="font-semibold text-muted-foreground">Serial:</span> {serialNumber || 'N/A'}</p>
                      <p><span className="font-semibold text-muted-foreground">Location:</span> {location || 'Headquarters'}</p>
                      <p><span className="font-semibold text-muted-foreground">Condition:</span> {condition}</p>
                      <p><span className="font-semibold text-muted-foreground">Cost:</span> {acquisitionCost ? `$${acquisitionCost}` : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="border border-border p-4 rounded-xl flex flex-col items-center text-center space-y-2">
                    <QrCode className="w-16 h-16 text-primary" />
                    <p className="text-sm font-semibold">Printable Label Ready</p>
                    <p className="text-xs text-muted-foreground">Unique asset tag and lookup QR will be generated atomically upon creation.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sheet Footer */}
            <div className="h-16 border-t border-border flex items-center justify-between px-6 bg-surface">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover"
                >
                  Previous
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !name) {
                      alert('Name is required');
                      return;
                    }
                    if (step === 1 && !categoryId) {
                      alert('Category is required');
                      return;
                    }
                    setStep(step + 1);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmitRegistration}
                  disabled={registerAssetMutation.isPending}
                  className="px-5 py-2 bg-accent text-white font-semibold text-sm rounded-lg hover:bg-accent/90"
                >
                  {registerAssetMutation.isPending ? 'Registering...' : 'Confirm & Register'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetDirectory;
