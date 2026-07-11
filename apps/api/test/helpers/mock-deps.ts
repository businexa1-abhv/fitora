export const mockNotificationsService = () => ({
  notifyBookingConfirmed: jest.fn(),
  notifyBookingCancelled: jest.fn(),
  notifyPaymentSuccess: jest.fn(),
  notifyPaymentFailed: jest.fn(),
  notifyShopOrderConfirmed: jest.fn(),
  notifyShopOrderShipped: jest.fn(),
  notifyOrderConfirmed: jest.fn(),
  notifyOrderShipped: jest.fn(),
  notifyPrintOrderUpdate: jest.fn(),
  notifyMembershipActivated: jest.fn(),
  notifyTrainingEnrolled: jest.fn(),
  notifyProgressReport: jest.fn(),
  notifyTrainerNewEnrollment: jest.fn(),
  notifyServiceOrderUpdate: jest.fn(),
  create: jest.fn(),
});

export const mockQueueJobsService = () => ({
  enqueueEmail: jest.fn(),
  enqueueSms: jest.fn(),
  enqueuePush: jest.fn(),
  enqueueRefund: jest.fn().mockResolvedValue(null),
  enqueuePaymentRetry: jest.fn().mockResolvedValue(null),
});

export const mockWalletService = () => ({
  creditFromTopup: jest.fn(),
});

export const mockPaymentsService = () => ({
  createPaymentOrder: jest.fn().mockResolvedValue({
    paymentId: 'pay-1',
    orderId: 'mock_order_pay-1',
    mockMode: true,
    isMock: true,
  }),
  refundBookingPayment: jest.fn().mockResolvedValue({}),
  getConfig: jest.fn().mockReturnValue({ provider: 'razorpay', mockMode: true }),
});

export const mockCouponsService = () => ({
  resolveCoupon: jest.fn().mockResolvedValue({ coupon: null, discountAmount: 0, finalAmount: 100 }),
  applyRedemption: jest.fn(),
  validateForUser: jest.fn(),
});

export const mockPrismaTransaction = (prisma: object) =>
  jest.fn(async (fn: (tx: object) => unknown) => fn(prisma));

export const mockCacheService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  invalidatePattern: jest.fn().mockResolvedValue(0),
  getOrSet: jest.fn((_key: string, _ttl: number, factory: () => Promise<unknown>) => factory()),
  flushNamespace: jest.fn().mockResolvedValue(0),
});

export const mockConfigService = (values: Record<string, unknown> = {}) => ({
  get: jest.fn((key: string, defaultValue?: unknown) =>
    key in values ? values[key] : defaultValue,
  ),
});
