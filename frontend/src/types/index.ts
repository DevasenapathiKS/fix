export type UserRole = 'admin' | 'technician';

export interface LoginPayload {
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

export interface Order {
  _id: string;
  customer: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode?: string;
    email?: string;
  };
  serviceCategory: { _id: string; name: string };
  serviceItem: { _id: string; name: string };
  status: string;
  scheduledAt: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  preferredSlot?: {
    label?: string;
    start?: string;
    end?: string;
  };
  assignedTechnician?: { _id: string; name: string };
}

export interface TechnicianCandidate {
  id: string;
  name: string;
  phone?: string;
  experienceYears?: number;
  averageRating?: number;
  skills?: string[];
  serviceItems?: Array<{ id: string; name: string }>;
  workingHours?: { start?: string; end?: string };
  isAvailable: boolean;
}

export interface TechnicianSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  experienceYears?: number;
  averageRating?: number;
  skills?: string[];
  workingHours?: { start?: string; end?: string };
  serviceItems?: Array<{ id?: string; name?: string }>;
  serviceCategories?: Array<{ id?: string; name?: string }>;
  todayAttendance?: {
    status: 'present' | 'absent' | 'on_leave';
    checkInAt?: string;
    checkOutAt?: string;
    note?: string;
  } | null;
}

export interface TechnicianScheduleEntry {
  id: string;
  start: string;
  end: string;
  status: string;
  order?: {
    id?: string;
    code?: string;
    status?: string;
    serviceItem?: { _id?: string; name?: string } | string;
    customer?: { name?: string; phone?: string };
    timeWindowStart?: string;
    timeWindowEnd?: string;
  } | null;
}

export interface TechnicianAttendanceRecord {
  _id?: string;
  technician: string;
  date: string;
  status: 'present' | 'absent' | 'on_leave';
  checkInAt?: string;
  checkOutAt?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FollowUpAttachment {
  url: string;
  kind: 'image' | 'video' | 'document';
  name?: string;
}

export interface OrderFollowUpInfo {
  reason?: string;
  attachments?: FollowUpAttachment[];
  createdAt?: string;
  resolvedAt?: string;
  createdBy?: { _id?: string; name?: string; role?: UserRole } | string | null;
}

export interface OrderHistoryEntry {
  action: string;
  message?: string;
  metadata?: Record<string, any>;
  performedAt?: string;
  performedBy?: { _id?: string; name?: string; role?: UserRole } | string | null;
}

export interface PaymentRecord {
  id?: string;
  method?: string;
  amount?: number;
  status?: string;
  transactionRef?: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobCardExtraWork {
  description: string;
  amount: number;
}

export interface JobCardSparePartUsage {
  part?: {
    _id?: string;
    name?: string;
    sku?: string;
    unitPrice?: number;
  } | string;
  quantity: number;
  unitPrice: number;
}

export interface JobCardCheckIn {
  timestamp: string;
  note?: string;
}

export interface JobCardDetail {
  order: {
    id: string;
    code?: string;
    customer: {
      name: string;
      phone: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      email?: string;
    };
    serviceCategory?: { _id?: string; name?: string } | string;
    serviceItem?: { _id?: string; name?: string; description?: string; basePrice?: number } | string;
    issueDescription?: string;
    preferredSlot?: { label?: string; start?: string; end?: string };
    timeWindowStart?: string;
    timeWindowEnd?: string;
    estimatedCost?: number;
    createdAt?: string;
    status?: string;
    assignedTechnician?: { _id?: string; name?: string; mobile?: string } | string;
    history?: OrderHistoryEntry[];
    media?: Array<{ _id?: string; url: string; kind?: 'image' | 'video' | 'document'; name?: string }>;
    followUp?: OrderFollowUpInfo | null;
  };
  jobCard?: {
    id: string;
    status: string;
    estimateAmount?: number;
    additionalCharges?: number;
    finalAmount?: number;
    paymentStatus?: string;
    technician?: { _id?: string; name?: string; mobile?: string } | string;
    checkIns?: JobCardCheckIn[];
    extraWork?: JobCardExtraWork[];
    sparePartsUsed?: JobCardSparePartUsage[];
    createdAt?: string;
    updatedAt?: string;
  } | null;
  payments?: PaymentRecord[];
}

export interface OrderFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ServiceCategory {
  _id?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ServiceItem {
  _id?: string;
  category: string;
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice?: number;
}

export interface TechnicianSkill {
  _id?: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface SparePart {
  _id?: string;
  name: string;
  sku: string;
  unitPrice: number;
  imageUrl?: string;
}

export interface TimeSlotTemplate {
  _id?: string;
  label?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  intervalMinutes?: number;
  capacity?: number;
  isActive?: boolean;
}

export interface UserPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  serviceItems?: string[];
  serviceCategories?: string[];
  skills?: string[];
  experienceYears?: number;
}
