import apiClient from './apiClient';
import type {
  AuthUser,
  LoginPayload,
  Order,
  OrderFilters,
  ServiceCategory,
  ServiceItem,
  TechnicianSkill,
  SparePart,
  TechnicianCandidate,
  TechnicianScheduleEntry,
  TechnicianSummary,
  TechnicianAttendanceRecord,
  TimeSlotTemplate,
  UserPayload,
  UserRole,
  FollowUpAttachment,
  JobCardDetail
  ,
  CustomerSummary
} from '../types';

interface ApiSuccess<T> {
  success: boolean;
  message: string;
  data: T;
}

const extract = async <T>(promise: Promise<{ data: ApiSuccess<T> }>) => {
  const response = await promise;
  return response.data.data;
};

interface LoginResult {
  token: string;
  user: AuthUser;
}

interface TechnicianAvailabilitySlot {
  _id: string;
  technician: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface CreatedUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status?: string;
}

export const AuthAPI = {
  login: (payload: LoginPayload) => extract<LoginResult>(apiClient.post<ApiSuccess<LoginResult>>('/auth/login', payload))
};

export const OrdersAPI = {
  list: (filters: OrderFilters = {}) =>
    extract<Order[]>(
      apiClient.get<ApiSuccess<Order[]>>('/admin/orders', {
        params: filters
      })
    ),
  create: (payload: any) => extract<Order>(apiClient.post<ApiSuccess<Order>>('/admin/orders', payload)),
  assign: (orderId: string, technicianId: string) =>
    extract<Order>(apiClient.post<ApiSuccess<Order>>(`/admin/orders/${orderId}/assign`, { technicianId })),
  candidates: (orderId: string) =>
    extract<TechnicianCandidate[]>(apiClient.get<ApiSuccess<TechnicianCandidate[]>>(`/admin/orders/${orderId}/technicians`)),
  jobCard: (orderId: string) =>
    extract<JobCardDetail>(apiClient.get<ApiSuccess<JobCardDetail>>(`/admin/orders/${orderId}/jobcard`)),
  reschedule: (orderId: string, payload: { newStart: string; newEnd: string }) =>
    extract<Order>(apiClient.post<ApiSuccess<Order>>(`/orders/${orderId}/reschedule`, payload)),
  changeStatus: (orderId: string, payload: { status: string; reason?: string; attachments?: FollowUpAttachment[] }) =>
    extract<JobCardDetail>(apiClient.post<ApiSuccess<JobCardDetail>>(`/admin/orders/${orderId}/status`, payload)),
  uploadMedia: (orderId: string, payload: { media: FollowUpAttachment[] }) =>
    extract<JobCardDetail>(apiClient.post<ApiSuccess<JobCardDetail>>(`/admin/orders/${orderId}/media`, payload)),
  deleteMedia: (orderId: string, mediaId: string) =>
    extract<JobCardDetail>(apiClient.delete<ApiSuccess<JobCardDetail>>(`/admin/orders/${orderId}/media/${mediaId}`)),
  updatePaymentStatus: (orderId: string, payload: { status: 'pending' | 'partial' | 'paid' }) =>
    extract<JobCardDetail>(apiClient.post<ApiSuccess<JobCardDetail>>(`/admin/orders/${orderId}/payment-status`, payload)),
  addHistoryNote: (orderId: string, payload: { message: string }) =>
    extract<JobCardDetail>(apiClient.post<ApiSuccess<JobCardDetail>>(`/admin/orders/${orderId}/history`, payload))
};

export const CatalogAPI = {
  categories: () => extract<ServiceCategory[]>(apiClient.get<ApiSuccess<ServiceCategory[]>>('/admin/categories')),
  serviceItems: (categoryId?: string) =>
    extract<ServiceItem[]>(
      apiClient.get<ApiSuccess<ServiceItem[]>>('/admin/service-items', {
        params: categoryId ? { categoryId } : undefined
      })
    ),
  upsertCategory: (payload: ServiceCategory) =>
    extract<ServiceCategory>(apiClient.post<ApiSuccess<ServiceCategory>>('/admin/categories', payload)),
  upsertServiceItem: (payload: ServiceItem) =>
    extract<ServiceItem>(apiClient.post<ApiSuccess<ServiceItem>>('/admin/service-items', payload))
};

export const SparePartsAPI = {
  list: () => extract<SparePart[]>(apiClient.get<ApiSuccess<SparePart[]>>('/admin/spare-parts')),
  upsert: (payload: SparePart) =>
    extract<SparePart>(apiClient.post<ApiSuccess<SparePart>>('/admin/spare-parts', payload))
};

export const TechnicianSkillsAPI = {
  list: () => extract<TechnicianSkill[]>(apiClient.get<ApiSuccess<TechnicianSkill[]>>('/admin/technician-skills')),
  create: (payload: TechnicianSkill) =>
    extract<TechnicianSkill>(apiClient.post<ApiSuccess<TechnicianSkill>>('/admin/technician-skills', payload))
};

export const AdminUserAPI = {
  create: (payload: UserPayload) => extract<CreatedUser>(apiClient.post<ApiSuccess<CreatedUser>>('/admin/users', payload))
};

export const TechniciansAPI = {
  list: () => extract<TechnicianSummary[]>(apiClient.get<ApiSuccess<TechnicianSummary[]>>('/admin/technicians')),
  availability: (technicianId: string) =>
    extract<TechnicianAvailabilitySlot[]>(
      apiClient.get<ApiSuccess<TechnicianAvailabilitySlot[]>>(`/admin/technicians/${technicianId}/availability`)
    ),
  schedule: (technicianId: string, params?: { start?: string; end?: string }) =>
    extract<TechnicianScheduleEntry[]>(
      apiClient.get<ApiSuccess<TechnicianScheduleEntry[]>>(`/admin/technicians/${technicianId}/schedule`, {
        params
      })
    ),
  attendance: (technicianId: string) =>
    extract<TechnicianAttendanceRecord[]>(
      apiClient.get<ApiSuccess<TechnicianAttendanceRecord[]>>(`/admin/technicians/${technicianId}/attendance`)
    ),
  markAttendance: (
    technicianId: string,
    payload: { date: string; status: 'present' | 'absent' | 'on_leave'; checkInAt?: string; checkOutAt?: string; note?: string }
  ) =>
    extract<TechnicianAttendanceRecord>(
      apiClient.post<ApiSuccess<TechnicianAttendanceRecord>>(`/admin/technicians/${technicianId}/attendance`, payload)
    )
};

export const TimeSlotsAPI = {
  list: () => extract<TimeSlotTemplate[]>(apiClient.get<ApiSuccess<TimeSlotTemplate[]>>('/admin/time-slots')),
  create: (payload: TimeSlotTemplate) =>
    extract<TimeSlotTemplate>(apiClient.post<ApiSuccess<TimeSlotTemplate>>('/admin/time-slots', payload)),
  update: (id: string, payload: Partial<TimeSlotTemplate>) =>
    extract<TimeSlotTemplate>(apiClient.put<ApiSuccess<TimeSlotTemplate>>(`/admin/time-slots/${id}`, payload)),
  remove: (id: string) => extract<Record<string, never>>(apiClient.delete<ApiSuccess<Record<string, never>>>(`/admin/time-slots/${id}`))
};

export const CustomersAPI = {
  list: () => extract<CustomerSummary[]>(apiClient.get<ApiSuccess<CustomerSummary[]>>('/admin/customers')),
  findByPhone: (phone: string) => extract<CustomerSummary | null>(apiClient.get<ApiSuccess<CustomerSummary | null>>(`/admin/customers/phone/${phone}`)),
  create: (payload: any) => extract<CustomerSummary>(apiClient.post<ApiSuccess<CustomerSummary>>('/admin/customers', payload))
};
