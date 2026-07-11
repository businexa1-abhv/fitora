import QRCode from 'qrcode';

export interface BookingQrPayload {
  bookingId: string;
  checkInCode: string;
  courtId: string;
  courtName: string;
  slotStart: string;
}

export function buildQrPayload(data: BookingQrPayload): string {
  return JSON.stringify({
    type: 'fitora_booking_checkin',
    v: 1,
    ...data,
  });
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
  });
}
