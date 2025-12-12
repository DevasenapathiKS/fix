import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrdersAPI, TechniciansAPI, TimeSlotsAPI } from '../services/adminApi';
import type {
  JobCardDetail,
  Order,
  TechnicianCandidate,
  TechnicianScheduleEntry,
  TimeSlotTemplate,
  OrderHistoryEntry,
  FollowUpAttachment
} from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { CalendarDaysIcon, CheckCircleIcon, PrinterIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../utils/format';

const getSlotIdentifier = (slot: TimeSlotTemplate) =>
  slot._id ?? `${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}-${slot.label ?? ''}`;

const getWeekdayFromDateInput = (value: string): number | null => {
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date.getDay();
};

const statusFilterOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending_assignment', label: 'Pending assignment' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'follow_up', label: 'Follow up' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially paid' }
];

const jobStatusOptions = [
  { value: 'follow_up', label: 'Follow up' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'completed', label: 'Complete' }
];
const jobStatusValues = jobStatusOptions.map((option) => option.value);

const paymentStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' }
];
const paymentStatusValues = paymentStatusOptions.map((option) => option.value);

type ActivityEvent = {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  accent?: string;
};

type PaymentStatusValue = 'pending' | 'partial' | 'paid';

const humanize = (value?: string) => {
  if (!value) return '';
  const normalized = value.replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatActorName = (performer: OrderHistoryEntry['performedBy']) => {
  if (!performer) return 'System';
  if (typeof performer === 'string') return performer;
  return performer.name || 'System';
};

type AddressLike = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

const buildAddress = (customer?: AddressLike) => {
  if (!customer) return '';
  return [
    customer.addressLine1,
    customer.addressLine2,
    customer.city,
    customer.state,
    customer.postalCode
  ]
    .filter(Boolean)
    .join(', ');
};

export const OrdersPage = () => {
  const [status, setStatus] = useState('');
  const [assignModal, setAssignModal] = useState<{ order: Order | null; open: boolean }>({ order: null, open: false });
  const [rescheduleModal, setRescheduleModal] = useState<{ order: Order | null; open: boolean }>({ order: null, open: false });
  const [jobCardModal, setJobCardModal] = useState<{ order: Order | null; open: boolean }>({ order: null, open: false });
  const [assigningTech, setAssigningTech] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [scheduleDrawer, setScheduleDrawer] = useState<{ open: boolean; technicianId: string | null; name: string }>(
    {
      open: false,
      technicianId: null,
      name: ''
    }
  );
  const [jobStatusChoice, setJobStatusChoice] = useState('');
  const [paymentStatusChoice, setPaymentStatusChoice] = useState<PaymentStatusValue | ''>('');
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpAttachments, setFollowUpAttachments] = useState<FollowUpAttachment[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<FollowUpAttachment[]>([]);
  const [activityNote, setActivityNote] = useState('');
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const closeAssignModal = () => {
    setAssignModal({ order: null, open: false });
    setScheduleDrawer({ open: false, technicianId: null, name: '' });
  };

  const openSchedulePanel = (technician: TechnicianCandidate) => {
    setScheduleDrawer({
      open: true,
      technicianId: technician.id,
      name: technician.name || 'Technician'
    });
  };

  const handleAssignTechnician = (technicianId: string) => {
    if (!assignModal.order) return;
    assignMutation.mutate({ orderId: assignModal.order._id, technicianId });
  };

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders', status],
    queryFn: () => OrdersAPI.list({ status: status || undefined })
  });

  const { data: candidates = [], isFetching: loadingCandidates } = useQuery<TechnicianCandidate[]>({
    queryKey: ['order-technicians', assignModal.order?._id],
    queryFn: () => OrdersAPI.candidates(assignModal.order!._id),
    enabled: assignModal.open && Boolean(assignModal.order?._id)
  });

  const { data: scheduleEntries = [], isFetching: loadingSchedule } = useQuery<TechnicianScheduleEntry[]>({
    queryKey: ['technician-schedule', scheduleDrawer.technicianId],
    queryFn: () =>
      TechniciansAPI.schedule(scheduleDrawer.technicianId!, {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }),
    enabled: scheduleDrawer.open && Boolean(scheduleDrawer.technicianId)
  });

  const { data: timeSlots = [], isFetching: loadingTimeSlots } = useQuery<TimeSlotTemplate[]>({
    queryKey: ['time-slots'],
    queryFn: () => TimeSlotsAPI.list(),
    enabled: rescheduleModal.open
  });

  const {
    data: jobCardDetail,
    isFetching: loadingJobCard,
    error: jobCardError
  } = useQuery<JobCardDetail>({
    queryKey: ['order-jobcard', jobCardModal.order?._id],
    queryFn: () => OrdersAPI.jobCard(jobCardModal.order!._id),
    enabled: jobCardModal.open && Boolean(jobCardModal.order?._id)
  });

  const jobCard = jobCardDetail?.jobCard ?? null;
  const followUpInfo = jobCardDetail?.order?.followUp || null;
  const spareParts = jobCard?.sparePartsUsed ?? [];
  const sparePartsSubtotal = spareParts.reduce((sum, part) => {
    const quantity = part?.quantity ?? 0;
    const unitPrice = part?.unitPrice ?? (typeof part?.part === 'object' ? part.part?.unitPrice ?? 0 : 0);
    return sum + quantity * unitPrice;
  }, 0);
  const serviceItemInfo = jobCardDetail?.order?.serviceItem;
  const serviceBasePrice = typeof serviceItemInfo === 'string' ? 0 : serviceItemInfo?.basePrice ?? 0;
  const servicePrice = jobCard?.estimateAmount ?? jobCardDetail?.order?.estimatedCost ?? serviceBasePrice;
  useEffect(() => {
    const nextStatus = jobCardDetail?.order?.status;
    if (nextStatus && jobStatusValues.includes(nextStatus)) {
      setJobStatusChoice(nextStatus);
    } else {
      setJobStatusChoice('');
    }
  }, [jobCardDetail?.order?.status]);
  useEffect(() => {
    if (jobCard?.paymentStatus && paymentStatusValues.includes(jobCard.paymentStatus)) {
      setPaymentStatusChoice(jobCard.paymentStatus as PaymentStatusValue);
    } else {
      setPaymentStatusChoice('');
    }
  }, [jobCard?.paymentStatus]);
  useEffect(() => {
    if (!jobCardModal.open) {
      setFollowUpReason('');
      setFollowUpAttachments([]);
      setUploadedDocuments([]);
      setActivityNote('');
      return;
    }
    if (followUpInfo) {
      setFollowUpReason(followUpInfo.reason || '');
      setFollowUpAttachments(followUpInfo.attachments || []);
    } else if (jobStatusChoice !== 'follow_up') {
      setFollowUpReason('');
      setFollowUpAttachments([]);
    }
  }, [
    jobCardModal.open,
    followUpInfo?.reason,
    followUpInfo?.attachments?.length,
    jobStatusChoice
  ]);
  const activityFeed = useMemo<ActivityEvent[]>(() => {
    if (!jobCardDetail) return [];
    const events: ActivityEvent[] = [];
    const { order } = jobCardDetail;

    // if (order?.createdAt) {
    //   events.push({
    //     id: 'order-created',
    //     title: 'Order created',
    //     description: `Request submitted by ${order.customer?.name || 'customer'}`,
    //     timestamp: order.createdAt,
    //     accent: 'bg-slate-900'
    //   });
    // }

    (order?.history || []).forEach((entry, idx) => {
      if (!entry) return;
      events.push({
        id: `history-${idx}`,
        title: humanize(entry.action) || 'Update',
        description: [entry.message, entry.performedBy ? `By ${formatActorName(entry.performedBy)}` : null]
          .filter(Boolean)
          .join(' • '),
        timestamp: entry.performedAt,
        accent: 'bg-blue-100'
      });
    });

    // if (jobCardDetail.jobCard) {
    //   const technicianName =
    //     typeof jobCardDetail.jobCard.technician === 'string'
    //       ? jobCardDetail.jobCard.technician
    //       : jobCardDetail.jobCard.technician?.name;

    //   events.push({
    //     id: 'jobcard-created',
    //     title: 'Job card generated',
    //     description: technicianName ? `Assigned to ${technicianName}` : undefined,
    //     timestamp: jobCardDetail.jobCard.createdAt,
    //     accent: 'bg-emerald-600'
    //   });

    //   events.push({
    //     id: 'jobcard-status',
    //     title: `Job status · ${humanize(jobCardDetail.jobCard.status)}`,
    //     description: jobCardDetail.jobCard.updatedAt ? 'Status updated' : undefined,
    //     timestamp: jobCardDetail.jobCard.updatedAt,
    //     accent: 'bg-emerald-400'
    //   });

    //   (jobCardDetail.jobCard.checkIns || []).forEach((checkIn, idx) => {
    //     events.push({
    //       id: `checkin-${idx}`,
    //       title: idx === 0 ? 'Technician checked in' : 'Progress checkpoint',
    //       description: checkIn.note,
    //       timestamp: checkIn.timestamp,
    //       accent: 'bg-amber-500'
    //     });
    //   });
    // }

    // if (order?.followUp?.reason) {
    //   events.push({
    //     id: 'follow-up-start',
    //     title: 'Moved to follow up',
    //     description: order.followUp.reason,
    //     timestamp: order.followUp.createdAt,
    //     accent: 'bg-rose-500'
    //   });
    //   if (order.followUp.resolvedAt) {
    //     events.push({
    //       id: 'follow-up-resolved',
    //       title: 'Follow up resolved',
    //       description: 'Case moved out of follow up',
    //       timestamp: order.followUp.resolvedAt,
    //       accent: 'bg-emerald-500'
    //     });
    //   }
    // }

    // (jobCardDetail.payments || []).forEach((payment, idx) => {
    //   events.push({
    //     id: `payment-${payment.id || idx}`,
    //     title: `Payment ${humanize(payment.status) || ''}`.trim(),
    //     description: `${formatCurrency(payment.amount)}${payment.method ? ` · ${payment.method}` : ''}`,
    //     timestamp: payment.paidAt || payment.updatedAt || payment.createdAt,
    //     accent: 'bg-indigo-500'
    //   });
    // });

    const toTime = (value?: string) => {
      if (!value) return Number.MAX_SAFE_INTEGER;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
    };

    return events.sort((a, b) => toTime(a.timestamp) - toTime(b.timestamp));
  }, [jobCardDetail]);
  const existingDocuments = jobCardDetail?.order?.media ?? [];
  const hasAnyDocuments = existingDocuments.length > 0 || uploadedDocuments.length > 0;
  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [] as TimeSlotTemplate[];
    const weekday = getWeekdayFromDateInput(selectedDate);
    if (weekday === null) return [] as TimeSlotTemplate[];
    return timeSlots.filter((slot) => slot.dayOfWeek === weekday);
  }, [selectedDate, timeSlots]);
  const selectedTimeSlot = selectedSlotId
    ? slotsForSelectedDay.find((slot) => getSlotIdentifier(slot) === selectedSlotId) || null
    : null;
  const activeRescheduleOrder = rescheduleModal.order;
  const currentSlotLabel = activeRescheduleOrder?.preferredSlot?.label;
  const isFollowUpSelected = jobStatusChoice === 'follow_up';
  const isOrderCompleted = jobCardDetail?.order?.status === 'completed';

  const handleFollowUpFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      event.target.value = '';
      return;
    }
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== 'string') return;
        setFollowUpAttachments((prev) => [
          ...prev,
          {
            url: dataUrl,
            kind: file.type.startsWith('video') ? 'video' : 'image',
            name: file.name
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };

  const handleDocumentUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      event.target.value = '';
      return;
    }
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== 'string') return;
        setUploadedDocuments((prev) => [
          ...prev,
          {
            url: dataUrl,
            kind: file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'document',
            name: file.name
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };

  const handleRemovePendingDocument = (index: number) => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      return;
    }
    setUploadedDocuments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDeleteExistingDocument = (mediaId?: string) => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      return;
    }
    if (!mediaId) {
      toast.error('Unable to delete this file');
      return;
    }
    if (!jobCardModal.order?._id) {
      toast.error('Open an order before deleting documents');
      return;
    }
    setDeletingMediaId(mediaId);
    deleteDocumentMutation.mutate({ orderId: jobCardModal.order._id, mediaId });
  };

  const handleUploadDocument = () => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      return;
    }
    if (!jobCardModal.order?._id) {
      toast.error('Open an order before uploading documents');
      return;
    }
    if (!uploadedDocuments.length) {
      toast.error('Select at least one file to upload');
      return;
    }
    uploadDocumentsMutation.mutate({ orderId: jobCardModal.order._id, media: uploadedDocuments });
  };

  const removeFollowUpAttachment = (index: number) => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      return;
    }
    setFollowUpAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStatusUpdate = () => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      return;
    }
    if (!jobCardModal.order?._id || !jobStatusChoice) return;
    if (isFollowUpSelected) {
      if (!followUpReason.trim()) {
        toast.error('Provide a follow-up reason');
        return;
      }
      if (!followUpAttachments.length) {
        toast.error('Attach at least one image or video');
        return;
      }
    }

    statusMutation.mutate({
      orderId: jobCardModal.order._id,
      status: jobStatusChoice,
      reason: isFollowUpSelected ? followUpReason : undefined,
      attachments: isFollowUpSelected ? followUpAttachments : undefined
    });
  };

  const handlePaymentStatusUpdate = () => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      return;
    }
    if (!jobCardModal.order?._id || !paymentStatusChoice) return;
    if (!jobCard) {
      toast.error('Generate a job card before updating payment status');
      return;
    }
    paymentStatusMutation.mutate({ orderId: jobCardModal.order._id, status: paymentStatusChoice });
  };


  useEffect(() => {
    if (rescheduleModal.open && rescheduleModal.order) {
      const startDate = rescheduleModal.order.timeWindowStart
        ? new Date(rescheduleModal.order.timeWindowStart).toISOString().split('T')[0]
        : '';
      setSelectedDate(startDate);
    } else {
      setSelectedDate('');
      setSelectedSlotId(null);
    }
  }, [rescheduleModal.open, rescheduleModal.order]);

  useEffect(() => {
    if (!rescheduleModal.open) return;
    if (!selectedDate) {
      if (selectedSlotId !== null) setSelectedSlotId(null);
      return;
    }
    if (!slotsForSelectedDay.length) {
      if (selectedSlotId !== null) setSelectedSlotId(null);
      return;
    }
    if (selectedSlotId && slotsForSelectedDay.some((slot) => getSlotIdentifier(slot) === selectedSlotId)) {
      return;
    }
    const preferredLabel = rescheduleModal.order?.preferredSlot?.label;
    if (preferredLabel) {
      const preferredMatch = slotsForSelectedDay.find((slot) => slot.label === preferredLabel);
      if (preferredMatch) {
        const nextSlotId = getSlotIdentifier(preferredMatch);
        if (nextSlotId !== selectedSlotId) setSelectedSlotId(nextSlotId);
        return;
      }
    }
    const fallbackSlotId = getSlotIdentifier(slotsForSelectedDay[0]);
    if (fallbackSlotId !== selectedSlotId) {
      setSelectedSlotId(fallbackSlotId);
    }
  }, [rescheduleModal.open, selectedDate, slotsForSelectedDay, selectedSlotId, rescheduleModal.order]);

  const assignMutation = useMutation({
    mutationFn: ({ orderId, technicianId }: { orderId: string; technicianId: string }) => OrdersAPI.assign(orderId, technicianId),
    onMutate: ({ technicianId }) => setAssigningTech(technicianId),
    onSuccess: () => {
      toast.success('Technician assigned');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      closeAssignModal();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Assignment failed'),
    onSettled: () => setAssigningTech(null)
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ orderId, newStart, newEnd }: { orderId: string; newStart: string; newEnd: string }) =>
      OrdersAPI.reschedule(orderId, { newStart, newEnd }),
    onSuccess: () => {
      toast.success('Order rescheduled');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setRescheduleModal({ order: null, open: false });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Reschedule failed')
  });

  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status: nextStatus,
      reason,
      attachments
    }: {
      orderId: string;
      status: string;
      reason?: string;
      attachments?: FollowUpAttachment[];
    }) => OrdersAPI.changeStatus(orderId, { status: nextStatus, reason, attachments }),
    onSuccess: () => {
      toast.success('Status updated');
      if (jobCardModal.order?._id) {
        queryClient.invalidateQueries({ queryKey: ['order-jobcard', jobCardModal.order._id] });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to update status')
  });

  const uploadDocumentsMutation = useMutation({
    mutationFn: ({ orderId, media }: { orderId: string; media: FollowUpAttachment[] }) =>
      OrdersAPI.uploadMedia(orderId, { media }),
    onSuccess: () => {
      toast.success('Documents uploaded');
      setUploadedDocuments([]);
      if (jobCardModal.order?._id) {
        queryClient.invalidateQueries({ queryKey: ['order-jobcard', jobCardModal.order._id] });
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to upload documents')
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: ({ orderId, mediaId }: { orderId: string; mediaId: string }) => OrdersAPI.deleteMedia(orderId, mediaId),
    onSuccess: () => {
      toast.success('Document removed');
      if (jobCardModal.order?._id) {
        queryClient.invalidateQueries({ queryKey: ['order-jobcard', jobCardModal.order._id] });
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to delete document'),
    onSettled: () => setDeletingMediaId(null)
  });

  const paymentStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: PaymentStatusValue }) =>
      OrdersAPI.updatePaymentStatus(orderId, { status }),
    onSuccess: () => {
      toast.success('Payment status updated');
      if (jobCardModal.order?._id) {
        queryClient.invalidateQueries({ queryKey: ['order-jobcard', jobCardModal.order._id] });
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to update payment status')
  });

  const activityNoteMutation = useMutation({
    mutationFn: ({ orderId, message }: { orderId: string; message: string }) => OrdersAPI.addHistoryNote(orderId, { message }),
    onSuccess: (data, variables) => {
      toast.success('Activity note added');
      setActivityNote('');
      queryClient.setQueryData(['order-jobcard', variables.orderId], data);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to record note')
  });

  const statusActionDisabled =
    !jobCardModal.order?._id ||
    !jobStatusChoice ||
    statusMutation.isPending ||
    (isFollowUpSelected && (!followUpReason.trim() || followUpAttachments.length === 0)) ||
    isOrderCompleted;

  const paymentStatusActionDisabled =
    !jobCardModal.order?._id || !jobCard || !paymentStatusChoice || paymentStatusMutation.isPending || isOrderCompleted;

  const activityNoteActionDisabled =
    !jobCardModal.order?._id || !activityNote.trim() || activityNoteMutation.isPending || isOrderCompleted;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Live Orders</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Admin Assignment Console</h1>
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {statusFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Technician</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Loading orders…
                  </td>
                </tr>
              )}
              {!isLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No orders found for this filter.
                  </td>
                </tr>
              )}
              {orders.map((order) => (
                <tr
                  key={order._id}
                  className="text-sm cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => setJobCardModal({ order, open: true })}
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{order.customer.name}</p>
                    <p className="text-xs text-slate-500">{order.customer.city}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900">{order.serviceItem?.name}</p>
                    <p className="text-xs text-slate-500">{order.serviceCategory?.name}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {formatDateTime(order.timeWindowStart)}
                    <span className="block text-xs text-slate-400">→ {formatDateTime(order.timeWindowEnd)}</span>
                  </td>
                  <td className="px-4 py-4">
                    {order.assignedTechnician ? (
                      <div className="text-sm">
                        <p className="font-semibold text-emerald-600">{order.assignedTechnician.name}</p>
                        <p className="text-xs text-slate-500">Assigned technician</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Not assigned</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={order.status}>{order.status.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setRescheduleModal({ order, open: true });
                        }}
                        className="text-xs"
                      >
                        Reschedule
                      </Button>
                      <Button
                        onClick={(event) => {
                          event.stopPropagation();
                          setAssignModal({ order, open: true });
                        }}
                        className="text-xs"
                      >
                        {order.assignedTechnician ? 'Reassign' : 'Assign'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={assignModal.open} onClose={closeAssignModal} title="Assign Technician">
        <p className="text-sm text-slate-500">
          Technicians shown are certified for{' '}
          <span className="font-semibold text-slate-900">{assignModal.order?.serviceItem?.name}</span> and reflect real-time slot availability.
        </p>
        {assignModal.order?.assignedTechnician && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Currently assigned to <span className="font-semibold">{assignModal.order.assignedTechnician.name}</span>. Select another technician below to reassign.
          </div>
        )}
        {loadingCandidates && (
          <p className="text-sm text-slate-400">Loading technician roster…</p>
        )}
        {!loadingCandidates && candidates.length === 0 && (
          <p className="text-sm text-slate-400">No technicians match this service yet. Add a profile from the Technicians tab.</p>
        )}
        <div className="space-y-3">
          {candidates.map((tech) => {
            const currentTechId = assignModal.order?.assignedTechnician?._id;
            const isCurrent = currentTechId ? currentTechId === tech.id : false;
            return (
              <div
                key={tech.id}
                className={`flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between ${isCurrent ? 'border-amber-200 bg-amber-50/60' : 'border-slate-100'
                  }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-slate-900">{tech.name || 'Unnamed technician'}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tech.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                        }`}
                    >
                      {tech.isAvailable ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4" /> Available
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-4 w-4" /> Busy in slot
                        </>
                      )}
                    </span>
                    {isCurrent && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Current</span>}
                  </div>
                  <p className="text-xs text-slate-500">
                    {(tech.skills?.length ? tech.skills.slice(0, 3).join(', ') : 'Generalist')}
                    {typeof tech.experienceYears === 'number' && ` · ${tech.experienceYears} yrs exp`}
                    {tech.phone && ` · ${tech.phone}`}
                  </p>
                  {tech.workingHours?.start && tech.workingHours?.end && (
                    <p className="text-xs text-slate-400">
                      Preferred hours {tech.workingHours.start} – {tech.workingHours.end}
                    </p>
                  )}
                  {tech.serviceItems?.length ? (
                    <p className="text-xs text-slate-400">
                      Services: {tech.serviceItems.map((item) => item.name).join(', ')}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<CalendarDaysIcon className="h-4 w-4" />}
                    onClick={() => openSchedulePanel(tech)}
                  >
                    Calendar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleAssignTechnician(tech.id)}
                    disabled={!tech.isAvailable || isCurrent || assignMutation.isPending}
                    loading={assignMutation.isPending && assigningTech === tech.id}
                  >
                    {assignModal.order?.assignedTechnician ? 'Reassign' : 'Assign'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={rescheduleModal.open}
        onClose={() => setRescheduleModal({ order: null, open: false })}
        title="Reschedule Order"
      >
        {activeRescheduleOrder && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedDate || !selectedTimeSlot) {
                toast.error('Select a date and a slot to reschedule');
                return;
              }
              const toIsoString = (date: string, time: string) => {
                const normalized = time.length === 5 ? `${time}:00` : time;
                return new Date(`${date}T${normalized}`).toISOString();
              };
              const newStart = toIsoString(selectedDate, selectedTimeSlot.startTime);
              const newEnd = toIsoString(selectedDate, selectedTimeSlot.endTime);
              rescheduleMutation.mutate({ orderId: activeRescheduleOrder._id, newStart, newEnd });
            }}
          >
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Currently scheduled</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatDateTime(activeRescheduleOrder.timeWindowStart)}
                <span className="mx-1 text-slate-400">→</span>
                {formatDateTime(activeRescheduleOrder.timeWindowEnd)}
              </p>
              {currentSlotLabel && <p className="text-xs text-slate-500">Slot: {currentSlotLabel}</p>}
              <p className="mt-3 text-xs text-slate-500">
                Rescheduling keeps the same service and technician assignment rules. Pick a new day & slot below so we can notify the customer and crew.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                type="date"
                label="Target date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(event) => setSelectedDate(event.target.value)}
                required
              />
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                {selectedDate && selectedTimeSlot ? (
                  <>
                    <p className="font-semibold text-slate-900">New slot preview</p>
                    <p>
                      {selectedTimeSlot.label || 'Custom slot'} on {new Date(selectedDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedTimeSlot.startTime} → {selectedTimeSlot.endTime}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-900">Awaiting selection</p>
                    <p className="text-xs text-slate-500">Pick a date and slot to generate a fresh appointment window.</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Available time slots</p>
              {loadingTimeSlots && <p className="mt-2 text-xs text-slate-400">Loading slot templates…</p>}
              {!loadingTimeSlots && timeSlots.length === 0 && (
                <p className="mt-2 text-xs text-rose-500">No time slots configured yet. Create slots in the admin settings.</p>
              )}
              {!loadingTimeSlots && timeSlots.length > 0 && !selectedDate && (
                <p className="mt-2 text-xs text-slate-500">Pick a date first to preview relevant slot templates.</p>
              )}
              {!loadingTimeSlots && timeSlots.length > 0 && selectedDate && slotsForSelectedDay.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  No slot templates cover {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}.
                </p>
              )}
              {!loadingTimeSlots && timeSlots.length > 0 && selectedDate && slotsForSelectedDay.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {slotsForSelectedDay.map((slot) => {
                    const slotId = getSlotIdentifier(slot);
                    const isSelected = slotId === selectedSlotId;
                    const isCurrent = currentSlotLabel && slot.label === currentSlotLabel;
                    return (
                      <button
                        key={slotId}
                        type="button"
                        className={`rounded-2xl border px-4 py-3 text-left transition focus:outline-none ${isSelected ? 'border-slate-900 bg-slate-900/5 shadow-sm' : 'border-slate-200 hover:border-slate-400'
                          }`}
                        onClick={() => setSelectedSlotId(slotId)}
                      >
                        <p className="text-sm font-semibold text-slate-900">{slot.label || `Slot ${slot.dayOfWeek}`}</p>
                        <p className="text-xs text-slate-500">
                          {slot.startTime} → {slot.endTime}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide">
                          {isSelected && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-white">New choice</span>}
                          {isCurrent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Current slot</span>}
                          {typeof slot.capacity === 'number' && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{slot.capacity} jobs</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!selectedDate || !selectedTimeSlot}
              loading={rescheduleMutation.isPending}
            >
              Confirm reschedule
            </Button>
          </form>
        )}
      </Modal>

      <Modal
        open={jobCardModal.open}
        onClose={() => setJobCardModal({ order: null, open: false })}
        title={`Job card · ${jobCardModal.order?.serviceItem?.name ?? ''}`}
        size="xxl"
        showCloseButton
      >
        {loadingJobCard && <p className="text-sm text-slate-400">Preparing printable job summary…</p>}
        {jobCardError && (
          <p className="text-sm text-rose-500">Unable to load job card. Please try again.</p>
        )}
        {jobCardDetail && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Fixzep Job Sheet</p>
                <h3 className="text-2xl font-semibold text-slate-900">{jobCardDetail.order.code || jobCard?.id || 'Job Summary'}</h3>
                <p className="text-sm text-slate-500">
                  Status: <span className="font-semibold text-slate-900">{jobCard?.status ?? 'Not generated yet'}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  icon={<PrinterIcon className="h-4 w-4" />}
                  onClick={() => window.print()}
                  disabled={!jobCard}
                  title={!jobCard ? 'Generate a job card before printing' : undefined}
                >
                  Print
                </Button>
              </div>
            </div>

            {isOrderCompleted && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800">
                Job marked as completed. Chat, uploads, and status changes are locked for audit safety.
              </div>
            )}

            {!jobCard && (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
                No job card has been created for this order yet. Once the technician starts work, their updates will appear here.
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Customer & Property</p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-900">{jobCardDetail.order.customer.name}</h4>
                  <p className="text-sm text-slate-600">{jobCardDetail.order.customer.phone}</p>
                  <p className="text-sm text-slate-600">{jobCardDetail.order.customer.email || 'Email not provided'}</p>
                  <div className="mt-3 text-xs text-slate-500">
                    <p>{buildAddress(jobCardDetail.order.customer) || 'Address not provided'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Documents & Photos</p>
                  <label
                    className={`mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${isOrderCompleted ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400' : 'cursor-pointer border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-400'}`}
                  >
                    <input type="file" className="hidden" multiple onChange={handleDocumentUpload} disabled={isOrderCompleted} />
                    <span className="font-semibold text-slate-900">Drag & drop files</span>
                    <span className="text-xs text-slate-500">or click to browse</span>
                  </label>
                  {hasAnyDocuments ? (
                    <div className="mt-4 space-y-5 text-sm">
                      {existingDocuments.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Stored files</p>
                          <ul className="mt-2 space-y-3">
                            {existingDocuments.map((doc, idx) => (
                              <li
                                key={doc._id ?? `${doc.url}-${idx}`}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white/70 p-3"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-900 truncate">{doc.name || `Document ${idx + 1}`}</p>
                                  <p className="text-xs text-slate-500">{humanize(doc.kind) || 'File'}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="text-xs text-rose-600 hover:text-rose-700"
                                  onClick={() => handleDeleteExistingDocument(doc._id)}
                                  disabled={
                                    isOrderCompleted ||
                                    !doc._id ||
                                    (deleteDocumentMutation.isPending && deletingMediaId !== doc._id)
                                  }
                                  loading={!isOrderCompleted && deleteDocumentMutation.isPending && deletingMediaId === doc._id}
                                >
                                  Delete
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {uploadedDocuments.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Pending upload</p>
                          <ul className="mt-2 space-y-3">
                            {uploadedDocuments.map((doc, idx) => (
                              <li
                                key={`${doc.url}-${idx}`}
                                className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-900 truncate">{doc.name || `Pending file ${idx + 1}`}</p>
                                  <p className="text-xs text-slate-500">{humanize(doc.kind) || 'File'}</p>
                                </div>
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                                  onClick={() => handleRemovePendingDocument(idx)}
                                  disabled={isOrderCompleted}
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                          <Button
                            type="button"
                            onClick={handleUploadDocument}
                            className="mt-4 w-full"
                            disabled={
                              isOrderCompleted || !uploadedDocuments.length || uploadDocumentsMutation.isPending
                            }
                            loading={!isOrderCompleted && uploadDocumentsMutation.isPending}
                          >
                            {`Upload ${uploadedDocuments.length} Document${uploadedDocuments.length > 1 ? 's' : ''}`}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">No documents uploaded yet.</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Service Details</p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-900">
                    {typeof jobCardDetail.order.serviceItem === 'string'
                      ? jobCardDetail.order.serviceItem
                      : jobCardDetail.order.serviceItem?.name}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {typeof jobCardDetail.order.serviceCategory === 'string'
                      ? jobCardDetail.order.serviceCategory
                      : jobCardDetail.order.serviceCategory?.name || 'Category not tagged'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {jobCardDetail.order.serviceItem && typeof jobCardDetail.order.serviceItem !== 'string'
                      ? jobCardDetail.order.serviceItem.description || jobCardDetail.order.issueDescription || 'No description provided.'
                      : jobCardDetail.order.issueDescription || 'No description provided.'}
                  </p>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Service price</p>
                    <p className="text-2xl font-semibold text-slate-900">{formatCurrency(servicePrice)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Additional Services</h4>
                  {jobCard?.extraWork && jobCard.extraWork.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm">
                      {jobCard.extraWork.map((work, idx) => (
                        <li key={`${work.description}-${idx}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <span className="text-slate-600">{work.description}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(work.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No additional services captured yet.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Activity Tracking</h4>
                  {activityFeed.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">No activity recorded yet for this job.</p>
                  ) : (
                    <ol className="mt-4 space-y-4 border-l border-slate-100 pl-4">
                      {activityFeed.map((activity) => (
                        <li key={activity.id} className="relative pl-4">
                          <span className={`absolute -left-2 top-2 block h-3 w-3 rounded-full ${activity.accent || 'bg-slate-300'}`} />
                          <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                          {activity.description && <p className="text-xs text-slate-500">{activity.description}</p>}
                          {activity.timestamp && <p className="text-[11px] text-slate-400">{formatDateTime(activity.timestamp)}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                  <form
                    className="mt-4 space-y-3 rounded-2xl bg-slate-50/80 p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (isOrderCompleted) {
                        toast.error('Completed job cards are view-only');
                        return;
                      }
                      if (!jobCardModal.order?._id) {
                        toast.error('Open an order before logging activity');
                        return;
                      }
                      const note = activityNote.trim();
                      if (!note) return;
                      activityNoteMutation.mutate({ orderId: jobCardModal.order._id, message: note });
                    }}
                  >
                    <TextArea
                      label="Add a quick note"
                      placeholder="Share updates for finance, dispatch, or technicians"
                      value={activityNote}
                      onChange={(event) => setActivityNote(event.target.value)}
                      rows={3}
                      disabled={isOrderCompleted}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] text-slate-500">
                        {isOrderCompleted ? 'Job completed · notes locked.' : 'Notes sync to the order history instantly.'}
                      </p>
                      <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={activityNoteActionDisabled}
                        loading={!isOrderCompleted && activityNoteMutation.isPending}
                      >
                        Send update
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Technician Check-ins</h4>
                  {jobCard?.checkIns && jobCard.checkIns.length > 0 ? (
                    <ol className="mt-4 space-y-3">
                      {jobCard.checkIns.map((checkIn, idx) => (
                        <li key={`${checkIn.timestamp}-${idx}`} className="rounded-xl bg-slate-50 p-3 text-sm">
                          <p className="font-medium text-slate-900">{formatDateTime(checkIn.timestamp)}</p>
                          {checkIn.note && <p className="text-xs text-slate-500">{checkIn.note}</p>}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">{jobCard ? 'No technician check-ins yet.' : 'Technician check-ins will stream in once the job starts.'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-100 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Job & Payment Status</h4>
                  <div className="mt-3 space-y-5">
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Job progress</p>
                      <Select value={jobStatusChoice} onChange={(event) => setJobStatusChoice(event.target.value)} disabled={isOrderCompleted}>
                        <option value="">Select status</option>
                        {jobStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        onClick={handleStatusUpdate}
                        disabled={statusActionDisabled}
                        loading={!isOrderCompleted && statusMutation.isPending}
                      >
                        Update job status
                      </Button>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Badge variant={jobCardDetail.order.status}>{humanize(jobCardDetail.order.status) || 'Status'}</Badge>
                        <span>Last change synced to technicians and finance.</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Payment status</p>
                      {jobCard ? (
                        <div className="mt-3 space-y-3">
                          <Select
                            value={paymentStatusChoice}
                            onChange={(event) => setPaymentStatusChoice(event.target.value as PaymentStatusValue | '')}
                            disabled={isOrderCompleted}
                          >
                            <option value="">Select payment status</option>
                            {paymentStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                          <Button
                            type="button"
                            onClick={handlePaymentStatusUpdate}
                            disabled={paymentStatusActionDisabled}
                            loading={!isOrderCompleted && paymentStatusMutation.isPending}
                          >
                            Update payment status
                          </Button>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <Badge variant={jobCard.paymentStatus ?? 'pending'}>
                              {humanize(jobCard.paymentStatus) || 'Pending'}
                            </Badge>
                            <span>Tracks what finance should collect.</span>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Payment tracking unlocks once a job card is created.</p>
                      )}
                    </div>
                  </div>
                  {isFollowUpSelected && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-dashed border-rose-200 p-4">
                      <TextArea
                        label="Follow up reason"
                        placeholder="Explain why further follow up is required"
                        value={followUpReason}
                        onChange={(event) => setFollowUpReason(event.target.value)}
                        disabled={isOrderCompleted}
                      />
                      <Input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        label="Attach evidence (images/videos)"
                        onChange={handleFollowUpFiles}
                        disabled={isOrderCompleted}
                      />
                      {followUpAttachments.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {followUpAttachments.map((attachment, idx) => (
                            <div key={`${attachment.name || 'attachment'}-${idx}`} className="relative rounded-xl border border-slate-100 p-3">
                              <button
                                type="button"
                                className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-600"
                                onClick={() => removeFollowUpAttachment(idx)}
                                aria-label="Remove attachment"
                                disabled={isOrderCompleted}
                              >
                                ×
                              </button>
                              {attachment.kind === 'video' ? (
                                <video controls className="h-32 w-full rounded-lg object-cover" src={attachment.url} />
                              ) : (
                                <img src={attachment.url} alt={attachment.name || 'Attachment'} className="h-32 w-full rounded-lg object-cover" />
                              )}
                              <p className="mt-2 text-xs text-slate-500 truncate">{attachment.name || `Attachment ${idx + 1}`}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-rose-600">Technician assignment will be cleared when a job enters follow up.</p>
                    </div>
                  )}
                  {jobStatusChoice !== 'follow_up' && followUpInfo?.reason && (
                    <div className="mt-4 rounded-xl border border-dashed border-rose-100 bg-rose-50/60 p-3 text-xs text-rose-800">
                      <p className="font-semibold text-rose-900">Follow up in progress</p>
                      <p className="mt-1 text-rose-800">{followUpInfo.reason}</p>
                      {followUpInfo.attachments?.length ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {followUpInfo.attachments.map((attachment, idx) => (
                            <div key={`existing-${idx}`} className="rounded-xl border border-rose-100 p-2">
                              {attachment.kind === 'video' ? (
                                <video controls className="h-28 w-full rounded-lg object-cover" src={attachment.url} />
                              ) : (
                                <img src={attachment.url} alt={attachment.name || 'Follow up evidence'} className="h-28 w-full rounded-lg object-cover" />
                              )}
                              <p className="mt-1 text-[11px] text-rose-700 truncate">{attachment.name || `Attachment ${idx + 1}`}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-500">Syncs both job card and order status for finance follow-ups.</p>
                </div>

                <div className="rounded-2xl border border-slate-900/10 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Schedule</p>
                  <p className="mt-2 text-lg font-semibold">{jobCardDetail.order.preferredSlot?.label || 'Scheduled slot'}</p>
                  <p className="mt-1 text-sm text-white/80">
                    {jobCardDetail.order.timeWindowStart ? formatDateTime(jobCardDetail.order.timeWindowStart) : '—'}
                    <span className="mx-1 text-white/50">→</span>
                    {jobCardDetail.order.timeWindowEnd ? formatDateTime(jobCardDetail.order.timeWindowEnd) : '—'}
                  </p>
                  {jobCard?.technician && (
                    <p className="mt-2 text-xs text-white/70">
                      Technician:{' '}
                      {typeof jobCard.technician === 'string'
                        ? jobCard.technician
                        : jobCard.technician.name}{' '}
                      {typeof jobCard.technician !== 'string' ? `· ${jobCard.technician.mobile ?? ''}` : ''}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Spare Parts / Cost Summary</h4>
                  {spareParts.length > 0 ? (
                    <>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Item</th>
                              <th className="px-3 py-2">Qty</th>
                              <th className="px-3 py-2">Unit price</th>
                              <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {spareParts.map((part, idx) => {
                              const partName =
                                typeof part.part === 'string'
                                  ? part.part
                                  : part.part?.name || part.part?.sku || 'Part';
                              const unitPrice = part?.unitPrice ?? (typeof part?.part === 'object' ? part.part?.unitPrice ?? 0 : 0);
                              const total = (part.quantity ?? 0) * unitPrice;
                              return (
                                <tr key={`${partName}-${idx}`}>
                                  <td className="px-3 py-2 text-slate-700">{partName}</td>
                                  <td className="px-3 py-2 text-slate-500">{part.quantity ?? 0}</td>
                                  <td className="px-3 py-2 text-slate-500">{formatCurrency(unitPrice)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrency(total)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Parts subtotal</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(sparePartsSubtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Additional charges</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(jobCard?.additionalCharges ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Service estimate</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(jobCard?.estimateAmount ?? servicePrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                          <span>Total payable</span>
                          <span>{jobCard ? formatCurrency(jobCard.finalAmount) : formatCurrency(servicePrice + sparePartsSubtotal)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No spare parts logged for this job.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Drawer
        open={scheduleDrawer.open}
        onClose={() => setScheduleDrawer({ open: false, technicianId: null, name: '' })}
        title={`Schedule · ${scheduleDrawer.name || ''}`}
      >
        <p className="text-sm text-slate-500">Upcoming commitments for the next 7 days.</p>
        {loadingSchedule && <p className="mt-4 text-sm text-slate-400">Loading schedule…</p>}
        {!loadingSchedule && scheduleEntries.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">No blocks in this window. Technician is fully available.</p>
        )}
        <ol className="mt-4 space-y-3">
          {scheduleEntries.map((entry) => {
            const serviceLabel =
              typeof entry.order?.serviceItem === 'string'
                ? entry.order?.serviceItem
                : entry.order?.serviceItem?.name;
            return (
              <li key={entry.id} className="rounded-2xl border border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {formatDateTime(entry.start)} <span className="text-slate-400">→</span> {formatDateTime(entry.end)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {serviceLabel || 'Blocked slot'}
                  {entry.order?.customer?.name ? ` · ${entry.order.customer.name}` : ''}
                </p>
                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-600">
                  {entry.status}
                </span>
              </li>
            );
          })}
        </ol>
      </Drawer>
    </div>
  );
};
