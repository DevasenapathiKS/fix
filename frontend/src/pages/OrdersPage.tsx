import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrdersAPI, TechniciansAPI, TimeSlotsAPI, CustomersAPI, CatalogAPI, SparePartsAPI } from '../services/adminApi';
import type {
  JobCardDetail,
  Order,
  TechnicianCandidate,
  TechnicianScheduleEntry,
  TimeSlotTemplate,
  OrderHistoryEntry,
  FollowUpAttachment,
  CustomerSummary,
  ServiceCategory,
  ServiceItem,
  SparePart
} from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { CalendarDaysIcon, CheckCircleIcon, PrinterIcon, TrashIcon, XCircleIcon, XMarkIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
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
  { value: 'cancellation_requested', label: 'Cancellation requested' },
  { value: 'follow_up', label: 'Follow up' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially paid' }
];

const jobStatusOptions = [
  { value: 'follow_up', label: 'Follow up' },
  { value: 'inProgrss', label: 'inProgress' },
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

// Calendar helper functions
const getCalendarDays = (startDate: Date, numDays = 7): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  return days;
};

const formatDateShort = (date: Date) => {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const isSlotBlocked = (
  date: Date,
  slotStart: string,
  slotEnd: string,
  scheduleEntries: TechnicianScheduleEntry[]
): TechnicianScheduleEntry | null => {
  const [startHour, startMin] = slotStart.split(':').map(Number);
  const [endHour, endMin] = slotEnd.split(':').map(Number);

  const slotStartTime = new Date(date);
  slotStartTime.setHours(startHour, startMin, 0, 0);

  const slotEndTime = new Date(date);
  slotEndTime.setHours(endHour, endMin, 0, 0);

  // Check if any schedule entry overlaps with this slot
  for (const entry of scheduleEntries) {
    const entryStart = new Date(entry.start);
    const entryEnd = new Date(entry.end);

    // Overlap check: entry.start < slotEnd AND entry.end > slotStart
    if (entryStart < slotEndTime && entryEnd > slotStartTime) {
      return entry;
    }
  }
  return null;
};

const buildSlotDateTime = (date: Date, time: string): Date => {
  const [hour, min] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hour, min, 0, 0);
  return result;
};

export const OrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(() => searchParams.get('status') || '');
  const [createOrderModal, setCreateOrderModal] = useState(false);
  const [assignModal, setAssignModal] = useState<{ order: Order | null; open: boolean }>({ order: null, open: false });
  const [rescheduleModal, setRescheduleModal] = useState<{ order: Order | null; open: boolean }>({ order: null, open: false });
  const [jobCardModal, setJobCardModal] = useState<{ order: Order | null; open: boolean }>({ order: null, open: false });
  const [pendingSelectedOrderId, setPendingSelectedOrderId] = useState<string | null>(() => searchParams.get('selected'));
  const [imageViewer, setImageViewer] = useState<{ open: boolean; url: string; name: string }>({ open: false, url: '', name: '' });
  const [imageZoom, setImageZoom] = useState(100);
  const [assigningTech, setAssigningTech] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  
  // Create order form state
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerData, setCustomerData] = useState<CustomerSummary | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderStartTime, setOrderStartTime] = useState('09:00');
  const [orderEndTime, setOrderEndTime] = useState('11:00');
  const [issueDescription, setIssueDescription] = useState('');
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [scheduleDrawer, setScheduleDrawer] = useState<{ open: boolean; technicianId: string | null; name: string }>({
      open: false,
      technicianId: null,
      name: ''
  });
  const [calendarStartDate, setCalendarStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedCalendarSlot, setSelectedCalendarSlot] = useState<{
    date: Date;
    startTime: string;
    endTime: string;
    label: string;
  } | null>(null);
  const [jobStatusChoice, setJobStatusChoice] = useState('');
  const [paymentStatusChoice, setPaymentStatusChoice] = useState<PaymentStatusValue | ''>('');
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpAttachments, setFollowUpAttachments] = useState<FollowUpAttachment[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<FollowUpAttachment[]>([]);
  const [activityNote, setActivityNote] = useState('');
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  
  // Spare parts form state
  const [showAddSparePart, setShowAddSparePart] = useState(false);
  const [selectedSparePartId, setSelectedSparePartId] = useState('');
  const [sparePartQuantity, setSparePartQuantity] = useState('');
  
  // Additional service form state
  const [showAddService, setShowAddService] = useState(false);
  const [selectedAdditionalServiceId, setSelectedAdditionalServiceId] = useState('');
  
  // Edit customer address state
  const [editingAddress, setEditingAddress] = useState(false);
  const [selectedEditAddressId, setSelectedEditAddressId] = useState('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [editAddressLine1, setEditAddressLine1] = useState('');
  const [editAddressLine2, setEditAddressLine2] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [additionalServiceQuantity, setAdditionalServiceQuantity] = useState('1');
  
  const queryClient = useQueryClient();

  const closeAssignModal = () => {
    setAssignModal({ order: null, open: false });
    setScheduleDrawer({ open: false, technicianId: null, name: '' });
    setSelectedCalendarSlot(null);
  };

  const openSchedulePanel = (technician: TechnicianCandidate) => {
    setSelectedCalendarSlot(null); // Clear any previously selected slot
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

  // Handle URL query params for deep linking from dashboard
  useEffect(() => {
    if (pendingSelectedOrderId && orders.length > 0 && !isLoading) {
      const order = orders.find((o) => o._id === pendingSelectedOrderId);
      if (order) {
        setJobCardModal({ order, open: true });
      }
      // Clear the pending selection after attempting to open
      setPendingSelectedOrderId(null);
      // Remove 'selected' from URL without triggering navigation
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('selected');
      setSearchParams(newParams, { replace: true });
    }
  }, [orders, pendingSelectedOrderId, isLoading, searchParams, setSearchParams]);

  // Sync status filter to URL
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    const newParams = new URLSearchParams(searchParams);
    if (newStatus) {
      newParams.set('status', newStatus);
    } else {
      newParams.delete('status');
    }
    newParams.delete('selected'); // Clear selection when changing filter
    setSearchParams(newParams, { replace: true });
  };

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['categories'],
    queryFn: CatalogAPI.categories,
    enabled: createOrderModal
  });

  const { data: serviceItems = [] } = useQuery<ServiceItem[]>({
    queryKey: ['service-items', selectedCategory],
    queryFn: () => CatalogAPI.serviceItems(selectedCategory || undefined),
    enabled: createOrderModal && Boolean(selectedCategory)
  });

  const { data: allSpareparts = [] } = useQuery<SparePart[]>({
    queryKey: ['spare-parts'],
    queryFn: SparePartsAPI.list,
    enabled: jobCardModal.open
  });

  const { data: allServiceItems = [] } = useQuery<ServiceItem[]>({
    queryKey: ['all-service-items'],
    queryFn: () => CatalogAPI.serviceItems(),
    enabled: jobCardModal.open
  });

  const { data: candidates = [], isFetching: loadingCandidates } = useQuery<TechnicianCandidate[]>({
    queryKey: ['order-technicians', assignModal.order?._id],
    queryFn: () => OrdersAPI.candidates(assignModal.order!._id),
    enabled: assignModal.open && Boolean(assignModal.order?._id)
  });

  const { data: scheduleEntries = [], isFetching: loadingSchedule } = useQuery<TechnicianScheduleEntry[]>({
    queryKey: ['technician-schedule', scheduleDrawer.technicianId, calendarStartDate.toISOString()],
    queryFn: () => {
      // Calculate the end date (7 days from calendarStartDate)
      const endDate = new Date(calendarStartDate);
      endDate.setDate(endDate.getDate() + 7);
      
      return TechniciansAPI.schedule(scheduleDrawer.technicianId!, {
        start: calendarStartDate.toISOString(),
        end: endDate.toISOString()
      });
    },
    enabled: scheduleDrawer.open && Boolean(scheduleDrawer.technicianId)
  });

  const { data: timeSlots = [], isFetching: loadingTimeSlots } = useQuery<TimeSlotTemplate[]>({
    queryKey: ['time-slots'],
    queryFn: () => TimeSlotsAPI.list(),
    enabled: rescheduleModal.open || scheduleDrawer.open
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
  const extraWorks = jobCard?.extraWork ?? [];
  const extraWorksSubtotal = extraWorks.reduce((sum, work) => sum + (work?.amount ?? 0), 0);
  useEffect(() => {
    console.log('Job Card Detail:', jobCardDetail);
    console.log('Job Card:', jobCard);
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
      
      // Determine accent color based on action type
      let accent = 'bg-blue-100';
      let title = humanize(entry.action) || 'Update';
      
      switch (entry.action) {
        case 'technician_checked_in':
          accent = 'bg-emerald-500';
          title = 'Technician Checked In';
          break;
        case 'technician_checked_out':
          accent = 'bg-rose-500';
          title = 'Technician Checked Out';
          break;
        case 'technician_progress_update':
          accent = 'bg-amber-500';
          title = 'Progress Update';
          break;
        case 'technician_follow_up':
          accent = 'bg-orange-500';
          title = 'Follow Up Required';
          break;
        case 'technician_assigned':
          accent = 'bg-indigo-500';
          title = 'Technician Assigned';
          break;
        case 'order_rescheduled':
          accent = 'bg-purple-500';
          title = 'Order Rescheduled';
          break;
        case 'order_created':
          accent = 'bg-slate-900';
          title = 'Order Created';
          break;
        default:
          accent = 'bg-blue-100';
      }
      
      events.push({
        id: `history-${idx}`,
        title,
        description: [entry.message, entry.performedBy ? `By ${formatActorName(entry.performedBy)}` : null]
          .filter(Boolean)
          .join(' • '),
        timestamp: entry.performedAt,
        accent
      });
    });

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

  const handleAddSparePart = () => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      return;
    }
    if (!jobCardModal.order?._id) {
      toast.error('Open an order before adding spare parts');
      return;
    }
    if (!selectedSparePartId || !sparePartQuantity) {
      toast.error('Please select a spare part and enter quantity');
      return;
    }
    const quantity = parseFloat(sparePartQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }
    const selectedPart = allSpareparts.find(p => p._id === selectedSparePartId);
    if (!selectedPart) {
      toast.error('Selected spare part not found');
      return;
    }
    addSparePartMutation.mutate({
      orderId: jobCardModal.order._id,
      sparePart: { sparePartId: selectedSparePartId, quantity, unitPrice: selectedPart.unitPrice }
    });
  };

  const handleAddAdditionalService = () => {
    if (isOrderCompleted) {
      toast.error('Completed job cards are view-only');
      return;
    }
    if (!jobCardModal.order?._id) {
      toast.error('Open an order before adding services');
      return;
    }
    if (!selectedAdditionalServiceId || !additionalServiceQuantity) {
      toast.error('Please select a service and enter quantity');
      return;
    }
    const quantity = parseFloat(additionalServiceQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity must be a positive number');
      return;
    }
    const selectedService = allServiceItems.find(s => s._id === selectedAdditionalServiceId);
    if (!selectedService) {
      toast.error('Selected service not found');
      return;
    }
    const totalAmount = (selectedService.basePrice || 0) * quantity;
    addAdditionalServiceMutation.mutate({
      orderId: jobCardModal.order._id,
      service: { 
        description: `${selectedService.name} (x${quantity})`, 
        amount: totalAmount,
        serviceItemId: selectedAdditionalServiceId
      }
    });
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

  // Assign technician with schedule update (reschedule + assign in sequence)
  const assignWithSlotMutation = useMutation({
    mutationFn: async ({ orderId, technicianId, newStart, newEnd }: { orderId: string; technicianId: string; newStart: string; newEnd: string }) => {
      // First reschedule the order to the new time slot
      await OrdersAPI.reschedule(orderId, { newStart, newEnd });
      // Then assign the technician
      return OrdersAPI.assign(orderId, technicianId);
    },
    onSuccess: () => {
      toast.success('Order rescheduled and technician assigned!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['technician-schedule'] });
      closeAssignModal();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to assign with new slot')
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

  const addSparePartMutation = useMutation({
    mutationFn: ({ orderId, sparePart }: { orderId: string; sparePart: { sparePartId: string; quantity: number; unitPrice: number } }) =>
      OrdersAPI.addSparePart(orderId, sparePart),
    onSuccess: (_data, variables) => {
      toast.success('Spare part added');
      setSelectedSparePartId('');
      setSparePartQuantity('');
      setShowAddSparePart(false);
      queryClient.invalidateQueries({ queryKey: ['order-jobcard', variables.orderId] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to add spare part')
  });

  const addAdditionalServiceMutation = useMutation({
    mutationFn: ({ orderId, service }: { orderId: string; service: { description: string; amount: number; serviceItemId?: string } }) =>
      OrdersAPI.addAdditionalService(orderId, service),
    onSuccess: (_data, variables) => {
      toast.success('Additional service added');
      setSelectedAdditionalServiceId('');
      setAdditionalServiceQuantity('1');
      setShowAddService(false);
      queryClient.invalidateQueries({ queryKey: ['order-jobcard', variables.orderId] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to add service')
  });

  const removeSparePartMutation = useMutation({
    mutationFn: ({ orderId, index }: { orderId: string; index: number }) =>
      OrdersAPI.removeSparePart(orderId, index),
    onSuccess: (_data, variables) => {
      toast.success('Spare part removed');
      queryClient.invalidateQueries({ queryKey: ['order-jobcard', variables.orderId] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to remove spare part')
  });

  const removeAdditionalServiceMutation = useMutation({
    mutationFn: ({ orderId, index }: { orderId: string; index: number }) =>
      OrdersAPI.removeAdditionalService(orderId, index),
    onSuccess: (_data, variables) => {
      toast.success('Additional service removed');
      queryClient.invalidateQueries({ queryKey: ['order-jobcard', variables.orderId] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to remove service')
  });

  const updateCustomerAddressMutation = useMutation({
    mutationFn: ({ customerId, addressId, address }: { customerId: string; addressId?: string; address: { line1: string; line2?: string; city: string; state: string; postalCode?: string } }) =>
      CustomersAPI.updateAddress(customerId, { ...address, addressId }),
    onSuccess: (_data, variables) => {
      toast.success(variables.addressId ? 'Order address updated' : 'New address added successfully');
      setEditingAddress(false);
      setIsAddingNewAddress(false);
      setSelectedEditAddressId('');
      if (jobCardModal.order?._id) {
        queryClient.invalidateQueries({ queryKey: ['order-jobcard', jobCardModal.order._id] });
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Unable to update address')
  });

  const checkCustomerMutation = useMutation({
    mutationFn: (phone: string) => CustomersAPI.findByPhone(phone),
    onSuccess: (data) => {
      if (data) {
        setCustomerData(data);
        setCustomerName(data.name || '');
        setCustomerEmail(data.email || '');
        
        // Set default address or first address
        const defaultAddr = data.addresses?.find(a => a.isDefault) || data.addresses?.[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setAddressLine1(defaultAddr.line1 || '');
          setAddressLine2(defaultAddr.line2 || '');
          setCity(defaultAddr.city || '');
          setState(defaultAddr.state || '');
          setPostalCode(defaultAddr.postalCode || '');
        } else {
          setAddressLine1(data.addressLine1 || '');
          setAddressLine2(data.addressLine2 || '');
          setCity(data.city || '');
          setState('');
          setPostalCode(data.postalCode || '');
        }
        
        toast.success('Customer found!');
      } else {
        setCustomerData(null);
        setSelectedAddressId('');
        setCustomerName('');
        setCustomerEmail('');
        setAddressLine1('');
        setAddressLine2('');
        setCity('');
        setState('');
        setPostalCode('');
        toast('Customer not found. Please enter details to create new customer.', { icon: 'ℹ️' });
      }
      setCheckingCustomer(false);
    },
    onError: () => {
      toast.error('Failed to check customer');
      setCheckingCustomer(false);
    }
  });

  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Create new customer if doesn't exist
      if (!customerData) {
        const newCustomer = await CustomersAPI.create({
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          address: { line1: addressLine1, line2: addressLine2, city, state, postalCode }
        });
        // For new customers, address is created automatically
        // Don't pass addressId, it will be handled by backend
        return OrdersAPI.create({ ...payload, customerId: newCustomer.id });
      }

      // For existing customers, payload already has addressId or address
      return OrdersAPI.create(payload);
    },
    onSuccess: () => {
      toast.success('Order created successfully!');
      setCreateOrderModal(false);
      resetCreateOrderForm();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create order')
  });

  const resetCreateOrderForm = () => {
    setCustomerPhone('');
    setCustomerData(null);
    setSelectedAddressId('');
    setCustomerName('');
    setCustomerEmail('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPostalCode('');
    setSelectedCategory('');
    setSelectedService('');
    setOrderDate('');
    setOrderStartTime('09:00');
    setOrderEndTime('11:00');
    setIssueDescription('');
  };

  const handleAddressChange = (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = customerData?.addresses?.find(a => a.id === addressId);
    if (address) {
      setAddressLine1(address.line1 || '');
      setAddressLine2(address.line2 || '');
      setCity(address.city || '');
      setState(address.state || '');
      setPostalCode(address.postalCode || '');
    }
  };
  

  const handleCheckCustomer = () => {
    if (!customerPhone.trim()) {
      toast.error('Please enter phone number');
      return;
    }
    setCheckingCustomer(true);
    checkCustomerMutation.mutate(customerPhone);
  };

  const handleCreateOrder = () => {
    if (!customerPhone || !customerName || !selectedService || !orderDate) {
      toast.error('Please fill all required fields');
      return;
    }
    
    // Validate address - either selected or manually filled
    const hasSelectedAddress = selectedAddressId;
    const hasManualAddress = addressLine1 && city && state;
    
    if (!hasSelectedAddress && !hasManualAddress) {
      toast.error('Please select an address or fill in address details');
      return;
    }
    
    const scheduledDate = new Date(`${orderDate}T${orderStartTime}`);
    const endDate = new Date(`${orderDate}T${orderEndTime}`);
    
    const orderPayload: any = {
      customerId: customerData?.id,
      serviceItem: selectedService,
      scheduledAt: scheduledDate.toISOString(),
      timeWindowStart: scheduledDate.toISOString(),
      timeWindowEnd: endDate.toISOString(),
      issueDescription,
      slotLabel: `${orderStartTime} - ${orderEndTime}`
    };
    
    // Add address ID if selected, otherwise send address data to create new one
    if (selectedAddressId) {
      orderPayload.addressId = selectedAddressId;
    } else if (hasManualAddress) {
      orderPayload.address = {
        line1: addressLine1,
        line2: addressLine2,
        city,
        state,
        postalCode
      };
    }
    
    createOrderMutation.mutate(orderPayload);
  };

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
        <div className="flex gap-3">
          <Button onClick={() => setCreateOrderModal(true)}>+ Create Order</Button>
          <Select value={status} onChange={(e) => handleStatusChange(e.target.value)}>
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
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
                    {order.status === 'completed' ? (
                      <span className="text-xs text-slate-400">Completed</span>
                    ) : order.status === 'cancellation_requested' ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            const reason = window.prompt('Optional: Add a note for approving cancellation') || undefined;
                            statusMutation.mutate({ orderId: order._id, status: 'cancelled', reason: reason?.trim() || undefined });
                          }}
                          className="text-xs"
                        >
                          Approve Cancel
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            const reason = window.prompt('Optional: Add a note for rejecting cancellation') || undefined;
                            const fallbackStatus = order.assignedTechnician ? 'assigned' : 'pending_assignment';
                            statusMutation.mutate({ orderId: order._id, status: fallbackStatus, reason: reason?.trim() || undefined });
                          }}
                          className="text-xs"
                        >
                          Reject Cancel
                        </Button>
                      </div>
                    ) : (
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={assignModal.open} onClose={() => { if (!scheduleDrawer.open) closeAssignModal(); }} title="Assign Technician">
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
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Customer & Property</p>
                    {!isOrderCompleted && !editingAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddress(true);
                          setIsAddingNewAddress(false);
                          setSelectedEditAddressId('');
                          setEditAddressLine1('');
                          setEditAddressLine2('');
                          setEditCity('');
                          setEditState('');
                          setEditPostalCode('');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Change Address
                      </button>
                    )}
                  </div>
                  <h4 className="mt-2 text-lg font-semibold text-slate-900">{jobCardDetail.order.customer.name}</h4>
                  <p className="text-sm text-slate-600">{jobCardDetail.order.customer.phone}</p>
                  <p className="text-sm text-slate-600">{jobCardDetail.order.customer.email || 'Email not provided'}</p>
                  
                  {editingAddress ? (
                    <div className="mt-3 space-y-3">
                      {customerData?.addresses && customerData?.addresses?.length > 0 && !isAddingNewAddress ? (
                        <>
                          <Select
                            label="Select Address"
                            value={selectedEditAddressId}
                            onChange={(e) => {
                              const addressId = e.target.value;
                              setSelectedEditAddressId(addressId);
                              const address = customerData.addresses?.find(a => a.id === addressId);
                              if (address) {
                                setEditAddressLine1(address.line1 || '');
                                setEditAddressLine2(address.line2 || '');
                                setEditCity(address.city || '');
                                setEditState(address.state || '');
                                setEditPostalCode(address.postalCode || '');
                              }
                            }}
                          >
                            <option value="">Choose an existing address</option>
                            {customerData.addresses.map((addr) => (
                              <option key={addr.id} value={addr.id}>
                                {addr.label || 'Address'} - {addr.line1}, {addr.city} {addr.isDefault ? '(Default)' : ''}
                              </option>
                            ))}
                          </Select>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewAddress(true);
                              setSelectedEditAddressId('');
                              setEditAddressLine1('');
                              setEditAddressLine2('');
                              setEditCity('');
                              setEditState('');
                              setEditPostalCode('');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            + Add New Address
                          </button>
                        </>
                      ) : null}
                      
                      {(isAddingNewAddress || !customerData?.addresses?.length || selectedEditAddressId) && (
                        <>
                          {isAddingNewAddress && customerData?.addresses && customerData.addresses.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingNewAddress(false);
                                setEditAddressLine1('');
                                setEditAddressLine2('');
                                setEditCity('');
                                setEditState('');
                                setEditPostalCode('');
                              }}
                              className="text-xs text-slate-600 hover:text-slate-700"
                            >
                              ← Back to address list
                            </button>
                          )}
                          <Input
                            label="Address Line 1 *"
                            value={editAddressLine1}
                            onChange={(e) => setEditAddressLine1(e.target.value)}
                            placeholder="Street address"
                          />
                          <Input
                            label="Address Line 2"
                            value={editAddressLine2}
                            onChange={(e) => setEditAddressLine2(e.target.value)}
                            placeholder="Apartment, suite, etc."
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              label="City *"
                              value={editCity}
                              onChange={(e) => setEditCity(e.target.value)}
                              placeholder="City"
                            />
                            <Input
                              label="State *"
                              value={editState}
                              onChange={(e) => setEditState(e.target.value)}
                              placeholder="State"
                            />
                          </div>
                          <Input
                            label="Postal Code"
                            value={editPostalCode}
                            onChange={(e) => setEditPostalCode(e.target.value)}
                            placeholder="PIN Code"
                          />
                        </>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            if (!selectedEditAddressId && !isAddingNewAddress && customerData?.addresses?.length) {
                              toast.error('Please select an address or add a new one');
                              return;
                            }
                            if (!editAddressLine1.trim() || !editCity.trim() || !editState.trim()) {
                              toast.error('Please fill required address fields');
                              return;
                            }
                            const customerId = typeof jobCardDetail.order.customer === 'string' 
                              ? jobCardDetail.order.customer 
                              : jobCardDetail.order.customer._id || jobCardDetail.order.customer._id;
                            
                            if (!customerId) {
                              toast.error('Customer ID not found');
                              return;
                            }
                            
                            updateCustomerAddressMutation.mutate({
                              customerId,
                              addressId: selectedEditAddressId || undefined,
                              address: {
                                line1: editAddressLine1,
                                line2: editAddressLine2,
                                city: editCity,
                                state: editState,
                                postalCode: editPostalCode
                              }
                            });
                          }}
                          loading={updateCustomerAddressMutation.isPending}
                          disabled={updateCustomerAddressMutation.isPending}
                          className="flex-1"
                        >
                          {isAddingNewAddress ? 'Add Address' : selectedEditAddressId ? 'Update Order Address' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setEditingAddress(false);
                            setIsAddingNewAddress(false);
                            setSelectedEditAddressId('');
                          }}
                          disabled={updateCustomerAddressMutation.isPending}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-500">
                      <p>{buildAddress(jobCardDetail.order.customer) || 'Address not provided'}</p>
                    </div>
                  )}
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
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            {existingDocuments.map((doc, idx) => (
                              <div
                                key={doc._id ?? `${doc.url}-${idx}`}
                                className="relative rounded-xl border border-slate-100 bg-white/70 overflow-hidden group"
                              >
                                {doc.kind === 'image' ? (
                                  <div 
                                    className="aspect-square cursor-pointer"
                                    onClick={() => setImageViewer({ open: true, url: doc.url, name: doc.name || `Image ${idx + 1}` })}
                                  >
                                    <img
                                      src={doc.url}
                                      alt={doc.name || `Image ${idx + 1}`}
                                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                    />
                                  </div>
                                ) : doc.kind === 'video' ? (
                                  <div className="aspect-square bg-slate-900">
                                    <video
                                      src={doc.url}
                                      className="w-full h-full object-cover"
                                      controls
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-square flex flex-col items-center justify-center bg-slate-50 p-3">
                                    <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-2 text-xs text-slate-600 text-center truncate w-full px-2">{doc.name || 'Document'}</p>
                                  </div>
                                )}
                                {!isOrderCompleted && (
                                  <button
                                    type="button"
                                    className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteExistingDocument(doc._id);
                                    }}
                                    disabled={
                                      !doc._id ||
                                      (deleteDocumentMutation.isPending && deletingMediaId !== doc._id)
                                    }
                                    title="Delete"
                                  >
                                    {deleteDocumentMutation.isPending && deletingMediaId === doc._id ? (
                                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <XMarkIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {uploadedDocuments.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">Pending upload</p>
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            {uploadedDocuments.map((doc, idx) => (
                              <div
                                key={`${doc.url}-${idx}`}
                                className="relative rounded-xl border border-dashed border-slate-200 bg-slate-50 overflow-hidden group"
                              >
                                {doc.kind === 'image' ? (
                                  <div 
                                    className="aspect-square cursor-pointer"
                                    onClick={() => setImageViewer({ open: true, url: doc.url, name: doc.name || `Image ${idx + 1}` })}
                                  >
                                    <img
                                      src={doc.url}
                                      alt={doc.name || `Image ${idx + 1}`}
                                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                    />
                                  </div>
                                ) : doc.kind === 'video' ? (
                                  <div className="aspect-square bg-slate-900">
                                    <video
                                      src={doc.url}
                                      className="w-full h-full object-cover"
                                      controls
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-square flex flex-col items-center justify-center bg-slate-50 p-3">
                                    <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="mt-2 text-xs text-slate-600 text-center truncate w-full px-2">{doc.name || 'Document'}</p>
                                  </div>
                                )}
                                {!isOrderCompleted && (
                                  <button
                                    type="button"
                                    className="absolute top-2 right-2 p-1 rounded-full bg-slate-700 hover:bg-slate-800 text-white shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemovePendingDocument(idx);
                                    }}
                                    disabled={isOrderCompleted}
                                    title="Remove"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
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
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Additional Services</h4>
                    {!isOrderCompleted && (
                      <Button
                        variant="secondary"
                        onClick={() => setShowAddService(!showAddService)}
                        className="text-xs"
                      >
                        {showAddService ? 'Cancel' : '+ Add Service'}
                      </Button>
                    )}
                  </div>
                  
                  {showAddService && (
                    <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <Select
                        label="Select Service *"
                        value={selectedAdditionalServiceId}
                        onChange={(e) => setSelectedAdditionalServiceId(e.target.value)}
                      >
                        <option value="">Choose a service...</option>
                        {allServiceItems.map((service) => (
                          <option key={service._id} value={service._id}>
                            {service.name} - {formatCurrency(service.basePrice || 0)}
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="Quantity"
                        type="number"
                        placeholder="1"
                        value={additionalServiceQuantity}
                        onChange={(e) => setAdditionalServiceQuantity(e.target.value)}
                        min="1"
                        step="1"
                      />
                      {selectedAdditionalServiceId && (
                        <div className="rounded-lg bg-slate-100 p-2 text-xs text-slate-600">
                          <span className="font-semibold">Total: </span>
                          {formatCurrency(
                            (allServiceItems.find(s => s._id === selectedAdditionalServiceId)?.basePrice || 0) * 
                            parseFloat(additionalServiceQuantity || '1')
                          )}
                        </div>
                      )}
                      <Button
                        onClick={handleAddAdditionalService}
                        loading={addAdditionalServiceMutation.isPending}
                        className="w-full"
                      >
                        Add Service
                      </Button>
                    </div>
                  )}
                  
                  {jobCard?.extraWork && jobCard.extraWork.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm">
                      {jobCard.extraWork.map((work, idx) => (
                        <li key={`${work.description}-${idx}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <span className="text-slate-600">{work.description}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{formatCurrency(work.amount)}</span>
                            {!isOrderCompleted && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (jobCardModal.order?._id) {
                                    removeAdditionalServiceMutation.mutate({ orderId: jobCardModal.order._id, index: idx });
                                  }
                                }}
                                className="text-rose-500 hover:text-rose-700 transition-colors"
                                disabled={removeAdditionalServiceMutation.isPending}
                                title="Remove service"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : !showAddService ? (
                    <p className="mt-2 text-xs text-slate-500">No additional services captured yet.</p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Activity Tracking</h4>
                    {activityFeed.length > 0 && (
                      <span className="text-xs text-slate-400">{activityFeed.length} entries</span>
                    )}
                  </div>
                  {activityFeed.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">No activity recorded yet for this job.</p>
                  ) : (
                    <ol className="mt-4 space-y-4 border-l border-slate-100 pl-4 max-h-64 overflow-y-auto pr-2">
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
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Attach evidence (images/videos)
                        </label>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleFollowUpFiles}
                          disabled={isOrderCompleted}
                          className="hidden"
                          id="followup-file-input"
                        />
                        <label
                          htmlFor="followup-file-input"
                          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition cursor-pointer ${isOrderCompleted
                              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' 
                              : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-400'
                          }`}
                        >
                          <span className="font-semibold text-slate-900">Drag & drop files</span>
                          <span className="text-xs text-slate-500">or click to browse</span>
                        </label>
                      </div>
                      {followUpAttachments.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {followUpAttachments.map((attachment, idx) => (
                            <div 
                              key={`${attachment.name || 'attachment'}-${idx}`} 
                              className="relative rounded-xl border border-slate-100 bg-white/70 overflow-hidden group"
                            >
                              {attachment.kind === 'video' ? (
                                <div className="aspect-square bg-slate-900">
                                  <video
                                    src={attachment.url}
                                    className="w-full h-full object-cover"
                                    controls
                                  />
                                </div>
                              ) : (
                                <div 
                                  className="aspect-square cursor-pointer"
                                  onClick={() => setImageViewer({ open: true, url: attachment.url, name: attachment.name || `Evidence ${idx + 1}` })}
                                >
                                  <img 
                                    src={attachment.url} 
                                    alt={attachment.name || 'Attachment'} 
                                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                  />
                                </div>
                              )}
                              {!isOrderCompleted && (
                                <button
                                  type="button"
                                  className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFollowUpAttachment(idx);
                                  }}
                                  disabled={isOrderCompleted}
                                  title="Remove"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              )}
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
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Spare Parts / Cost Summary</h4>
                    {!isOrderCompleted && (
                      <Button
                        variant="secondary"
                        onClick={() => setShowAddSparePart(!showAddSparePart)}
                        className="text-xs"
                      >
                        {showAddSparePart ? 'Cancel' : '+ Add Spare'}
                      </Button>
                    )}
                  </div>
                  
                  {showAddSparePart && (
                    <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <Select
                        label="Select Spare Part *"
                        value={selectedSparePartId}
                        onChange={(e) => setSelectedSparePartId(e.target.value)}
                      >
                        <option value="">Choose a spare part...</option>
                        {allSpareparts.map((part) => (
                          <option key={part._id} value={part._id}>
                            {part.name} ({part.sku}) - {formatCurrency(part.unitPrice)}
                          </option>
                        ))}
                      </Select>
                      <Input
                        label="Quantity"
                        type="number"
                        placeholder="1"
                        value={sparePartQuantity}
                        onChange={(e) => setSparePartQuantity(e.target.value)}
                        min="1"
                        step="1"
                      />
                      {selectedSparePartId && (
                        <div className="rounded-lg bg-slate-100 p-2 text-xs text-slate-600">
                          <span className="font-semibold">Total: </span>
                          {formatCurrency(
                            (allSpareparts.find(p => p._id === selectedSparePartId)?.unitPrice || 0) * 
                            parseFloat(sparePartQuantity || '1')
                          )}
                        </div>
                      )}
                      <Button
                        onClick={handleAddSparePart}
                        loading={addSparePartMutation.isPending}
                        className="w-full"
                      >
                        Add Spare Part
                      </Button>
                    </div>
                  )}
                  
                  {spareParts.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Qty</th>
                            <th className="px-3 py-2">Unit price</th>
                            <th className="px-3 py-2 text-right">Total</th>
                            {!isOrderCompleted && <th className="px-3 py-2"></th>}
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
                                {!isOrderCompleted && (
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (jobCardModal.order?._id) {
                                          removeSparePartMutation.mutate({ orderId: jobCardModal.order._id, index: idx });
                                        }
                                      }}
                                      className="text-rose-500 hover:text-rose-700 transition-colors"
                                      disabled={removeSparePartMutation.isPending}
                                      title="Remove spare part"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Service Price</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(servicePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Spare Parts Subtotal</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(sparePartsSubtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Additional Services</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(extraWorksSubtotal)}</span>
                    </div>
                    {jobCard?.additionalCharges ? (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Additional Charges</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(jobCard.additionalCharges)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(servicePrice + sparePartsSubtotal + extraWorksSubtotal + (jobCard?.additionalCharges ?? 0))}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Tax (18%)</span>
                      <span className="font-semibold text-slate-900">{formatCurrency((servicePrice + sparePartsSubtotal + extraWorksSubtotal + (jobCard?.additionalCharges ?? 0)) * 0.18)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Discount</span>
                      <span className="font-semibold text-emerald-600">-{formatCurrency(0)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2 text-base font-bold text-slate-900">
                      <span>Grand Total</span>
                      <span className="text-lg">{formatCurrency((servicePrice + sparePartsSubtotal + extraWorksSubtotal + (jobCard?.additionalCharges ?? 0)) * 1.18)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Drawer
        open={scheduleDrawer.open}
        onClose={() => {
          closeAssignModal();
        }}
        title={`Calendar · ${scheduleDrawer.name || ''}`}
        widthClassName="w-screen max-w-2xl"
      >
        {assignModal.order && (
          <div className="mb-4 space-y-3">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Assigning to order</p>
              <p className="text-sm text-blue-900 mt-1">
                {assignModal.order.serviceItem?.name} · {assignModal.order.customer?.name}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Current slot: {formatDateTime(assignModal.order.timeWindowStart)} → {formatDateTime(assignModal.order.timeWindowEnd)}
              </p>
            </div>

            {/* Assign Button - Always visible */}
            <div className={`rounded-xl border-2 p-4 ${selectedCalendarSlot ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {selectedCalendarSlot ? (
                    <>
                      <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Selected time slot</p>
                      <p className="text-sm font-semibold text-emerald-900 mt-1">
                        {selectedCalendarSlot.label || `${selectedCalendarSlot.startTime} - ${selectedCalendarSlot.endTime}`}
                      </p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        {selectedCalendarSlot.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {selectedCalendarSlot.startTime} → {selectedCalendarSlot.endTime}
                      </p>
                      {(() => {
                        const orderStart = assignModal.order?.timeWindowStart ? new Date(assignModal.order.timeWindowStart) : null;
                        const orderEnd = assignModal.order?.timeWindowEnd ? new Date(assignModal.order.timeWindowEnd) : null;
                        const selectedStart = buildSlotDateTime(selectedCalendarSlot.date, selectedCalendarSlot.startTime);
                        const selectedEnd = buildSlotDateTime(selectedCalendarSlot.date, selectedCalendarSlot.endTime);
                        const isSameSlot = orderStart && orderEnd &&
                          selectedStart.getTime() === orderStart.getTime() &&
                          selectedEnd.getTime() === orderEnd.getTime();

                        return isSameSlot ? (
                          <p className="text-xs text-emerald-800 mt-2 font-medium">✓ Same as current order slot</p>
                        ) : (
                          <p className="text-xs text-amber-600 mt-2 font-medium">⚠ Order will be rescheduled to this slot</p>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">No slot selected</p>
                      <p className="text-sm text-slate-600 mt-1">
                        👆 Select an available time slot from the calendar below
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      if (!scheduleDrawer.technicianId || !assignModal.order || !selectedCalendarSlot) return;

                      const selectedStart = buildSlotDateTime(selectedCalendarSlot.date, selectedCalendarSlot.startTime);
                      const selectedEnd = buildSlotDateTime(selectedCalendarSlot.date, selectedCalendarSlot.endTime);

                      const orderStart = assignModal.order.timeWindowStart ? new Date(assignModal.order.timeWindowStart) : null;
                      const orderEnd = assignModal.order.timeWindowEnd ? new Date(assignModal.order.timeWindowEnd) : null;

                      const isSameSlot = orderStart && orderEnd &&
                        selectedStart.getTime() === orderStart.getTime() &&
                        selectedEnd.getTime() === orderEnd.getTime();

                      if (isSameSlot) {
                        // Same slot, just assign
                        handleAssignTechnician(scheduleDrawer.technicianId);
                      } else {
                        // Different slot, reschedule and assign
                        assignWithSlotMutation.mutate({
                          orderId: assignModal.order._id,
                          technicianId: scheduleDrawer.technicianId,
                          newStart: selectedStart.toISOString(),
                          newEnd: selectedEnd.toISOString()
                        });
                      }
                    }}
                    loading={assignWithSlotMutation.isPending || assignMutation.isPending}
                    disabled={!selectedCalendarSlot || assignWithSlotMutation.isPending || assignMutation.isPending}
                    className="whitespace-nowrap"
                  >
                    {assignWithSlotMutation.isPending || assignMutation.isPending ? 'Assigning...' : 'Assign Technician'}
                  </Button>
                  {selectedCalendarSlot && (
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarSlot(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const newDate = new Date(calendarStartDate);
              newDate.setDate(newDate.getDate() - 7);
              setCalendarStartDate(newDate);
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ← Previous
          </button>
          <p className="text-sm font-semibold text-slate-900">
            {formatDateShort(calendarStartDate)} - {formatDateShort(getCalendarDays(calendarStartDate, 7)[6])}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const newDate = new Date(calendarStartDate);
              newDate.setDate(newDate.getDate() + 7);
              setCalendarStartDate(newDate);
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Next →
          </button>
        </div>

        {(loadingSchedule || loadingTimeSlots) && (
          <p className="text-sm text-slate-400 text-center py-8">Loading calendar…</p>
        )}

        {!loadingSchedule && !loadingTimeSlots && timeSlots.length === 0 && (
          <p className="text-sm text-amber-600 text-center py-8">No time slots configured. Add slots in admin settings.</p>
        )}

        {!loadingSchedule && !loadingTimeSlots && timeSlots.length > 0 && (
          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
            {getCalendarDays(calendarStartDate, 7).map((day) => {
              const dayOfWeek = day.getDay();
              const slotsForDay = timeSlots.filter((slot) => slot.dayOfWeek === dayOfWeek);
              const isToday = day.toDateString() === new Date().toDateString();
              const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div key={day.toISOString()} className={`rounded-xl border p-3 ${isToday ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className={`text-sm font-semibold ${isToday ? 'text-blue-900' : 'text-slate-900'}`}>
                      {day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    {isToday && <span className="text-[10px] uppercase tracking-wide bg-blue-500 text-white px-2 py-0.5 rounded-full">Today</span>}
                    {isPast && <span className="text-[10px] uppercase tracking-wide bg-slate-300 text-slate-600 px-2 py-0.5 rounded-full">Past</span>}
                  </div>

                  {slotsForDay.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No slots configured for this day</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {slotsForDay.map((slot) => {
                        const blockedEntry = isSlotBlocked(day, slot.startTime, slot.endTime, scheduleEntries);
                        const isBlocked = blockedEntry !== null;
                        const slotStartTime = buildSlotDateTime(day, slot.startTime);
                        const slotEndTime = buildSlotDateTime(day, slot.endTime);
                        const isSlotPast = slotEndTime < new Date();

                        // Check if this slot matches the current order's time
                        const orderStart = assignModal.order?.timeWindowStart ? new Date(assignModal.order.timeWindowStart) : null;
                        const orderEnd = assignModal.order?.timeWindowEnd ? new Date(assignModal.order.timeWindowEnd) : null;
                        const isCurrentOrderSlot = orderStart && orderEnd &&
                          slotStartTime.getTime() === orderStart.getTime() &&
                          slotEndTime.getTime() === orderEnd.getTime();

                        const canSelect = !isBlocked && !isSlotPast && assignModal.order && scheduleDrawer.technicianId;

                        // Check if this slot is currently selected
                        const isSelected = selectedCalendarSlot &&
                          selectedCalendarSlot.date.toDateString() === day.toDateString() &&
                          selectedCalendarSlot.startTime === slot.startTime &&
                          selectedCalendarSlot.endTime === slot.endTime;

                        return (
                          <button
                            key={`${day.toISOString()}-${slot.startTime}-${slot.endTime}`}
                            type="button"
                            disabled={isBlocked || isSlotPast || !assignModal.order}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (!canSelect) return;

                              // Toggle selection
                              if (isSelected) {
                                setSelectedCalendarSlot(null);
                              } else {
                                setSelectedCalendarSlot({
                                  date: day,
                                  startTime: slot.startTime,
                                  endTime: slot.endTime,
                                  label: slot.label || `${slot.startTime} - ${slot.endTime}`
                                });
                              }
                            }}
                            className={`
                              relative p-2 rounded-lg text-left text-xs transition-all
                              ${isBlocked
                                ? 'bg-rose-50 border border-rose-200 cursor-not-allowed'
                                : isSlotPast
                                  ? 'bg-slate-50 border border-slate-200 cursor-not-allowed opacity-50'
                                  : isSelected
                                    ? 'bg-blue-100 border-2 border-blue-500 ring-2 ring-blue-200 cursor-pointer'
                                    : isCurrentOrderSlot
                                      ? 'bg-emerald-50 border-2 border-emerald-400 hover:bg-emerald-100 cursor-pointer'
                                      : 'bg-emerald-50/50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${isBlocked ? 'text-rose-700'
                                : isSlotPast ? 'text-slate-400'
                                  : isSelected ? 'text-blue-700'
                                    : 'text-emerald-700'
                                }`}>
                                {slot.label || `${slot.startTime} - ${slot.endTime}`}
                              </span>
                              {isBlocked && (
                                <span className="text-[10px] uppercase tracking-wide bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">
                                  Blocked
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[10px] uppercase tracking-wide bg-blue-500 text-white px-1.5 py-0.5 rounded">
                                  Selected
                                </span>
                              )}
                              {!isBlocked && !isSlotPast && !isSelected && (
                                <span className="text-[10px] uppercase tracking-wide bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">
                                  Available
                                </span>
                              )}
                            </div>
                            <p className={`mt-1 ${isBlocked ? 'text-rose-600'
                              : isSlotPast ? 'text-slate-400'
                                : isSelected ? 'text-blue-600'
                                  : 'text-emerald-600'
                              }`}>
                              {slot.startTime} → {slot.endTime}
                            </p>

                            {isBlocked && blockedEntry && (
                              <div className="mt-2 pt-2 border-t border-rose-200">
                                {/* <p className="text-rose-700 font-medium truncate">
                                  {typeof blockedEntry.order?.serviceItem === 'string'
                                    ? blockedEntry.order?.serviceItem
                                    : blockedEntry.order?.serviceItem?.name || 'Blocked'}
                                </p> */}
                                {blockedEntry.order?.customer?.name && (
                                  <p className="text-rose-600 truncate">{blockedEntry.order.customer.name}</p>
                                )}
                              </div>
                            )}

                            {!isBlocked && !isSlotPast && assignModal.order && (
                              <div className="mt-2 pt-2 border-t border-emerald-200">
                                <p className={`font-medium ${isSelected ? 'text-blue-700' : 'text-emerald-700'}`}>
                                  {isSelected
                                    ? '✓ Click "Assign Technician" above'
                                    : isCurrentOrderSlot
                                      ? '✓ Current order slot'
                                      : 'Click to select'}
                                </p>
                                {!isCurrentOrderSlot && !isSelected && (
                                  <p className="text-emerald-600 text-[10px]">Will reschedule order</p>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {assignWithSlotMutation.isPending && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-slate-700 font-medium">Rescheduling and assigning…</span>
            </div>
          </div>
        )}

        {/* Existing blocked entries list */}
        {!loadingSchedule && scheduleEntries.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-3">Blocked entries ({scheduleEntries.length})</p>
            <ol className="space-y-2 max-h-48 overflow-y-auto">
          {scheduleEntries.map((entry) => {
            const serviceLabel =
              typeof entry.order?.serviceItem === 'string'
                ? entry.order?.serviceItem
                : entry.order?.serviceItem?.name;
            return (
                  <li key={entry.id} className="rounded-lg border border-slate-100 p-2 text-xs">
                    <p className="font-semibold text-slate-900">
                  {formatDateTime(entry.start)} <span className="text-slate-400">→</span> {formatDateTime(entry.end)}
                </p>
                    <p className="text-slate-500">
                  {serviceLabel || 'Blocked slot'}
                  {entry.order?.customer?.name ? ` · ${entry.order.customer.name}` : ''}
                </p>
              </li>
            );
          })}
        </ol>
          </div>
        )}
      </Drawer>

      {/* Create Order Modal */}
      <Modal open={createOrderModal} onClose={() => { setCreateOrderModal(false); resetCreateOrderForm(); }} title="Create New Order">
        <div className="space-y-6">
          {/* Customer lookup */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Customer Information</h3>
            <div className="flex gap-2">
              <Input
                label="Customer Phone Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
                disabled={checkingCustomer}
              />
              <Button 
                onClick={handleCheckCustomer} 
                loading={checkingCustomer}
                variant="secondary"
                className="mt-6"
              >
                Check
              </Button>
            </div>

            {customerData && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                ✓ Customer found: {customerData.name}
              </div>
            )}

            <Input
              label="Customer Name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              disabled={Boolean(customerData && customerName)}
            />

            <Input
              label="Email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@email.com"
              disabled={Boolean(customerData && customerEmail)}
            />
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Service Address</h3>
            
            {customerData && customerData.addresses && customerData.addresses.length > 0 && (
              <Select
                label="Select Address *"
                value={selectedAddressId}
                onChange={(e) => handleAddressChange(e.target.value)}
              >
                <option value="">Choose an address</option>
                {customerData.addresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label || 'Address'} - {addr.line1}, {addr.city} {addr.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </Select>
            )}

            <Input
              label="Address Line 1 *"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street address"
              disabled={Boolean(customerData && addressLine1)}
            />
            <Input
              label="Address Line 2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Apartment, suite, etc."
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City *"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                disabled={Boolean(customerData && city)}
              />
              <Input
                label="State *"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                disabled={Boolean(customerData && state)}
              />
            </div>
            <Input
              label="Postal Code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="PIN Code"
              disabled={Boolean(customerData && postalCode)}
            />
          </div>

          {/* Service selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Service Details</h3>
            <Select
              label="Service Category *"
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setSelectedService(''); }}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </Select>

            <Select
              label="Service Item *"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              disabled={!selectedCategory}
            >
              <option value="">Select service</option>
              {serviceItems.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </Select>

            <TextArea
              label="Issue Description"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={3}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
            <Input
              label="Order Date *"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time *"
                type="time"
                value={orderStartTime}
                onChange={(e) => setOrderStartTime(e.target.value)}
              />
              <Input
                label="End Time *"
                type="time"
                value={orderEndTime}
                onChange={(e) => setOrderEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCreateOrder} loading={createOrderMutation.isPending}>
              Create Order
            </Button>
            <Button variant="secondary" onClick={() => { setCreateOrderModal(false); resetCreateOrderForm(); }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Viewer Modal */}
      {imageViewer.open && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setImageViewer({ open: false, url: '', name: '' });
              setImageZoom(100);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setImageViewer({ open: false, url: '', name: '' });
              setImageZoom(100);
            }
          }}
          tabIndex={-1}
          style={{ isolation: 'isolate' }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg truncate">{imageViewer.name}</h3>
              <p className="text-white/60 text-sm mt-0.5">Click and drag to pan • Scroll to zoom</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageViewer({ open: false, url: '', name: '' });
                setImageZoom(100);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all ml-4"
              aria-label="Close image viewer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Image Container */}
          <div 
            className="flex-1 flex items-center justify-center overflow-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="relative transition-transform duration-200 ease-out"
              style={{ 
                transform: `scale(${imageZoom / 100})`,
                cursor: imageZoom > 100 ? 'move' : 'default'
              }}
            >
              <img
                src={imageViewer.url}
                alt={imageViewer.name}
                className="max-w-none shadow-2xl rounded-lg"
                style={{ maxHeight: '80vh', maxWidth: imageZoom === 100 ? '90vw' : 'none' }}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -10 : 10;
                  setImageZoom(prev => Math.min(Math.max(50, prev + delta), 300));
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageZoom(prev => Math.max(50, prev - 10));
                }}
                disabled={imageZoom <= 50}
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom out"
              >
                <MagnifyingGlassMinusIcon className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-2 px-3">
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={imageZoom}
                  onChange={(e) => setImageZoom(Number(e.target.value))}
                  className="w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${((imageZoom - 50) / 250) * 100}%, rgba(255,255,255,0.2) ${((imageZoom - 50) / 250) * 100}%, rgba(255,255,255,0.2) 100%)`
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-white font-medium text-sm min-w-[3.5rem] text-center">{imageZoom}%</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageZoom(prev => Math.min(300, prev + 10));
                }}
                disabled={imageZoom >= 300}
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom in"
              >
                <MagnifyingGlassPlusIcon className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(100);
              }}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all flex items-center gap-2"
              title="Reset zoom"
            >
              <ArrowsPointingOutIcon className="h-4 w-4" />
              Reset
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(imageViewer.url, '_blank');
              }}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all flex items-center gap-2"
              title="Open in new tab"
            >
              <ArrowsPointingOutIcon className="h-4 w-4" />
              Full Screen
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
