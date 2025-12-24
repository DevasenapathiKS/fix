export type AuthRole = 'customer';

export interface AuthUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: AuthRole | string;
  profile?: {
    loyaltyTier?: 'standard' | 'gold' | 'platinum' | string;
    communicationPreference?: 'sms' | 'email' | 'whatsapp' | string;
  };
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface CustomerAddress {
  _id: string;
  label?: string;
  contactName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  createdAt?: string;
}

export interface ServiceItem {
  _id?: string;
  name: string;
  description?: string;
  basePrice?: number;
  badge?: string;
  durationMinutes?: number;
  category?: ServiceCategory | string;
  heroImage?: string;
  rating?: number;
  reviews?: string;
}

export interface ServiceCategory {
  _id?: string;
  name: string;
  description?: string;
  heroImage?: string;
  imageUrl?: string;
  services: ServiceItem[];
}

export interface TimeSlotTemplateInstance {
  templateId: string;
  label: string;
  start: string;
  end: string;
  capacity: number;
}

export interface TimeSlotDay {
  date: string;
  slots: TimeSlotTemplateInstance[];
}

export interface TechnicianInfo {
  _id?: string;
  name: string;
  mobile?: string;
  email?: string;
}

export interface TimelineEntry {
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_required';

export interface CustomerApproval {
  status: ApprovalStatus;
  requestedItems?: Array<{
    label: string;
    amount: number;
    rationale?: string;
  }>;
  history?: Array<{
    status: ApprovalStatus;
    note?: string;
    performedAt?: string;
  }>;
}

export interface TechnicianTracking {
  lastCheckInAt?: string;
  location?: {
    lat: number;
    lng: number;
  };
  note?: string;
}

export interface CustomerExperience {
  rating: number;
  comment?: string;
  ratedAt?: string;
}

export interface OrderSummary {
  _id: string;
  orderCode?: string;
  status: string;
  issueDescription?: string;
  notes?: string;
  serviceItem: ServiceItem | { _id: string; name: string };
  serviceCategory?: ServiceCategory | string;
  scheduledAt?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  preferredSlot?: {
    label: string;
    start: string;
    end: string;
  };
  estimatedCost?: number;
  media?: Array<{ url: string; kind: string }>;
  history?: TimelineEntry[];
  assignedTechnician?: TechnicianInfo | null;
  customerApproval?: CustomerApproval;
  technicianTracking?: TechnicianTracking;
  customerExperience?: CustomerExperience | null;
  customerAddress?: CustomerAddress;
  createdAt?: string;
}

export interface OrderDetail extends OrderSummary {
  customerAddress?: CustomerAddress;
  customer?: {
    name: string;
    phone: string;
  };
}

export interface PaymentIntent {
  _id: string;
  order: string;
  method: 'cash' | 'upi';
  amount: number;
  status: string;
  metadata?: {
    qrPayload?: string;
    [key: string]: unknown;
  };
  transactionRef?: string;
  paidAt?: string;
  createdAt?: string;
}

export interface AdditionalItem {
  type: 'extra_work' | 'spare_part';
  label: string;
  description?: string;
  amount: number;
  unitPrice?: number;
  quantity?: number;
  category?: string;
  partNumber?: string;
}

export interface JobCardData {
  _id?: string;
  status?: string;
  estimateAmount?: number;
  additionalCharges?: number;
  finalAmount?: number;
  additionalItems?: AdditionalItem[];
  checkIns?: Array<{
    timestamp: string;
    note?: string;
  }>;
}

export interface InvoiceSummary {
  order: OrderDetail;
  payment?: PaymentIntent | null;
  jobCard?: JobCardData | null;
  totals: {
    estimate?: number;
    additional?: number;
    final?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}
