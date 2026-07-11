import type {
  PaginatedResponse,
  PrintCheckoutResponse,
  PrintDesignUpload,
  PrintListing,
  PrintOrder,
  PrinterDashboard,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getPrintOptions() {
  return apiFetch<{ sizes: string[]; colors: { name: string; hex: string }[] }>('/print/options');
}

export function getPrintListings(params?: { city?: string; search?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params?.city) query.set('city', params.city);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return apiFetch<PaginatedResponse<PrintListing>>(`/print/listings${qs ? `?${qs}` : ''}`);
}

export function getPrintListing(id: string) {
  return apiFetch<PrintListing>(`/print/listings/${id}`);
}

export function uploadDesign(token: string, data: { fileName: string; mimeType: string; dataBase64: string }) {
  return apiFetch<PrintDesignUpload>('/print/designs/upload', { method: 'POST', body: JSON.stringify(data) }, token);
}

export function placePrintOrder(
  token: string,
  listingId: string,
  data: {
    designUrl: string;
    tshirtSize: string;
    tshirtColor?: string;
    quantity?: number;
    customText?: string;
    pickupAddress: string;
    pickupPhone: string;
    pickupCity: string;
    customerNotes?: string;
  },
) {
  return apiFetch<PrintCheckoutResponse>(
    `/print/listings/${listingId}/orders`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function getMyPrintOrders(token: string) {
  return apiFetch<PrintOrder[]>('/print/orders/my', {}, token);
}

export function approvePrintDesign(token: string, orderId: string, customerNotes?: string) {
  return apiFetch<PrintOrder>(
    `/print/orders/${orderId}/approve-design`,
    { method: 'POST', body: JSON.stringify({ customerNotes }) },
    token,
  );
}

export function rejectPrintDesign(token: string, orderId: string, reason: string) {
  return apiFetch<PrintOrder>(
    `/print/orders/${orderId}/reject-design`,
    { method: 'POST', body: JSON.stringify({ reason }) },
    token,
  );
}

export function getPrinterDashboard(token: string) {
  return apiFetch<PrinterDashboard>('/print/dashboard/printer', {}, token);
}

export function getPrinterOrders(token: string) {
  return apiFetch<PrintOrder[]>('/print/orders/provider/incoming', {}, token);
}

export function getMyPrintListings(token: string) {
  return apiFetch<PrintListing[]>('/print/listings/mine/all', {}, token);
}

export function createPrintListing(
  token: string,
  data: {
    title: string;
    description?: string;
    price: number;
    minQuantity?: number;
    city: string;
    turnaroundDays?: number;
  },
) {
  return apiFetch<PrintListing>('/print/listings', { method: 'POST', body: JSON.stringify(data) }, token);
}

export function updatePrintOrderStatus(
  token: string,
  orderId: string,
  data: { status: string; proofUrl?: string; providerNotes?: string; trackingNumber?: string },
) {
  return apiFetch<PrintOrder>(
    `/print/orders/${orderId}/status`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token,
  );
}

export async function fileToBase64(file: File): Promise<{ fileName: string; mimeType: string; dataBase64: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return {
    fileName: file.name,
    mimeType: file.type || 'image/png',
    dataBase64: btoa(binary),
  };
}
