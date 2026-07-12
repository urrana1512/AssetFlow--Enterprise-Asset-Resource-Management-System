import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import { ArrowLeft, ClipboardList, Settings, Calendar, ShieldCheck, UserCheck, Wrench } from 'lucide-react';

const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');

  // 1. Fetch Asset Details
  const { data: asset, isLoading: assetLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const response = await api.get(`/assets/${id}`);
      return response.data;
    },
  });

  // 2. Fetch Unified Timeline History
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['assetHistory', id],
    queryFn: async () => {
      const response = await api.get(`/assets/${id}/history`);
      return response.data;
    },
  });

  if (assetLoading) {
    return (
      <div className="flex justify-center py-20 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-red-500 font-semibold">Asset not found.</p>
        <Link to="/assets" className="text-primary hover:underline text-sm font-semibold">Back to directory</Link>
      </div>
    );
  }

  const specKeys = Object.keys(asset.extraFields || {});

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div>
        <Link to="/assets" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-semibold">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Directory
        </Link>
      </div>

      {/* Asset Header Grid */}
      <div className="bg-surface border border-border p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center font-heading font-bold text-primary text-xl">
            {asset.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold font-heading">{asset.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                asset.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-600' :
                asset.status === 'ALLOCATED' ? 'bg-status-allocated/10 text-status-allocated' :
                asset.status === 'UNDER_MAINTENANCE' ? 'bg-orange-500/10 text-orange-600' :
                'bg-slate-500/10 text-muted-foreground'
              }`}>
                {asset.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm font-mono text-muted-foreground">Asset Tag: {asset.assetTag}</p>
          </div>
        </div>

        {/* QR code and Print details */}
        {asset.qrCodeUrl && (
          <div className="flex items-center border border-border p-3 rounded-lg bg-background shadow-inner max-w-xs">
            <img src={asset.qrCodeUrl} alt="Asset QR Code" className="w-12 h-12 mr-3" />
            <div className="text-left text-xs space-y-0.5">
              <p className="font-bold">PRINTABLE TAG</p>
              <p className="text-muted-foreground font-mono">{asset.assetTag}</p>
              <button
                onClick={() => window.print()}
                className="text-[10px] text-primary font-bold hover:underline"
              >
                Print Label View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center pb-3 pt-1 text-sm font-semibold border-b-2 px-1 transition-all ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center pb-3 pt-1 text-sm font-semibold border-b-2 px-1 transition-all ${
            activeTab === 'timeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4 mr-2" />
          Activity Timeline
        </button>
      </div>

      {/* TAB PANELS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-surface border border-border p-6 rounded-xl space-y-4">
              <h3 className="text-lg font-heading font-semibold border-b border-border pb-2">Specification Schema Data</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Category</p>
                  <p className="font-semibold">{asset.category.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Serial Number</p>
                  <p className="font-mono font-semibold">{asset.serialNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Condition</p>
                  <p className="font-semibold">{asset.condition}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Location</p>
                  <p className="font-semibold">{asset.location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Acquisition Cost</p>
                  <p className="font-semibold">{asset.acquisitionCost ? `$${asset.acquisitionCost}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Acquisition Date</p>
                  <p className="font-semibold">
                    {asset.acquisitionDate ? new Date(asset.acquisitionDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom attributes (Step 2 inputs value list) */}
            <div className="bg-surface border border-border p-6 rounded-xl space-y-4">
              <h3 className="text-lg font-heading font-semibold border-b border-border pb-2">Category-Specific Specifications</h3>
              
              {specKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">No specifications logged.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {specKeys.map(key => (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground font-semibold uppercase">{key}</p>
                      <p className="font-semibold">{asset.extraFields[key] || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uploaded Documents */}
            {asset.documentUrls && asset.documentUrls.length > 0 && (
              <div className="bg-surface border border-border p-6 rounded-xl space-y-3">
                <h3 className="text-lg font-heading font-semibold border-b border-border pb-2">Documents & Invoices</h3>
                <ul className="space-y-2">
                  {asset.documentUrls.map((docUrl: string, idx: number) => (
                    <li key={idx} className="flex justify-between items-center text-xs p-3 bg-background border border-border rounded-lg font-mono">
                      <span>Doc-{idx + 1}: {docUrl.split('/').pop()}</span>
                      <a href={docUrl} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Photo gallery */}
          <div className="space-y-6">
            <div className="bg-surface border border-border p-6 rounded-xl space-y-4">
              <h3 className="text-lg font-heading font-semibold border-b border-border pb-2">Photos</h3>
              {asset.photoUrls && asset.photoUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {asset.photoUrls.map((url: string, idx: number) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="block h-24 border border-border rounded-lg overflow-hidden bg-background">
                      <img src={url} alt={`asset phot-${idx}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-10">No photos registered.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-surface border border-border p-6 rounded-xl">
          <h3 className="text-lg font-heading font-semibold mb-6 border-b border-border pb-2">Lifecycle Tracking Timeline</h3>
          
          {historyLoading ? (
            <p className="text-sm text-center text-muted-foreground py-10">Loading history logs...</p>
          ) : !history || history.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-10">No tracking logs recorded yet.</p>
          ) : (
            <div className="relative pl-6 border-l-2 border-border space-y-6">
              {history.map((log: any) => {
                const isAllocation = log.type === 'allocation';
                const isReturn = log.type === 'return';
                
                return (
                  <div key={log.id} className="relative">
                    {/* Circle icon marker on border timeline line */}
                    <div className={`absolute -left-[31px] top-0 p-1.5 rounded-full border bg-surface ${
                      isAllocation ? 'border-primary text-primary' :
                      isReturn ? 'border-emerald-500 text-emerald-500' :
                      'border-orange-500 text-orange-500'
                    }`}>
                      {isAllocation ? <UserCheck className="w-3.5 h-3.5" /> :
                       isReturn ? <ShieldCheck className="w-3.5 h-3.5" /> :
                       <Wrench className="w-3.5 h-3.5" />}
                    </div>

                    {/* Timeline card text */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-sm">{log.title}</p>
                        <span className="text-[10px] text-muted-foreground font-mono bg-surface-hover px-1.5 py-0.5 rounded border border-border">
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{log.description}</p>
                      {log.user && (
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          Logged by: {log.user.name} ({log.user.email})
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetDetail;
