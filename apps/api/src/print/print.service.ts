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
  PrintOrderStatus,
  type Prisma,
  UserRole,
} from '@prisma/client';
import { type AuthUserPayload } from '../common/decorators/current-user.decorator';
import { validateBase64Image, toDataUrl } from '../common/utils/image.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.module';
import { generatePrintOrderNumber, TSHIRT_COLORS, TSHIRT_SIZES } from './print.constants';
import {
  type ApproveDesignDto,
  type CreatePrintListingDto,
  type CreatePrintOrderDto,
  type RejectDesignDto,
  type UpdatePrintListingDto,
  type UpdatePrintOrderStatusDto,
  type UploadDesignDto,
} from './dto/print.dto';

const LISTING_INCLUDE = {
  provider: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PrintListingInclude;

const ORDER_INCLUDE = {
  listing: true,
  provider: { select: { id: true, firstName: true, lastName: true, email: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.PrintOrderInclude;

@Injectable()
export class PrintService {
  constructor(
    @Inject(PrismaService)
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    @Inject(NotificationsService)
    private notificationsService: NotificationsService,
  ) {}

  getOptions() {
    return {
      sizes: TSHIRT_SIZES,
      colors: TSHIRT_COLORS,
    };
  }

  // ─── Design upload ──────────────────────────────────────────────────────────

  async uploadDesign(userId: string, dto: UploadDesignDto) {
    try {
      validateBase64Image(dto.dataBase64, dto.mimeType);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid image');
    }

    const url = toDataUrl(dto.mimeType, dto.dataBase64);

    const design = await this.prisma.printDesign.create({
      data: {
        userId,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        url,
      },
    });

    return {
      id: design.id,
      fileName: design.fileName,
      mimeType: design.mimeType,
      url: design.url,
      previewUrl: `/print/designs/${design.id}`,
      createdAt: design.createdAt.toISOString(),
    };
  }

  async getDesign(designId: string, user: AuthUserPayload) {
    const design = await this.prisma.printDesign.findUnique({ where: { id: designId } });
    if (!design) throw new NotFoundException('Design not found');
    if (design.userId !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Access denied');
    }
    return {
      id: design.id,
      fileName: design.fileName,
      mimeType: design.mimeType,
      url: design.url,
      createdAt: design.createdAt.toISOString(),
    };
  }

  // ─── Listings ───────────────────────────────────────────────────────────────

  async findListings(params?: {
    city?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const where: Prisma.PrintListingWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(params?.city && { city: { equals: params.city, mode: 'insensitive' } }),
      ...(params?.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.printListing.findMany({
        where,
        include: LISTING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.printListing.count({ where }),
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
    const listing = await this.prisma.printListing.findFirst({
      where: { id, isActive: true, deletedAt: null },
      include: LISTING_INCLUDE,
    });
    if (!listing) throw new NotFoundException('Print listing not found');
    return this.formatListing(listing);
  }

  async createListing(user: AuthUserPayload, dto: CreatePrintListingDto) {
    this.assertPrinter(user);
    const listing = await this.prisma.printListing.create({
      data: {
        providerId: user.id,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        minQuantity: dto.minQuantity ?? 1,
        city: dto.city,
        turnaroundDays: dto.turnaroundDays ?? 5,
      },
      include: LISTING_INCLUDE,
    });
    return this.formatListing(listing);
  }

  async updateListing(id: string, user: AuthUserPayload, dto: UpdatePrintListingDto) {
    const listing = await this.getListingEntity(id);
    this.assertListingOwner(listing, user);

    const updated = await this.prisma.printListing.update({
      where: { id },
      data: dto,
      include: LISTING_INCLUDE,
    });
    return this.formatListing(updated);
  }

  async getMyListings(userId: string) {
    const listings = await this.prisma.printListing.findMany({
      where: { providerId: userId, deletedAt: null },
      include: LISTING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.formatListing(l));
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────

  async createOrder(userId: string, listingId: string, dto: CreatePrintOrderDto) {
    const listing = await this.prisma.printListing.findFirst({
      where: { id: listingId, isActive: true, deletedAt: null },
    });
    if (!listing) throw new NotFoundException('Print listing not found');

    if (!TSHIRT_SIZES.includes(dto.tshirtSize as (typeof TSHIRT_SIZES)[number])) {
      throw new BadRequestException('Invalid t-shirt size');
    }

    const quantity = dto.quantity ?? 1;
    if (quantity < listing.minQuantity) {
      throw new BadRequestException(`Minimum quantity is ${listing.minQuantity}`);
    }

    const subtotal = Number(listing.price) * quantity;
    const orderNumber = generatePrintOrderNumber();

    const order = await this.prisma.printOrder.create({
      data: {
        orderNumber,
        userId,
        listingId: listing.id,
        providerId: listing.providerId,
        subtotalAmount: subtotal,
        discountAmount: 0,
        totalAmount: subtotal,
        paymentStatus: PaymentStatus.PENDING,
        status: PrintOrderStatus.PENDING,
        designUrl: dto.designUrl,
        tshirtColor: dto.tshirtColor,
        tshirtSize: dto.tshirtSize,
        quantity,
        customText: dto.customText,
        customerNotes: dto.customerNotes,
        pickupAddress: dto.pickupAddress,
        pickupPhone: dto.pickupPhone,
        pickupCity: dto.pickupCity,
      },
      include: ORDER_INCLUDE,
    });

    const payment = await this.paymentsService.createPaymentOrder(
      userId,
      subtotal,
      PaymentEntityType.PRINT_ORDER,
      order.id,
    );

    return { order: this.formatOrder(order), payment };
  }

  async confirmAfterPayment(orderId: string) {
    const order = await this.prisma.printOrder.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Print order not found');
    if (order.paymentStatus === PaymentStatus.PAID) return this.formatOrder(order);

    const updated = await this.prisma.printOrder.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.PAID, status: PrintOrderStatus.ACCEPTED },
      include: ORDER_INCLUDE,
    });

    await this.notificationsService.notifyPrintOrderUpdate(order.userId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: PrintOrderStatus.ACCEPTED,
      message: 'Your t-shirt print order is confirmed. The printer will prepare a design proof.',
    });

    await this.notificationsService.notifyPrintOrderUpdate(order.providerId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: PrintOrderStatus.ACCEPTED,
      message:
        `New print order ${order.orderNumber} — ${order.quantity}x ${order.tshirtSize} ${order.tshirtColor ?? ''}`.trim(),
    });

    return this.formatOrder(updated);
  }

  async getMyOrders(userId: string) {
    const orders = await this.prisma.printOrder.findMany({
      where: { userId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.formatOrder(o));
  }

  async getOrder(orderId: string, user: AuthUserPayload) {
    const order = await this.prisma.printOrder.findFirst({
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
    const orders = await this.prisma.printOrder.findMany({
      where: { providerId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.formatOrder(o));
  }

  async adminListOrders(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: PrintOrderStatus;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const sortOrder = params?.sortOrder ?? 'desc';

    const where: Prisma.PrintOrderWhereInput = {
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
      this.prisma.printOrder.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.printOrder.count({ where }),
    ]);

    return {
      items: items.map((o) => this.formatOrder(o)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getPrinterDashboard(providerId: string) {
    const [listings, orders, pendingReview, inProduction, shipped] = await Promise.all([
      this.prisma.printListing.count({ where: { providerId, isActive: true, deletedAt: null } }),
      this.prisma.printOrder.count({
        where: { providerId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      }),
      this.prisma.printOrder.count({
        where: { providerId, status: PrintOrderStatus.DESIGN_REVIEW, deletedAt: null },
      }),
      this.prisma.printOrder.count({
        where: { providerId, status: PrintOrderStatus.IN_PRODUCTION, deletedAt: null },
      }),
      this.prisma.printOrder.count({
        where: { providerId, status: PrintOrderStatus.SHIPPED, deletedAt: null },
      }),
    ]);

    const recentOrders = await this.prisma.printOrder.findMany({
      where: { providerId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      listingCount: listings,
      orderCount: orders,
      awaitingProofApproval: pendingReview,
      inProduction,
      shipped,
      recentOrders: recentOrders.map((o) => this.formatOrder(o)),
    };
  }

  async updateOrderStatus(orderId: string, user: AuthUserPayload, dto: UpdatePrintOrderStatusDto) {
    const order = await this.getOrderEntity(orderId);
    this.assertProviderOrAdmin(order, user);

    this.validateProviderTransition(order.status, dto.status);

    const data: Prisma.PrintOrderUpdateInput = {
      status: dto.status,
      ...(dto.providerNotes !== undefined && { providerNotes: dto.providerNotes }),
      ...(dto.proofUrl !== undefined && { proofUrl: dto.proofUrl }),
      ...(dto.trackingNumber !== undefined && { trackingNumber: dto.trackingNumber }),
      ...(dto.status === PrintOrderStatus.SHIPPED && { shippedAt: new Date() }),
      ...(dto.status === PrintOrderStatus.DELIVERED && { deliveredAt: new Date() }),
    };

    if (dto.status === PrintOrderStatus.DESIGN_REVIEW && !dto.proofUrl && !order.proofUrl) {
      throw new BadRequestException('Proof URL is required when sending to design review');
    }

    const updated = await this.prisma.printOrder.update({
      where: { id: orderId },
      data,
      include: ORDER_INCLUDE,
    });

    await this.notifyStatusChange(updated, dto.status);

    return this.formatOrder(updated);
  }

  async approveDesign(orderId: string, userId: string, dto: ApproveDesignDto) {
    const order = await this.getOrderEntity(orderId);
    if (order.userId !== userId) throw new ForbiddenException('Not your order');
    if (order.status !== PrintOrderStatus.DESIGN_REVIEW) {
      throw new BadRequestException('No design proof pending approval');
    }

    const updated = await this.prisma.printOrder.update({
      where: { id: orderId },
      data: {
        status: PrintOrderStatus.IN_PRODUCTION,
        customerNotes: dto.customerNotes ?? order.customerNotes,
      },
      include: ORDER_INCLUDE,
    });

    await this.notificationsService.notifyPrintOrderUpdate(order.providerId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: PrintOrderStatus.IN_PRODUCTION,
      message: `Customer approved design for order ${order.orderNumber}. Start printing.`,
    });

    return this.formatOrder(updated);
  }

  async rejectDesign(orderId: string, userId: string, dto: RejectDesignDto) {
    const order = await this.getOrderEntity(orderId);
    if (order.userId !== userId) throw new ForbiddenException('Not your order');
    if (order.status !== PrintOrderStatus.DESIGN_REVIEW) {
      throw new BadRequestException('No design proof pending approval');
    }

    const updated = await this.prisma.printOrder.update({
      where: { id: orderId },
      data: {
        status: PrintOrderStatus.ACCEPTED,
        proofUrl: null,
        customerNotes: dto.reason,
      },
      include: ORDER_INCLUDE,
    });

    await this.notificationsService.notifyPrintOrderUpdate(order.providerId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: PrintOrderStatus.ACCEPTED,
      message: `Design rejected for ${order.orderNumber}. Please upload a revised proof.`,
    });

    return this.formatOrder(updated);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private assertPrinter(user: AuthUserPayload) {
    if (!user.roles.includes(UserRole.PRINTER) && !user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Printer role required');
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
    const listing = await this.prisma.printListing.findFirst({
      where: { id, deletedAt: null },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  private async getOrderEntity(id: string) {
    const order = await this.prisma.printOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private validateProviderTransition(current: PrintOrderStatus, next: PrintOrderStatus) {
    const allowed: Record<PrintOrderStatus, PrintOrderStatus[]> = {
      [PrintOrderStatus.PENDING]: [],
      [PrintOrderStatus.ACCEPTED]: [PrintOrderStatus.DESIGN_REVIEW, PrintOrderStatus.CANCELLED],
      [PrintOrderStatus.DESIGN_REVIEW]: [PrintOrderStatus.ACCEPTED, PrintOrderStatus.CANCELLED],
      [PrintOrderStatus.IN_PRODUCTION]: [PrintOrderStatus.SHIPPED, PrintOrderStatus.CANCELLED],
      [PrintOrderStatus.SHIPPED]: [PrintOrderStatus.DELIVERED],
      [PrintOrderStatus.DELIVERED]: [],
      [PrintOrderStatus.CANCELLED]: [],
    };

    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(`Cannot transition from ${current} to ${next}`);
    }
  }

  private async notifyStatusChange(
    order: Prisma.PrintOrderGetPayload<{ include: typeof ORDER_INCLUDE }>,
    status: PrintOrderStatus,
  ) {
    const labels: Record<string, string> = {
      DESIGN_REVIEW: 'A design proof is ready for your approval',
      IN_PRODUCTION: 'Your order is being printed',
      SHIPPED: `Your order has shipped${order.trackingNumber ? ` — tracking ${order.trackingNumber}` : ''}`,
      DELIVERED: 'Your order has been delivered',
      CANCELLED: 'Your print order was cancelled',
    };

    const message = labels[status] ?? `Order status updated to ${status}`;
    await this.notificationsService.notifyPrintOrderUpdate(order.userId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status,
      message,
    });
  }

  private formatListing(
    listing: Prisma.PrintListingGetPayload<{ include: typeof LISTING_INCLUDE }>,
  ) {
    return {
      id: listing.id,
      providerId: listing.providerId,
      title: listing.title,
      description: listing.description,
      price: String(listing.price),
      minQuantity: listing.minQuantity,
      city: listing.city,
      turnaroundDays: listing.turnaroundDays,
      isActive: listing.isActive,
      provider: listing.provider,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    };
  }

  private formatOrder(order: Prisma.PrintOrderGetPayload<{ include: typeof ORDER_INCLUDE }>) {
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
      designUrl: order.designUrl,
      proofUrl: order.proofUrl,
      tshirtColor: order.tshirtColor,
      tshirtSize: order.tshirtSize,
      quantity: order.quantity,
      customText: order.customText,
      customerNotes: order.customerNotes,
      pickupAddress: order.pickupAddress,
      pickupPhone: order.pickupPhone,
      pickupCity: order.pickupCity,
      providerNotes: order.providerNotes,
      trackingNumber: order.trackingNumber,
      shippedAt: order.shippedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      listing: order.listing
        ? {
            id: order.listing.id,
            title: order.listing.title,
            price: String(order.listing.price),
          }
        : null,
      provider: order.provider,
      user: order.user,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
