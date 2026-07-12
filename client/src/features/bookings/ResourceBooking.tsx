import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';
import { useAuth } from '../../lib/authContext';

import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { Calendar, Plus, Clock, AlertOctagon, RefreshCw, X } from 'lucide-react';

const ResourceBooking: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Resource & form states
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [overlapError, setOverlapError] = useState<string | null>(null);

  // Context menu reschedule state
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isContextOpen, setIsContextOpen] = useState(false);

  // 1. FETCH BOOKABLE ASSETS
  const { data: assets } = useQuery({
    queryKey: ['bookableAssets'],
    queryFn: async () => {
      const response = await api.get('/assets');
      return response.data.filter((a: any) => a.isBookable === true);
    },
  });

  // 2. FETCH BOOKINGS FOR THE CURRENT ASSET
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', selectedAssetId],
    queryFn: async () => {
      if (!selectedAssetId) return [];
      const response = await api.get(`/bookings?assetId=${selectedAssetId}`);
      return response.data;
    },
    enabled: !!selectedAssetId,
  });

  // 3. MUTATIONS
  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/bookings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', selectedAssetId] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setOverlapError(err.response?.data?.message || 'Booking conflict detected on server.');
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/bookings/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', selectedAssetId] });
      setIsContextOpen(false);
      setSelectedBooking(null);
    },
  });

  const rescheduleBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.patch(`/bookings/${id}/reschedule`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', selectedAssetId] });
      setIsContextOpen(false);
      setSelectedBooking(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Reschedule conflict detected.');
    },
  });

  // 4. ACTION HANDLERS
  const resetForm = () => {
    setStartTime('');
    setEndTime('');
    setOverlapError(null);
  };

  // Check overlap locally before submission to wow the user
  const checkLocalOverlap = (startStr: string, endStr: string): boolean => {
    if (!bookings) return false;
    const start = new Date(startStr);
    const end = new Date(endStr);

    return bookings.some((b: any) => {
      if (b.status === 'CANCELLED') return false;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return start < bEnd && end > bStart;
    });
  };

  const handleSelectSlot = (selectInfo: any) => {
    const start = selectInfo.startStr.slice(0, 16); // format to local datetime-local string
    const end = selectInfo.endStr.slice(0, 16);
    setStartTime(start);
    setEndTime(end);
    setOverlapError(null);

    const isOverlap = checkLocalOverlap(start, end);
    if (isOverlap) {
      setOverlapError('Local validation warning: Selecting this slot overlaps with an existing booking block.');
    }
    setIsModalOpen(true);
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !startTime || !endTime) return;

    const isOverlap = checkLocalOverlap(startTime, endTime);
    if (isOverlap) {
      setOverlapError('Conflict Error: You cannot book overlapping slots. Select another window.');
      return;
    }

    createBookingMutation.mutate({
      assetId: selectedAssetId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    });
  };

  const handleEventClick = (clickInfo: any) => {
    const bookingId = clickInfo.event.id;
    const originalBooking = bookings?.find((b: any) => b.id === bookingId);
    if (originalBooking) {
      setSelectedBooking(originalBooking);
      setIsContextOpen(true);
    }
  };

  const handleEventDrop = (dropInfo: any) => {
    const bookingId = dropInfo.event.id;
    const originalBooking = bookings?.find((b: any) => b.id === bookingId);
    if (!originalBooking) return;

    if (
      originalBooking.bookedById !== user?.id &&
      user?.role !== 'ADMIN' &&
      user?.role !== 'ASSET_MANAGER'
    ) {
      alert('Access forbidden: You cannot reschedule someone else\'s booking.');
      dropInfo.revert();
      return;
    }

    const newStart = dropInfo.event.start.toISOString();
    const newEnd = dropInfo.event.end.toISOString();

    rescheduleBookingMutation.mutate({
      id: bookingId,
      data: { startTime: newStart, endTime: newEnd },
    });
  };

  // Convert database bookings to FullCalendar event objects
  const calendarEvents = bookings
    ?.filter((b: any) => b.status !== 'CANCELLED')
    .map((b: any) => {
      // Different colors for user's own bookings vs others
      const isMine = b.bookedById === user?.id;
      return {
        id: b.id,
        title: `${b.asset.name} - ${b.bookedBy.name}`,
        start: b.startTime,
        end: b.endTime,
        backgroundColor: isMine ? '#192A56' : '#7F8C8D', // navy vs slate
        borderColor: isMine ? '#192A56' : '#7F8C8D',
        textColor: '#ffffff',
        editable: isMine || user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER', // drag-and-drop allowed
      };
    }) || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-heading">Resource Booking</h2>
          <p className="text-sm text-muted-foreground">Reserve meeting rooms, hardware kits, or project tools without conflict</p>
        </div>
      </div>

      {/* Select Resource Section */}
      <div className="bg-surface border border-border p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Choose Shared Resource
          </label>
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">-- Select Bookable Asset --</option>
            {assets?.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.assetTag}) - {a.location}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar box */}
      {selectedAssetId ? (
        <div className="bg-surface border border-border p-5 rounded-xl shadow-sm">
          {bookingsLoading ? (
            <p className="text-center py-20 text-muted-foreground animate-pulse">Loading reservations...</p>
          ) : (
            <div className="calendar-container">
              <FullCalendar
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'timeGridWeek,timeGridDay',
                }}
                slotMinTime="08:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                events={calendarEvents}
                selectable={true}
                selectMirror={true}
                select={handleSelectSlot}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                eventResize={handleEventDrop} // Handles end-time resize dragging
                height="600px"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border p-20 rounded-xl text-center space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <h3 className="font-heading font-semibold text-lg">No resource selected</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Choose an asset from the dropdown above to view its booking calendar grid, click cells to request slot reservations.
          </p>
        </div>
      )}

      {/* CREATE BOOKING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-surface p-6 rounded-xl border border-border shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading font-bold text-lg">Reserve Resource</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {overlapError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs flex items-start mb-4">
                <AlertOctagon className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                <p className="font-semibold">{overlapError}</p>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setOverlapError(null);
                  }}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setOverlapError(null);
                  }}
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBookingMutation.isPending}
                  className="w-1/2 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTEXT MENU / EDIT DIALOG */}
      {isContextOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-surface p-6 rounded-xl border border-border shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="font-heading font-bold text-base">Reservation Details</h3>
              <button onClick={() => setIsContextOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1.5 font-medium">
              <p><span className="text-muted-foreground font-normal">Reserved By:</span> {selectedBooking.bookedBy.name}</p>
              <p><span className="text-muted-foreground font-normal">Resource:</span> {selectedBooking.asset.name}</p>
              <p><span className="text-muted-foreground font-normal">Start:</span> {new Date(selectedBooking.startTime).toLocaleString()}</p>
              <p><span className="text-muted-foreground font-normal">End:</span> {new Date(selectedBooking.endTime).toLocaleString()}</p>
            </div>

            {/* Cancel/Modify Trigger buttons */}
            {(selectedBooking.bookedById === user?.id || user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER') ? (
              <div className="space-y-2 pt-2 border-t border-border">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to cancel this reservation?')) {
                      cancelBookingMutation.mutate(selectedBooking.id);
                    }
                  }}
                  disabled={cancelBookingMutation.isPending}
                  className="w-full py-2 bg-red-500 text-white font-semibold text-xs rounded-lg hover:bg-red-600 transition-all"
                >
                  Cancel Booking
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic text-center pt-2">
                You do not have permissions to edit this reservation.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceBooking;
