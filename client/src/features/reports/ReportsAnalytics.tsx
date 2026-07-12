import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { BarChart3, FileDown, CalendarRange, HelpCircle, ShieldAlert, Award } from 'lucide-react';

const ReportsAnalytics: React.FC = () => {
  // 1. DATA QUERIES
  const { data: utilization, isLoading: utilLoading } = useQuery({
    queryKey: ['reportUtilization'],
    queryFn: async () => {
      const response = await api.get('/reports/utilization');
      return response.data;
    },
  });

  const { data: maintenanceFreq, isLoading: maintLoading } = useQuery({
    queryKey: ['reportMaintFreq'],
    queryFn: async () => {
      const response = await api.get('/reports/maintenance-frequency');
      return response.data;
    },
  });

  const { data: retirementList, isLoading: retireLoading } = useQuery({
    queryKey: ['reportRetirement'],
    queryFn: async () => {
      const response = await api.get('/reports/upcoming-maintenance-or-retirement');
      return response.data;
    },
  });

  const { data: heatmapData, isLoading: heatLoading } = useQuery({
    queryKey: ['reportHeatmap'],
    queryFn: async () => {
      const response = await api.get('/reports/booking-heatmap');
      return response.data;
    },
  });

  // Export CSV triggers
  const handleExportCSV = () => {
    window.open('http://localhost:5000/api/v1/reports/export', '_blank');
  };

  if (utilLoading || maintLoading || retireLoading || heatLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-surface-hover w-48 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-surface rounded-xl border border-border animate-shimmer" />
          <div className="h-80 bg-surface rounded-xl border border-border animate-shimmer" />
        </div>
      </div>
    );
  }

  // Compile Heatmap color mapping helper
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-900 text-transparent';
    if (count <= 2) return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300';
    if (count <= 5) return 'bg-emerald-300 dark:bg-emerald-800/60 text-emerald-950 dark:text-emerald-100';
    return 'bg-emerald-500 text-white';
  };

  // Sort upcoming retirement list
  const expiredWarrantyAssets = retirementList?.filter((r: any) => r.isWarrantyExpired) || [];
  const validWarrantyAssets = retirementList?.filter((r: any) => !r.isWarrantyExpired) || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-heading">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">View hardware utilization trends, maintenance forecasts, and heatmaps</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover transition-all bg-surface shadow-sm"
        >
          <FileDown className="w-4 h-4 mr-2 text-primary" />
          Export Assets CSV
        </button>
      </div>

      {/* Grid: Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Utilization Rate */}
        <div className="bg-surface border border-border p-5 rounded-xl flex flex-col h-96 shadow-sm">
          <h3 className="text-base font-heading font-semibold mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-primary" />
            Schema Asset Utilization Rate (%)
          </h3>
          <div className="flex-1 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilization} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="categoryName" />
                <YAxis unit="%" />
                <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
                <Legend />
                <Bar dataKey="utilizationRate" fill="#192A56" radius={[4, 4, 0, 0]} name="Utilization Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Maintenance frequency */}
        <div className="bg-surface border border-border p-5 rounded-xl flex flex-col h-96 shadow-sm">
          <h3 className="text-base font-heading font-semibold mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-orange-500" />
            Maintenance Ticket Log Trends
          </h3>
          <div className="flex-1 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={maintenanceFreq} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2.5} name="Total Requests" />
                <Line type="monotone" dataKey="critical" stroke="#EF4444" strokeWidth={2} name="Critical Tickets" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* GitHub Contributions style Booking Heatmap Grid */}
      <div className="bg-surface border border-border p-5 rounded-xl shadow-sm">
        <h3 className="text-base font-heading font-semibold mb-4 flex items-center">
          <CalendarRange className="w-5 h-5 mr-2 text-accent" />
          Shared Resource Booking Heatmap
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Highlights peak booking slots (days of week vs. hour ranges) to optimize reservation load.</p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border border border-border text-center text-xs">
            <thead className="bg-surface-hover font-semibold">
              <tr>
                <th className="px-4 py-2 text-left">Day of Week</th>
                <th className="px-4 py-2">09:00 - 12:00</th>
                <th className="px-4 py-2">12:00 - 15:00</th>
                <th className="px-4 py-2">15:00 - 18:00</th>
                <th className="px-4 py-2">18:00 - 21:00</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <tr key={day} className="hover:bg-surface-hover/30">
                  <td className="px-4 py-3 font-semibold text-left border-r border-border">{day}</td>
                  {['09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00', '18:00 - 21:00'].map(slot => {
                    const cell = heatmapData?.find((h: any) => h.day === day && h.hourRange === slot);
                    const count = cell ? cell.count : 0;
                    return (
                      <td key={slot} className={`px-4 py-3 font-mono font-bold ${getHeatmapColor(count)}`}>
                        {count > 0 ? `${count} reserve(s)` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Assets nearing retirement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Out of warranty logs */}
        <div className="bg-surface border border-border p-5 rounded-xl h-80 flex flex-col shadow-sm">
          <h3 className="text-base font-heading font-semibold mb-3 flex items-center text-red-500">
            <ShieldAlert className="w-5 h-5 mr-2" />
            Warranty Expired Assets ({expiredWarrantyAssets.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 text-xs">
            {expiredWarrantyAssets.length === 0 ? (
              <p className="text-muted-foreground italic text-center py-10">No assets have expired warranties.</p>
            ) : (
              expiredWarrantyAssets.map((asset: any) => (
                <div key={asset.id} className="p-2.5 border border-red-500/20 bg-red-500/5 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold">{asset.name}</p>
                    <p className="text-[10px] text-muted-foreground">Tag: {asset.assetTag} | Location: {asset.location}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                    Warranty Ended
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Nearing retirement or safe assets */}
        <div className="bg-surface border border-border p-5 rounded-xl h-80 flex flex-col shadow-sm">
          <h3 className="text-base font-heading font-semibold mb-3 flex items-center text-emerald-600">
            <Award className="w-5 h-5 mr-2" />
            Warranty Active Assets ({validWarrantyAssets.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 text-xs">
            {validWarrantyAssets.length === 0 ? (
              <p className="text-muted-foreground italic text-center py-10">No assets with active warranties.</p>
            ) : (
              validWarrantyAssets.map((asset: any) => (
                <div key={asset.id} className="p-2.5 border border-emerald-500/20 bg-emerald-500/5 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold">{asset.name}</p>
                    <p className="text-[10px] text-muted-foreground">Tag: {asset.assetTag} | Location: {asset.location}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Warranty OK
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;
