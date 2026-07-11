import { buildQrPayload, generateQrDataUrl } from './qr-code.util';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,abc'),
}));

describe('qr-code.util', () => {
  it('builds JSON payload with booking data', () => {
    const payload = buildQrPayload({
      bookingId: 'b1',
      checkInCode: 'ABC123',
      courtId: 'c1',
      courtName: 'Arena',
      slotStart: '2026-07-06T10:00:00Z',
    });

    const parsed = JSON.parse(payload);
    expect(parsed.type).toBe('fitora_booking_checkin');
    expect(parsed.bookingId).toBe('b1');
    expect(parsed.checkInCode).toBe('ABC123');
  });

  it('generates QR data URL', async () => {
    const url = await generateQrDataUrl('{"test":true}');
    expect(url).toContain('data:image/png');
  });
});
