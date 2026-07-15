import { ConsoleSmsProvider } from './sms.provider';

describe('ConsoleSmsProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prints OTP in the development terminal format', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const provider = new ConsoleSmsProvider();

    await expect(
      provider.send('+919876543210', 'ignored', { otpCode: '482731', expiresInMinutes: 5 }),
    ).resolves.toBe(true);

    expect(writeSpy).toHaveBeenCalledWith(
      [
        '====================================',
        'FITORA DEVELOPMENT OTP',
        '====================================',
        'Phone: +91 9876543210',
        'OTP: 482731',
        'Expires: 5 minutes',
        '====================================',
        '',
      ].join('\n'),
    );
  });
});
