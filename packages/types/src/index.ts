export { UserRole, ROLE_LABELS } from './roles';
export * from './permissions';
export * from './community';

import type { UserRole } from './roles';

export enum MembershipDuration {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  HALF_YEARLY = 'HALF_YEARLY',
  ANNUAL = 'ANNUAL',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentEntityType {
  BOOKING = 'BOOKING',
  MEMBERSHIP = 'MEMBERSHIP',
  TRAINING = 'TRAINING',
  SHOP_ORDER = 'SHOP_ORDER',
  SERVICE_ORDER = 'SERVICE_ORDER',
  PRINT_ORDER = 'PRINT_ORDER',
  WALLET_TOPUP = 'WALLET_TOPUP',
}

export enum EnrollmentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

export enum ProductCategory {
  GEAR = 'GEAR',
  APPAREL = 'APPAREL',
  TROPHIES = 'TROPHIES',
  ACCESSORIES = 'ACCESSORIES',
  OTHER = 'OTHER',
}

export enum ShopOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum ServiceCategory {
  STRINGING = 'STRINGING',
  BAT_REPAIR = 'BAT_REPAIR',
  BALL_REPAIR = 'BALL_REPAIR',
  GRIP_REPLACEMENT = 'GRIP_REPLACEMENT',
  EQUIPMENT_REPAIR = 'EQUIPMENT_REPAIR',
  EQUIPMENT_RENTAL = 'EQUIPMENT_RENTAL',
  OTHER = 'OTHER',
}

export enum ServiceOrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

/** @deprecated Use ServiceOrderStatus */
export enum MarketplaceOrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SportType {
  BADMINTON = 'BADMINTON',
  TENNIS = 'TENNIS',
  CRICKET = 'CRICKET',
  FOOTBALL = 'FOOTBALL',
  SWIMMING = 'SWIMMING',
  GYM = 'GYM',
  OTHER = 'OTHER',
}

export enum CourtApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: UserRole[];
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export const APP_NAME = 'Fitora';

export const SPORT_LABELS: Record<SportType, string> = {
  [SportType.BADMINTON]: 'Badminton',
  [SportType.TENNIS]: 'Tennis',
  [SportType.CRICKET]: 'Cricket',
  [SportType.FOOTBALL]: 'Football',
  [SportType.SWIMMING]: 'Swimming',
  [SportType.GYM]: 'Gym',
  [SportType.OTHER]: 'Other',
};

export interface CourtImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface SportSummary {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
}

export interface Court {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sportId: string;
  sportType?: SportType | string | null;
  sport?: SportSummary;
  address: string;
  city: string;
  state: string | null;
  pincode: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  amenities: string[];
  rules: string | null;
  defaultSlotPrice?: string | null;
  approvalStatus: CourtApprovalStatus;
  rejectionReason: string | null;
  images: CourtImage[] | string[];
  isApproved: boolean;
  isActive: boolean;
  ownerId: string;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Venue {
  id: string;
  name: string;
  brandName: string | null;
  slug: string;
  logoUrl: string | null;
  status: string;
  isActive: boolean;
  address: string;
  city: string;
  state: string | null;
  pincode: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  amenities: string[];
  sports: SportSummary[];
  courtCount: number;
  priceFrom: string | null;
  images: CourtImage[];
  courts?: Court[];
}

export interface CourtSlot {
  id: string;
  courtId: string;
  startTime: string;
  endTime: string;
  price: string;
  isBlocked: boolean;
  isBooked: boolean;
  capacity?: number;
  availableSeats?: number;
  reservedSeats?: number;
  confirmedSeats?: number;
  bookedPlayers?: number;
  version?: number;
  isBookable?: boolean;
  operationalState?: 'AVAILABLE' | 'BLOCKED' | 'MAINTENANCE' | 'TOURNAMENT' | 'PRIVATE' | 'CLOSED';
  availabilityStatus?:
    | 'AVAILABLE'
    | 'FEW_SPOTS'
    | 'FULL'
    | 'BLOCKED'
    | 'MAINTENANCE'
    | 'TOURNAMENT'
    | 'PRIVATE'
    | 'CLOSED'
    | 'HOLIDAY';
  blockReason?: string | null;
}

export interface Booking {
  id: string;
  userId: string;
  courtId: string;
  slotId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  checkInCode: string | null;
  createdAt: string;
  court?: Pick<Court, 'id' | 'name' | 'city' | 'sportType'>;
  slot?: Pick<CourtSlot, 'id' | 'startTime' | 'endTime' | 'price'>;
}

export interface PaymentOrder {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  isMock?: boolean;
  mockMode?: boolean;
  entityType?: PaymentEntityType | string;
  entityId?: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  entityType: PaymentEntityType;
  entityLabel: string;
  entityId: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  failureReason: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  invoiceNumber: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInvoice {
  id: string;
  paymentId: string;
  invoiceNumber: string;
  entityType: PaymentEntityType;
  entityLabel: string;
  entityId: string;
  subtotal: string;
  tax: string;
  total: string;
  description: string | null;
  lineItems: unknown;
  issuedAt: string;
}

export interface PaymentReports {
  periodDays: number;
  summary: {
    totalTransactions: number;
    paidCount: number;
    failedCount: number;
    pendingCount: number;
    refundedCount: number;
    totalRevenue: number;
    refundedAmount: number;
  };
  byEntityType: Array<{
    entityType: PaymentEntityType;
    label: string;
    count: number;
    revenue: number;
  }>;
}

export type AnalyticsPeriod = 'daily' | 'monthly' | 'yearly';

export type AnalyticsExportMetric =
  'revenue' | 'bookings' | 'memberships' | 'products' | 'users' | 'overview';

export interface AnalyticsSeriesPoint {
  label: string;
  key: string;
  value: number;
}

export interface AnalyticsDashboard {
  period: AnalyticsPeriod;
  range: { from: string; to: string };
  overview: {
    totalRevenue: number;
    totalBookings: number;
    newUsers: number;
    activeMemberships: number;
    shopOrders: number;
    activeCourts?: number;
    pendingCourts?: number;
  };
  revenue: {
    total: number;
    series: AnalyticsSeriesPoint[];
    byEntityType: Array<{
      entityType: PaymentEntityType;
      label: string;
      revenue: number;
      count: number;
    }>;
  };
  bookings: {
    total: number;
    totalAmount: number;
    series: AnalyticsSeriesPoint[];
    revenueSeries: AnalyticsSeriesPoint[];
  };
  memberships: {
    total: number;
    active: number;
    revenue: number;
    series: AnalyticsSeriesPoint[];
  };
  products: {
    totalOrders: number;
    revenue: number;
    series: AnalyticsSeriesPoint[];
    topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  };
  users: {
    newUsers: number;
    totalUsers: number;
    series: AnalyticsSeriesPoint[];
  };
  growth: {
    revenue: { current: number; previous: number; changePct: number };
    bookings: { current: number; previous: number; changePct: number };
    users: { current: number; previous: number; changePct: number };
  };
  retention: {
    bookingRetentionRate: number;
    repeatBookers: number;
    uniqueBookers: number;
    payingUsers: number;
  };
}

export const PAYMENT_ENTITY_LABELS: Record<PaymentEntityType, string> = {
  [PaymentEntityType.BOOKING]: 'Court Booking',
  [PaymentEntityType.MEMBERSHIP]: 'Membership',
  [PaymentEntityType.TRAINING]: 'Training',
  [PaymentEntityType.SHOP_ORDER]: 'Store',
  [PaymentEntityType.SERVICE_ORDER]: 'Sports Service',
  [PaymentEntityType.PRINT_ORDER]: 'T-Shirt Printing',
  [PaymentEntityType.WALLET_TOPUP]: 'Wallet Top-up',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Pending',
  [PaymentStatus.PAID]: 'Paid',
  [PaymentStatus.FAILED]: 'Failed',
  [PaymentStatus.REFUNDED]: 'Refunded',
  [PaymentStatus.PARTIALLY_REFUNDED]: 'Partially Refunded',
};

export interface BookingCheckoutResponse {
  booking: Booking;
  payment: PaymentOrder;
  membershipDiscount?: number;
}

export interface PlanBenefits {
  bookingDiscountPercent?: number;
  priorityBooking?: boolean;
  freeGuestPasses?: number;
  perks?: string[];
}

export interface MembershipPlan {
  id: string;
  courtId: string;
  name: string;
  description: string | null;
  duration: MembershipDuration;
  durationLabel?: string;
  price: string;
  maxBookings?: number | null;
  benefits?: PlanBenefits | null;
  isActive: boolean;
  court?: Pick<Court, 'id' | 'name' | 'city'>;
  activeSubscribers?: number;
}

export interface Membership {
  id: string;
  userId: string;
  planId: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  autoRenew?: boolean;
  paymentStatus: PaymentStatus;
  amountPaid?: string;
  plan?: MembershipPlan & { court?: Pick<Court, 'id' | 'name' | 'city'> };
  coupon?: { code: string; codeType: string; companyName?: string | null };
}

export enum CouponCodeType {
  PROMO = 'PROMO',
  CORPORATE = 'CORPORATE',
}

export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum CouponAppliesTo {
  ALL = 'ALL',
  BOOKING = 'BOOKING',
  MEMBERSHIP = 'MEMBERSHIP',
  TRAINING = 'TRAINING',
  SHOP_ORDER = 'SHOP_ORDER',
  SERVICE_ORDER = 'SERVICE_ORDER',
  PRINT_ORDER = 'PRINT_ORDER',
}

export interface MembershipUsage {
  purchaseId: string;
  bookingsUsed: number;
  maxBookings?: number | null;
  bookingsRemaining?: number | null;
  discountPercent: number;
  benefits?: PlanBenefits;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface MembershipDashboard {
  totalPlans: number;
  activeSubscribers: number;
  totalRevenue: number;
  expiringSoon: number;
  promoCodesActive: number;
  corporateCodesActive: number;
  durationOptions: { value: string; label: string }[];
  topPlans: MembershipPlan[];
}

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  codeType: CouponCodeType;
  courtId?: string | null;
  companyName?: string | null;
  discountType: CouponDiscountType;
  discountValue: string;
  maxDiscount?: string | null;
  minOrderAmount?: string | null;
  appliesTo: CouponAppliesTo;
  usageLimit?: number | null;
  usageCount: number;
  perUserLimit: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  court?: Pick<Court, 'id' | 'name'>;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  codeType: CouponCodeType;
  companyName?: string | null;
  discountType: CouponDiscountType;
  discountAmount: number;
  finalAmount: number;
  originalAmount: number;
}

export const DURATION_LABELS: Record<MembershipDuration, string> = {
  [MembershipDuration.HOURLY]: 'Hourly',
  [MembershipDuration.DAILY]: 'Daily',
  [MembershipDuration.MONTHLY]: 'Monthly',
  [MembershipDuration.QUARTERLY]: 'Quarterly',
  [MembershipDuration.HALF_YEARLY]: 'Half Yearly',
  [MembershipDuration.ANNUAL]: 'Yearly',
};

export interface TrainingProgram {
  id: string;
  courtId: string;
  name: string;
  description: string | null;
  sportType?: SportType | string | null;
  ageGroupLabel?: string;
  minAge: number;
  maxAge: number;
  fee: string;
  isActive: boolean;
  court?: Pick<Court, 'id' | 'name' | 'city'>;
  batches?: TrainingBatch[];
}

export interface TrainingBatch {
  id: string;
  programId: string;
  trainerId: string;
  name: string;
  schedule: string;
  maxCapacity: number;
  trainer?: { id: string; firstName: string; lastName: string; email?: string };
  program?: TrainingProgram;
  _count?: { enrollments: number };
  enrollments?: TrainingEnrollment[];
}

export interface KidProfile {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age?: number;
  gender: string | null;
  school: string | null;
  medicalNotes: string | null;
  emergencyContact: string;
  emergencyPhone: string;
  enrollments?: TrainingEnrollment[];
}

export interface TrainingEnrollment {
  id: string;
  kidId: string;
  batchId: string;
  status: string;
  paymentStatus: PaymentStatus;
  amountPaid?: string;
  enrolledAt: string | null;
  kid?: KidProfile;
  batch?: TrainingBatch;
}

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  date: string;
  present: boolean;
  notes: string | null;
}

export interface ProgressReport {
  id: string;
  enrollmentId: string;
  authorId: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  skills?: { skill: string; rating: number }[] | null;
  rating?: number | null;
  isPublished: boolean;
  publishedAt: string | null;
  author?: { id: string; firstName: string; lastName: string };
}

export interface ParentDashboard {
  kidsCount: number;
  activeEnrollments: number;
  ageGroupPresets: { label: string; minAge: number; maxAge: number }[];
  attendance: { present: number; absent: number; total: number };
  kids: KidProfile[];
  recentReports: ProgressReport[];
}

export interface TrainerDashboard {
  batchCount: number;
  activeStudents: number;
  attendanceMarkedToday: number;
  pendingAttendance: number;
  batches: TrainingBatch[];
  ageGroupPresets: { label: string; minAge: number; maxAge: number }[];
}

export enum LeaveRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface TrainerProfileView {
  id: string;
  userId: string;
  bio: string | null;
  certifications: unknown;
  yearsExperience: number | null;
  specializations: string[];
  isVerified: boolean;
  averageRating: number | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerScheduleItem {
  batchId: string;
  batchName: string;
  schedule: string;
  startDate: string | null;
  endDate: string | null;
  maxCapacity: number;
  activeStudents: number;
  program: { id: string; name: string; fee: number };
  court: { id: string; name: string; city: string };
  sport: { id: string; name: string; slug: string };
}

export interface TrainerPerformance {
  averageRating: number | null;
  yearsExperience: number | null;
  isVerified: boolean;
  batchCount: number;
  activeStudents: number;
  sessionsMarked: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  progressReportsWritten: number;
  leaveRequests: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface TrainingNote {
  id: string;
  trainerId: string;
  enrollmentId: string | null;
  batchId: string | null;
  sessionDate: string | null;
  title: string | null;
  content: string;
  isPrivate: boolean;
  batch?: { id: string; name: string } | null;
  enrollment?: {
    id: string;
    kid: { id: string; firstName: string; lastName: string };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  trainerId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveRequestStatus;
  reviewNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  trainer?: { id: string; firstName: string; lastName: string; email: string };
}

export interface NotificationItem {
  id: string;
  type: string;
  channel?: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  deliveries?: NotificationDeliveryItem[];
}

export interface NotificationDeliveryItem {
  channel: string;
  status: string;
  sentAt: string | null;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  typeOverrides: Record<
    string,
    { email?: boolean; sms?: boolean; push?: boolean; inApp?: boolean }
  >;
}

export interface ScheduledNotificationItem {
  id: string;
  title: string;
  body: string;
  scheduledAt: string;
  status: string;
  roles: string[];
  userIds: string[];
  channels: string[];
  processedAt: string | null;
  resultMeta: Record<string, unknown> | null;
  createdAt: string;
}

export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  MEMBERSHIP_ACTIVATED = 'MEMBERSHIP_ACTIVATED',
  MEMBERSHIP_EXPIRING = 'MEMBERSHIP_EXPIRING',
  TRAINING_ENROLLED = 'TRAINING_ENROLLED',
  TRAINING_PROGRESS = 'TRAINING_PROGRESS',
  TRAINING_REMINDER = 'TRAINING_REMINDER',
  TRAINER_NEW_ENROLLMENT = 'TRAINER_NEW_ENROLLMENT',
  LEAVE_REQUEST_UPDATE = 'LEAVE_REQUEST_UPDATE',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  SERVICE_ORDER_UPDATE = 'SERVICE_ORDER_UPDATE',
  PRINT_ORDER_UPDATE = 'PRINT_ORDER_UPDATE',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  WALLET_CREDIT = 'WALLET_CREDIT',
  REVIEW_REQUEST = 'REVIEW_REQUEST',
  ADMIN_BROADCAST = 'ADMIN_BROADCAST',
  SYSTEM = 'SYSTEM',
  COMMUNITY_JOIN_REQUEST = 'COMMUNITY_JOIN_REQUEST',
  COMMUNITY_JOIN_APPROVED = 'COMMUNITY_JOIN_APPROVED',
  COMMUNITY_JOIN_REJECTED = 'COMMUNITY_JOIN_REJECTED',
  COMMUNITY_NEW_MATCH = 'COMMUNITY_NEW_MATCH',
  COMMUNITY_MATCH_REMINDER = 'COMMUNITY_MATCH_REMINDER',
  COMMUNITY_MENTION = 'COMMUNITY_MENTION',
  COMMUNITY_REPLY = 'COMMUNITY_REPLY',
  COMMUNITY_REACTION = 'COMMUNITY_REACTION',
  COMMUNITY_ANNOUNCEMENT = 'COMMUNITY_ANNOUNCEMENT',
  COMMUNITY_VENUE_CHANGED = 'COMMUNITY_VENUE_CHANGED',
  COMMUNITY_COURT_CHANGED = 'COMMUNITY_COURT_CHANGED',
  COMMUNITY_PLAYER_NEEDED = 'COMMUNITY_PLAYER_NEEDED',
  COMMUNITY_FRIEND_REQUEST = 'COMMUNITY_FRIEND_REQUEST',
  COMMUNITY_MATCH_STARTED = 'COMMUNITY_MATCH_STARTED',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  BOOKING_CONFIRMED: 'Booking confirmed',
  BOOKING_CANCELLED: 'Booking cancelled',
  BOOKING_REMINDER: 'Booking reminder',
  MEMBERSHIP_ACTIVATED: 'Membership activated',
  MEMBERSHIP_EXPIRING: 'Membership expiring',
  TRAINING_ENROLLED: 'Training enrolled',
  TRAINING_PROGRESS: 'Progress report',
  TRAINING_REMINDER: 'Training reminder',
  TRAINER_NEW_ENROLLMENT: 'New enrollment',
  LEAVE_REQUEST_UPDATE: 'Leave update',
  ORDER_CONFIRMED: 'Order confirmed',
  ORDER_SHIPPED: 'Order shipped',
  SERVICE_ORDER_UPDATE: 'Service order',
  PRINT_ORDER_UPDATE: 'Print order',
  PAYMENT_SUCCESS: 'Payment success',
  PAYMENT_FAILED: 'Payment failed',
  WALLET_CREDIT: 'Wallet credit',
  REVIEW_REQUEST: 'Review request',
  ADMIN_BROADCAST: 'Admin broadcast',
  SYSTEM: 'System',
  COMMUNITY_JOIN_REQUEST: 'Join request',
  COMMUNITY_JOIN_APPROVED: 'Join approved',
  COMMUNITY_JOIN_REJECTED: 'Join rejected',
  COMMUNITY_NEW_MATCH: 'New match',
  COMMUNITY_MATCH_REMINDER: 'Match reminder',
  COMMUNITY_MENTION: 'Mention',
  COMMUNITY_REPLY: 'Reply',
  COMMUNITY_REACTION: 'Reaction',
  COMMUNITY_ANNOUNCEMENT: 'Announcement',
  COMMUNITY_VENUE_CHANGED: 'Venue changed',
  COMMUNITY_COURT_CHANGED: 'Court changed',
  COMMUNITY_PLAYER_NEEDED: 'Player needed',
  COMMUNITY_FRIEND_REQUEST: 'Friend request',
  COMMUNITY_MATCH_STARTED: 'Match started',
};

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  costPrice?: string | null;
  category: ProductCategory | string;
  categoryId?: string;
  categoryDetail?: ShopCategory;
  sportType: SportType | string | null;
  sport?: { id: string; name: string; slug: string } | null;
  images: string[];
  imageDetails?: ProductImageDetail[];
  variants?: ProductVariant[];
  stock: number;
  lowStockThreshold?: number;
  isActive: boolean;
  isFeatured?: boolean;
  averageRating?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductImageDetail {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number | null;
  stock: number;
  attributes: Record<string, string> | null;
  isActive: boolean;
}

export interface Wishlist {
  id: string;
  userId: string;
  items: WishlistItem[];
}

export interface WishlistItem {
  id: string;
  productId: string;
  variantId: string | null;
  product?: Product;
  variant?: ProductVariant | null;
  createdAt: string;
}

export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerified: boolean;
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface ShopInvoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  issuedAt: string;
  order?: ShopOrder;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  product?: Product;
  variant?: ProductVariant | null;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

export interface ShopOrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  productSku?: string | null;
  productPrice: string;
  quantity: number;
  lineTotal?: string;
  product?: Product;
}

export interface ShopOrder {
  id: string;
  userId: string;
  orderNumber?: string;
  status: ShopOrderStatus;
  paymentStatus: PaymentStatus;
  subtotalAmount?: string;
  discountAmount?: string;
  shippingAmount?: string;
  totalAmount: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPincode: string;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  invoiceNumber?: string | null;
  items: ShopOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShopCheckoutResponse {
  order: ShopOrder;
  payment: PaymentOrder;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.GEAR]: 'Gear',
  [ProductCategory.APPAREL]: 'Apparel',
  [ProductCategory.TROPHIES]: 'Trophies',
  [ProductCategory.ACCESSORIES]: 'Accessories',
  [ProductCategory.OTHER]: 'Other',
};

export const ORDER_STATUS_LABELS: Record<ShopOrderStatus, string> = {
  [ShopOrderStatus.PENDING]: 'Pending',
  [ShopOrderStatus.CONFIRMED]: 'Confirmed',
  [ShopOrderStatus.PROCESSING]: 'Processing',
  [ShopOrderStatus.SHIPPED]: 'Shipped',
  [ShopOrderStatus.DELIVERED]: 'Delivered',
  [ShopOrderStatus.CANCELLED]: 'Cancelled',
  [ShopOrderStatus.RETURNED]: 'Returned',
};

export interface ServiceListing {
  id: string;
  providerId: string;
  category: ServiceCategory;
  title: string;
  description: string | null;
  price: string;
  city: string;
  turnaroundDays: number;
  isActive: boolean;
  averageRating: string | null;
  sport?: { id: string; name: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
  provider?: { id: string; firstName: string; lastName: string };
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  userId: string;
  listingId: string;
  providerId: string;
  status: ServiceOrderStatus;
  paymentStatus: PaymentStatus;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  customerNotes: string | null;
  equipmentDetails: string | null;
  pickupAddress: string;
  pickupPhone: string;
  pickupCity: string;
  providerNotes: string | null;
  trackingReference: string | null;
  rentalStartDate: string | null;
  rentalEndDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: {
    id: string;
    title: string;
    category: ServiceCategory;
    price: string;
    sport?: { id: string; name: string; slug: string } | null;
  } | null;
  user?: { id: string; firstName: string; lastName: string; email: string };
  provider?: { id: string; firstName: string; lastName: string };
}

export interface ServiceCheckoutResponse {
  order: ServiceOrder;
  payment: PaymentOrder;
}

export interface ServiceProviderDashboard {
  listingCount: number;
  orderCount: number;
  accepted: number;
  inProgress: number;
  completed: number;
  recentOrders: ServiceOrder[];
}

export interface ServiceReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  user?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

/** @deprecated Use ServiceOrder */
export interface MarketplaceOrder {
  id: string;
  userId: string;
  listingId: string;
  providerId: string;
  status: MarketplaceOrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  customerNotes: string | null;
  equipmentDetails: string | null;
  pickupAddress: string;
  pickupPhone: string;
  pickupCity: string;
  providerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: ServiceListing;
  user?: { id: string; firstName: string; lastName: string; email: string };
  provider?: { id: string; firstName: string; lastName: string };
}

/** @deprecated Use ServiceCheckoutResponse */
export interface MarketplaceCheckoutResponse {
  order: MarketplaceOrder;
  payment: PaymentOrder;
}

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  [ServiceCategory.STRINGING]: 'Racket Stringing',
  [ServiceCategory.BAT_REPAIR]: 'Bat Repair',
  [ServiceCategory.BALL_REPAIR]: 'Ball Repair',
  [ServiceCategory.GRIP_REPLACEMENT]: 'Grip Replacement',
  [ServiceCategory.EQUIPMENT_REPAIR]: 'Equipment Repair',
  [ServiceCategory.EQUIPMENT_RENTAL]: 'Equipment Rental',
  [ServiceCategory.OTHER]: 'Other',
};

export const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  [ServiceOrderStatus.PENDING]: 'Pending',
  [ServiceOrderStatus.ACCEPTED]: 'Accepted',
  [ServiceOrderStatus.IN_PROGRESS]: 'In Progress',
  [ServiceOrderStatus.COMPLETED]: 'Completed',
  [ServiceOrderStatus.CANCELLED]: 'Cancelled',
  [ServiceOrderStatus.REJECTED]: 'Rejected',
};

/** @deprecated Use SERVICE_ORDER_STATUS_LABELS */
export const MARKETPLACE_STATUS_LABELS: Record<MarketplaceOrderStatus, string> = {
  [MarketplaceOrderStatus.PENDING]: 'Pending',
  [MarketplaceOrderStatus.ACCEPTED]: 'Accepted',
  [MarketplaceOrderStatus.IN_PROGRESS]: 'In Progress',
  [MarketplaceOrderStatus.COMPLETED]: 'Completed',
  [MarketplaceOrderStatus.CANCELLED]: 'Cancelled',
};

export enum PrintOrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DESIGN_REVIEW = 'DESIGN_REVIEW',
  IN_PRODUCTION = 'IN_PRODUCTION',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface PrintListing {
  id: string;
  providerId: string;
  title: string;
  description: string | null;
  price: string;
  minQuantity: number;
  city: string;
  turnaroundDays: number;
  isActive: boolean;
  provider?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface PrintDesignUpload {
  id: string;
  fileName: string;
  mimeType: string;
  url: string;
  previewUrl?: string;
  createdAt: string;
}

export interface PrintOrder {
  id: string;
  orderNumber: string;
  userId: string;
  listingId: string;
  providerId: string;
  status: PrintOrderStatus;
  paymentStatus: PaymentStatus;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  designUrl: string;
  proofUrl: string | null;
  tshirtColor: string | null;
  tshirtSize: string;
  quantity: number;
  customText: string | null;
  customerNotes: string | null;
  pickupAddress: string;
  pickupPhone: string;
  pickupCity: string;
  providerNotes: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  listing?: { id: string; title: string; price: string } | null;
  provider?: { id: string; firstName: string; lastName: string; email?: string };
  user?: { id: string; firstName: string; lastName: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export interface PrintCheckoutResponse {
  order: PrintOrder;
  payment: PaymentOrder;
}

export interface PrinterDashboard {
  listingCount: number;
  orderCount: number;
  awaitingProofApproval: number;
  inProduction: number;
  shipped: number;
  recentOrders: PrintOrder[];
}

export const PRINT_ORDER_STATUS_LABELS: Record<PrintOrderStatus, string> = {
  [PrintOrderStatus.PENDING]: 'Pending payment',
  [PrintOrderStatus.ACCEPTED]: 'Confirmed',
  [PrintOrderStatus.DESIGN_REVIEW]: 'Awaiting your approval',
  [PrintOrderStatus.IN_PRODUCTION]: 'Printing',
  [PrintOrderStatus.SHIPPED]: 'Shipped',
  [PrintOrderStatus.DELIVERED]: 'Delivered',
  [PrintOrderStatus.CANCELLED]: 'Cancelled',
};

export const TSHIRT_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export const TSHIRT_COLOR_OPTIONS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Red', hex: '#c62828' },
  { name: 'Royal Blue', hex: '#1565c0' },
  { name: 'Grey', hex: '#9e9e9e' },
  { name: 'Maroon', hex: '#6d1b1b' },
  { name: 'Green', hex: '#2e7d32' },
] as const;

// ─── AI ──────────────────────────────────────────────────────────────────────

export interface AiRecommendationItem {
  id: string;
  name: string;
  score: number;
  reason: string;
  meta?: Record<string, string | number | null>;
}

export interface AiRecommendationsResponse {
  items: AiRecommendationItem[];
  summary: string;
  mock: boolean;
}

export interface AiWorkoutExercise {
  name: string;
  sets: string;
  notes?: string;
}

export interface AiWorkoutDay {
  day: string;
  exercises: AiWorkoutExercise[];
}

export interface AiWorkoutPlanResponse {
  title: string;
  plan: AiWorkoutDay[];
  tips: string[];
  mock: boolean;
}

export interface AiDietTipsResponse {
  title: string;
  tips: string[];
  mealIdeas: string[];
  hydration: string;
  mock: boolean;
}

export interface AiInsightResponse {
  title: string;
  insights: string[];
  recommendations: string[];
  summary: string;
  metrics?: Record<string, string | number>;
  mock: boolean;
}
