import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  PaymentEntityType,
  PaymentStatus,
  ReviewTargetType,
  ServiceCategory,
  ServiceOrderStatus,
  type Prisma,
  UserRole,
} from '@prisma/client';
import { type AuthUserPayload } from '../common/decorators/current-user.decorator';
import { type NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { type PrismaService } from '../prisma/prisma.module';
import { generateServiceOrderNumber } from './services.constants';
import {
  type BookServiceDto,
  type CreateServiceListingDto,
  type CreateServiceReviewDto,
  type UpdateServiceListingDto,
  type UpdateServiceOrderStatusDto,
} from './dto/services.dto';

const LISTING_INCLUDE = {
  provider: { select: { id: true, firstName: true, lastName: true } },
  sport: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ServiceListingInclude;

const ORDER_INCLUDE = {
  listing: { include: { sport: { select: { id: true, name: true, slug: true } } } },
  provider: { select: { id: true, firstName: true, lastName: true, email: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.ServiceOrderInclude;

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    private notificationsService: NotificationsService,
  ) {}

  getCategories() {
    return Object.values(ServiceCategory);
  }

  async findListings(params?: {
    category?: ServiceCategory;
    sportSlug?: string;
    city?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const where: Prisma.ServiceListingWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(params?.category && { category: params.category }),
      ...(params?.city && { city: { equals: params.city, mode: 'insensitive' } }),
      ...(params?.sportSlug && { sport: { slug: params.sportSlug } }),
      ...(params?.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.serviceListing.findMany({
        where,
        include: LISTING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.serviceListing.count({ where }),
    ]);

    return {
      items: items.map((l) => this.formatListing(l)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findListingById(id: string) {
    const listing = await this.prisma.serviceListing.findFirst({
      where: { id, isActive: true, deletedAt: null },
      include: LISTING_INCLUDE,
    });
    if (!listing) throw new NotFoundException('Service listing not found');
    return this.formatListing(listing);
  }

  async createListing(user: AuthUserPayload, dto: CreateServiceListingDto) {
    this.assertServiceProvider(user);

    let sportId: string | undefined;
    if (dto.sportSlug) {
      const sport = await this.prisma.sport.findUnique({ where: { slug: dto.sportSlug } });
      if (!sport) throw new BadRequestException('Invalid sport');
      sportId = sport.id;
    }

    const listing = await this.prisma.serviceListing.create({
      data: {
        providerId: user.id,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        city: dto.city,
        sportId,
        turnaroundDays: dto.turnaroundDays ?? 3,
      },
      include: LISTING_INCLUDE,
    });

    return this.formatListing(listing);
  }

  async updateListing(id: string, user: AuthUserPayload, dto: UpdateServiceListingDto) {
    const listing = await this.getListingEntity(id);
    this.assertListingOwner(listing, user);

    const updated = await this.prisma.serviceListing.update({
      where: { id },
      data: dto,
      include: LISTING_INCLUDE,
    });
    return this.formatListing(updated);
  }

  async getMyListings(userId: string) {
    const listings = await this.prisma.serviceListing.findMany({
      where: { providerId: userId, deletedAt: null },
      include: LISTING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.formatListing(l));
  }

  async bookService(userId: string, listingId: string, dto: BookServiceDto) {
    const listing = await this.prisma.serviceListing.findFirst({
      where: { id: listingId, isActive: true, deletedAt: null },
    });
    if (!listing) throw new NotFoundException('Service listing not found');

    if (listing.category === ServiceCategory.EQUIPMENT_RENTAL) {
      if (!dto.rentalStartDate || !dto.rentalEndDate) {
        throw new BadRequestException('Rental start and end dates are required');
      }
      if (new Date(dto.rentalEndDate) <= new Date(dto.rentalStartDate)) {
        throw new BadRequestException('Rental end date must be after start date');
      }
    }

    const subtotal = Number(listing.price);
    const orderNumber = generateServiceOrderNumber();

    const order = await this.prisma.serviceOrder.create({
      data: {
        orderNumber,
        userId,
        listingId: listing.id,
        providerId: listing.providerId,
        subtotalAmount: subtotal,
        discountAmount: 0,
        totalAmount: subtotal,
        paymentStatus: PaymentStatus.PENDING,
        status: ServiceOrderStatus.PENDING,
        customerNotes: dto.customerNotes,
        equipmentDetails: dto.equipmentDetails,
        pickupAddress: dto.pickupAddress,
        pickupPhone: dto.pickupPhone,
        pickupCity: dto.pickupCity,
        rentalStartDate: dto.rentalStartDate ? new Date(dto.rentalStartDate) : undefined,
        rentalEndDate: dto.rentalEndDate ? new Date(dto.rentalEndDate) : undefined,
      },
      include: ORDER_INCLUDE,
    });

    const payment = await this.paymentsService.createPaymentOrder(
      userId,
      subtotal,
      PaymentEntityType.SERVICE_ORDER,
      order.id,
    );

    return { order: this.formatOrder(order), payment };
  }

  async confirmAfterPayment(orderId: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Service order not found');
    if (order.paymentStatus === PaymentStatus.PAID) return this.formatOrder(order);

    const updated = await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.PAID, status: ServiceOrderStatus.ACCEPTED },
      include: ORDER_INCLUDE,
    });

    await this.notificationsService.notifyServiceOrderUpdate(order.userId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: ServiceOrderStatus.ACCEPTED,
      message: `Your service booking ${order.orderNumber} is confirmed.`,
    });

    await this.notificationsService.notifyServiceOrderUpdate(order.providerId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: ServiceOrderStatus.ACCEPTED,
      message: `New service order ${order.orderNumber} — ${order.listing.title}`,
    });

    return this.formatOrder(updated);
  }

  async getMyOrders(userId: string) {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { userId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.formatOrder(o));
  }

  async getOrder(orderId: string, user: AuthUserPayload) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: orderId, deletedAt: null },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Order not found');

    const isCustomer = order.userId === user.id;
    const isProvider = order.providerId === user.id;
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    if (!isCustomer && !isProvider && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    return this.formatOrder(order);
  }

  async getProviderOrders(providerId: string) {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { providerId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.formatOrder(o));
  }

  async getProviderDashboard(providerId: string) {
    const [listings, orders, accepted, inProgress, completed] = await Promise.all([
      this.prisma.serviceListing.count({ where: { providerId, isActive: true, deletedAt: null } }),
      this.prisma.serviceOrder.count({
        where: { providerId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      }),
      this.prisma.serviceOrder.count({
        where: { providerId, status: ServiceOrderStatus.ACCEPTED, deletedAt: null },
      }),
      this.prisma.serviceOrder.count({
        where: { providerId, status: ServiceOrderStatus.IN_PROGRESS, deletedAt: null },
      }),
      this.prisma.serviceOrder.count({
        where: { providerId, status: ServiceOrderStatus.COMPLETED, deletedAt: null },
      }),
    ]);

    const recentOrders = await this.prisma.serviceOrder.findMany({
      where: { providerId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      listingCount: listings,
      orderCount: orders,
      accepted,
      inProgress,
      completed,
      recentOrders: recentOrders.map((o) => this.formatOrder(o)),
    };
  }

  async updateOrderStatus(
    orderId: string,
    user: AuthUserPayload,
    dto: UpdateServiceOrderStatusDto,
  ) {
    const order = await this.getOrderEntity(orderId);
    this.assertProviderOrAdmin(order, user);
    this.validateProviderTransition(order.status, dto.status);

    const updated = await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        ...(dto.providerNotes !== undefined && { providerNotes: dto.providerNotes }),
        ...(dto.trackingReference !== undefined && { trackingReference: dto.trackingReference }),
        ...(dto.status === ServiceOrderStatus.COMPLETED && { completedAt: new Date() }),
      },
      include: ORDER_INCLUDE,
    });

    await this.notifyStatusChange(updated, dto.status);
    return this.formatOrder(updated);
  }

  async createReview(listingId: string, userId: string, dto: CreateServiceReviewDto) {
    const listing = await this.prisma.serviceListing.findFirst({
      where: { id: listingId, deletedAt: null },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const completedOrder = await this.prisma.serviceOrder.findFirst({
      where: {
        userId,
        listingId,
        status: ServiceOrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        deletedAt: null,
      },
    });
    if (!completedOrder) {
      throw new BadRequestException('Complete a service order before leaving a review');
    }

    const review = await this.prisma.review.upsert({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: ReviewTargetType.SERVICE_PROVIDER,
          targetId: listingId,
        },
      },
      create: {
        userId,
        targetType: ReviewTargetType.SERVICE_PROVIDER,
        targetId: listingId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        isVerified: true,
      },
      update: {
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
      },
    });

    const agg = await this.prisma.review.aggregate({
      where: {
        targetType: ReviewTargetType.SERVICE_PROVIDER,
        targetId: listingId,
        isPublished: true,
        deletedAt: null,
      },
      _avg: { rating: true },
    });

    await this.prisma.serviceListing.update({
      where: { id: listingId },
      data: { averageRating: agg._avg.rating ?? dto.rating },
    });

    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }

  async getListingReviews(listingId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        targetType: ReviewTargetType.SERVICE_PROVIDER,
        targetId: listingId,
        isPublished: true,
        deletedAt: null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      user: r.user,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getAllOrdersAdmin() {
    const orders = await this.prisma.serviceOrder.findMany({
      where: { paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.formatOrder(o));
  }

  async adminListListings(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const sortOrder = params?.sortOrder ?? 'desc';

    const where: Prisma.ServiceListingWhereInput = {
      deletedAt: null,
      ...(params?.status === 'ACTIVE' && { isActive: true }),
      ...(params?.status === 'INACTIVE' && { isActive: false }),
      ...(params?.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
          { city: { contains: params.search, mode: 'insensitive' } },
          { provider: { firstName: { contains: params.search, mode: 'insensitive' } } },
          { provider: { lastName: { contains: params.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.serviceListing.findMany({
        where,
        include: {
          ...LISTING_INCLUDE,
          _count: { select: { orders: { where: { paymentStatus: PaymentStatus.PAID } } } },
        },
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.serviceListing.count({ where }),
    ]);

    return {
      items: items.map((l) => ({
        ...this.formatListing(l),
        orderCount: l._count.orders,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async adminListOrders(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: ServiceOrderStatus;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const sortOrder = params?.sortOrder ?? 'desc';

    const where: Prisma.ServiceOrderWhereInput = {
      deletedAt: null,
      paymentStatus: PaymentStatus.PAID,
      ...(params?.status && { status: params.status }),
      ...(params?.search && {
        OR: [
          { orderNumber: { contains: params.search, mode: 'insensitive' } },
          { user: { email: { contains: params.search, mode: 'insensitive' } } },
          { listing: { title: { contains: params.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);

    return {
      items: items.map((o) => this.formatOrder(o)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private assertServiceProvider(user: AuthUserPayload) {
    if (!user.roles.includes(UserRole.SERVICE_PROVIDER) && !user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Service provider role required');
    }
  }

  private assertListingOwner(listing: { providerId: string }, user: AuthUserPayload) {
    if (listing.providerId !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Not your listing');
    }
  }

  private assertProviderOrAdmin(order: { providerId: string }, user: AuthUserPayload) {
    if (order.providerId !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Not authorized');
    }
  }

  private async getListingEntity(id: string) {
    const listing = await this.prisma.serviceListing.findFirst({
      where: { id, deletedAt: null },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  private async getOrderEntity(id: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private validateProviderTransition(current: ServiceOrderStatus, next: ServiceOrderStatus) {
    const allowed: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
      [ServiceOrderStatus.PENDING]: [],
      [ServiceOrderStatus.ACCEPTED]: [
        ServiceOrderStatus.IN_PROGRESS,
        ServiceOrderStatus.REJECTED,
        ServiceOrderStatus.CANCELLED,
      ],
      [ServiceOrderStatus.IN_PROGRESS]: [
        ServiceOrderStatus.COMPLETED,
        ServiceOrderStatus.CANCELLED,
      ],
      [ServiceOrderStatus.COMPLETED]: [],
      [ServiceOrderStatus.CANCELLED]: [],
      [ServiceOrderStatus.REJECTED]: [],
    };

    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(`Cannot transition from ${current} to ${next}`);
    }
  }

  private async notifyStatusChange(
    order: Prisma.ServiceOrderGetPayload<{ include: typeof ORDER_INCLUDE }>,
    status: ServiceOrderStatus,
  ) {
    const labels: Record<string, string> = {
      IN_PROGRESS: 'Your service is in progress',
      COMPLETED: 'Your service has been completed',
      CANCELLED: 'Your service order was cancelled',
      REJECTED: 'Your service order was rejected by the provider',
    };

    const message =
      labels[status] ??
      (status === ServiceOrderStatus.IN_PROGRESS && order.trackingReference
        ? `Service update — tracking ref: ${order.trackingReference}`
        : `Order status updated to ${status}`);

    await this.notificationsService.notifyServiceOrderUpdate(order.userId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status,
      message,
    });
  }

  private formatListing(
    listing: Prisma.ServiceListingGetPayload<{ include: typeof LISTING_INCLUDE }>,
  ) {
    return {
      id: listing.id,
      providerId: listing.providerId,
      category: listing.category,
      title: listing.title,
      description: listing.description,
      price: String(listing.price),
      city: listing.city,
      turnaroundDays: listing.turnaroundDays,
      isActive: listing.isActive,
      averageRating: listing.averageRating ? String(listing.averageRating) : null,
      sport: listing.sport,
      provider: listing.provider,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    };
  }

  private formatOrder(order: Prisma.ServiceOrderGetPayload<{ include: typeof ORDER_INCLUDE }>) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      listingId: order.listingId,
      providerId: order.providerId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotalAmount: String(order.subtotalAmount),
      discountAmount: String(order.discountAmount),
      totalAmount: String(order.totalAmount),
      customerNotes: order.customerNotes,
      equipmentDetails: order.equipmentDetails,
      pickupAddress: order.pickupAddress,
      pickupPhone: order.pickupPhone,
      pickupCity: order.pickupCity,
      providerNotes: order.providerNotes,
      trackingReference: order.trackingReference,
      rentalStartDate: order.rentalStartDate?.toISOString() ?? null,
      rentalEndDate: order.rentalEndDate?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      listing: order.listing
        ? {
            id: order.listing.id,
            title: order.listing.title,
            category: order.listing.category,
            price: String(order.listing.price),
            sport: order.listing.sport,
          }
        : null,
      provider: order.provider,
      user: order.user,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
