import type { AxiosResponse } from 'axios';
import { apiClient, unwrap } from '../lib/apiClient';
import type {
  AuthResponse,
  AuthUser,
  CustomerAddress,
  CustomerApproval,
  InvoiceSummary,
  OrderDetail,
  OrderSummary,
  PaymentIntent,
  ServiceCategory,
  ServiceItem,
  TimeSlotDay
} from '../types/customer';

const unwrapRaw = async <T>(request: Promise<AxiosResponse<unknown>>): Promise<T> => unwrap<T>(request as Promise<AxiosResponse<T>>);

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface AddressPayload {
  label?: string;
  contactName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface CartServiceItem {
  serviceItem: string;
  serviceCategory: string;
  quantity: number;
  issueDescription?: string;
}

export interface OrderPayload {
  serviceCategory?: string;
  serviceItem?: string;
  customerAddressId: string;
  preferredStart: string;
  preferredEnd: string;
  preferredLabel?: string;
  issueDescription?: string;
  estimatedCost?: number;
  attachments?: string[];
  // For cart orders with multiple services
  services?: CartServiceItem[];
}

export interface SlotCheckPayload {
  serviceItem: string;
  start: string;
  end: string;
}

export interface PaymentInitPayload {
  orderId: string;
  method: 'cash' | 'upi';
  amount: number;
}

export interface PaymentConfirmPayload {
  paymentId: string;
  transactionRef: string;
}

export const customerApi = {
  register: (payload: RegisterPayload) => unwrap<AuthResponse>(apiClient.post('/customer/auth/register', payload)),
  login: (payload: LoginPayload) => unwrap<AuthResponse>(apiClient.post('/customer/auth/login', payload)),
  forgotPassword: (identifier: string) =>
    unwrapRaw<{ otp: string; expiresIn: number }>(apiClient.post('/customer/auth/forgot-password', { identifier })),
  getProfile: () => unwrap<AuthUser>(apiClient.get('/customer/profile')),
  updateProfile: (payload: Partial<AuthUser> & { phone?: string }) => unwrap<AuthUser>(apiClient.put('/customer/profile', payload)),

  listAddresses: () => unwrap<CustomerAddress[]>(apiClient.get('/customer/addresses')),
  createAddress: (payload: AddressPayload) => unwrap<CustomerAddress>(apiClient.post('/customer/addresses', payload)),
  updateAddress: (addressId: string, payload: Partial<AddressPayload>) => unwrap<CustomerAddress>(apiClient.put(`/customer/addresses/${addressId}`, payload)),
  deleteAddress: (addressId: string) => unwrapRaw<{ success: boolean }>(apiClient.delete(`/customer/addresses/${addressId}`)),
  markPreferred: (addressId: string) => unwrap<CustomerAddress>(apiClient.post(`/customer/addresses/${addressId}/preferred`, {})),

  listServices: () => unwrap<ServiceCategory[]>(apiClient.get('/customer/services')),
  listCategories: () => unwrap<ServiceCategory[]>(apiClient.get('/customer/services')),
  getServiceDetail: (serviceId: string) => unwrap<ServiceItem>(apiClient.get(`/customer/services/${serviceId}`)),
  searchServices: (keyword: string) => unwrap<ServiceItem[]>(apiClient.get('/customer/services/search', { params: { keyword } })),

  listTimeSlots: (startDate?: string) => unwrap<TimeSlotDay[]>(apiClient.get('/customer/time-slots', { params: { startDate } })),
  checkSlotAvailability: (payload: SlotCheckPayload) =>
    unwrapRaw<{ available: boolean; capacity: number; reason?: string }>(apiClient.post('/customer/time-slots/check', payload)),

  placeOrder: (payload: OrderPayload) => unwrap<OrderDetail>(apiClient.post('/customer/orders', payload)),
  listOrders: (status?: string) => unwrap<OrderSummary[]>(apiClient.get('/customer/orders', { params: { status } })),
  getOrder: (orderId: string) => unwrap<OrderDetail>(apiClient.get(`/customer/orders/${orderId}`)),
  getTechnicianStatus: (orderId: string) =>
    unwrapRaw<{ status: string; technician: Record<string, unknown> | null; lastCheckInAt?: string }>(
      apiClient.get(`/customer/orders/${orderId}/technician`)
    ),
  getAdditionalItems: (orderId: string) => unwrap<CustomerApproval>(apiClient.get(`/customer/orders/${orderId}/additional`)),
  approveAdditionalItems: (orderId: string, note?: string) =>
    unwrap<CustomerApproval>(apiClient.post(`/customer/orders/${orderId}/approve`, { note })),
  rejectAdditionalItems: (orderId: string, note?: string) => unwrap<CustomerApproval>(apiClient.post(`/customer/orders/${orderId}/reject`, { note })),
  rateOrder: (orderId: string, payload: { rating: number; comment?: string }) =>
    unwrapRaw(apiClient.post(`/customer/orders/${orderId}/rating`, payload)),
  cancelOrder: (orderId: string, reason?: string) =>
    unwrap<OrderDetail>(apiClient.post(`/customer/orders/${orderId}/cancel`, { reason })),

  initializePayment: (payload: PaymentInitPayload) => unwrap<PaymentIntent>(apiClient.post('/customer/payments', payload)),
  confirmPayment: (payload: PaymentConfirmPayload) => unwrap<PaymentIntent>(apiClient.post('/customer/payments/confirm', payload)),
  getPaymentStatus: (paymentId: string) => unwrap<PaymentIntent>(apiClient.get(`/customer/payments/${paymentId}`)),

  getHistory: () => unwrap<OrderSummary[]>(apiClient.get('/customer/history')),
  getInvoice: (orderId: string) => unwrap<InvoiceSummary>(apiClient.get(`/customer/orders/${orderId}/invoice`))
};
