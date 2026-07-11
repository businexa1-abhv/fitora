import { PrismaClient, ServiceCategory, TenantStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DEFAULT_SPORTS } from '../src/courts/constants/court.constants';

const prisma = new PrismaClient();

async function upsertUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: UserRole,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User already exists: ${email}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      passwordHash,
      emailVerified: true,
      roles: { create: { role } },
    },
  });

  console.log(`Seeded ${role}: ${email} / ${password}`);
  return user;
}

async function ensurePlatformTenant(ownerId: string) {
  return prisma.tenant.upsert({
    where: { slug: 'platform' },
    create: {
      name: 'FitOra Platform',
      slug: 'platform',
      brandName: 'FitOra',
      ownerId,
      status: TenantStatus.ACTIVE,
      members: { create: { userId: ownerId, role: UserRole.ADMIN } },
    },
    update: { isActive: true, deletedAt: null },
  });
}

async function ensureOwnerTenant(ownerId: string, name: string) {
  const existing = await prisma.tenant.findFirst({ where: { ownerId, deletedAt: null } });
  if (existing) return existing;

  return prisma.tenant.create({
    data: {
      name,
      slug: `owner-${ownerId.slice(0, 8)}`,
      brandName: name,
      ownerId,
      status: TenantStatus.ACTIVE,
      members: { create: { userId: ownerId, role: UserRole.COURT_OWNER } },
    },
  });
}

async function seedSports() {
  for (const sport of DEFAULT_SPORTS) {
    await prisma.sport.upsert({
      where: { slug: sport.slug },
      create: { ...sport, isActive: true },
      update: { name: sport.name, sortOrder: sport.sortOrder, isActive: true },
    });
    console.log(`Seeded sport: ${sport.name}`);
  }
}

async function seedSampleCourt(ownerId: string, tenantId: string) {
  const badminton = await prisma.sport.findUnique({ where: { slug: 'badminton' } });
  if (!badminton) return;

  const existing = await prisma.court.findFirst({
    where: { tenantId, slug: 'smash-arena-bangalore' },
  });
  if (existing) return;

  await prisma.court.create({
    data: {
      tenantId,
      ownerId,
      sportId: badminton.id,
      name: 'Smash Badminton Arena',
      slug: 'smash-arena-bangalore',
      description: 'Premium indoor badminton courts',
      address: '100 Feet Road, Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      amenities: ['Parking', 'AC', 'Changing rooms'],
      defaultSlotPrice: 500,
      approvalStatus: 'APPROVED',
      isApproved: true,
      isActive: true,
      approvedAt: new Date(),
      images: {
        create: [
          { url: 'https://cdn.fitora.com/courts/smash-1.jpg', isPrimary: true, sortOrder: 0 },
        ],
      },
    },
  });
  console.log('Seeded sample court: Smash Badminton Arena');
}

async function seedShopCatalog(tenantId: string) {
  const badminton = await prisma.sport.findUnique({ where: { slug: 'badminton' } });
  if (!badminton) return;

  const categories = [
    { name: 'Gear', slug: 'gear', sortOrder: 1 },
    { name: 'Apparel', slug: 'apparel', sortOrder: 2 },
    { name: 'Trophies', slug: 'trophies', sortOrder: 3 },
    { name: 'Accessories', slug: 'accessories', sortOrder: 4 },
  ];

  for (const cat of categories) {
    await prisma.productCategory.upsert({
      where: { tenantId_slug: { tenantId, slug: cat.slug } },
      create: { tenantId, ...cat, isActive: true },
      update: { name: cat.name, sortOrder: cat.sortOrder, isActive: true },
    });
  }

  const gear = await prisma.productCategory.findFirst({
    where: { tenantId, slug: 'gear' },
  });
  if (!gear) return;

  const products = [
    {
      name: 'Yonex Astrox 88D Pro',
      slug: 'yonex-astrox-88d-pro',
      description: 'Professional badminton racket for advanced players',
      price: 8999,
      compareAtPrice: 10999,
      stock: 25,
      sku: 'RKT-ASTROX-88D',
    },
    {
      name: 'Li-Ning Badminton Shoes',
      slug: 'li-ning-badminton-shoes',
      description: 'Non-marking court shoes with cushioned sole',
      price: 3499,
      stock: 40,
      sku: 'SHO-LN-001',
    },
    {
      name: 'Champion Trophy Cup',
      slug: 'champion-trophy-cup',
      description: 'Gold finish tournament trophy',
      price: 1299,
      stock: 15,
      sku: 'TRP-GOLD-01',
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { tenantId, slug: p.slug },
    });
    if (existing) continue;

    await prisma.product.create({
      data: {
        tenantId,
        ...p,
        categoryId: gear.id,
        sportId: badminton.id,
        isActive: true,
        isFeatured: true,
        images: {
          create: [{ url: `https://cdn.fitora.com/shop/${p.slug}.jpg`, isPrimary: true, sortOrder: 0 }],
        },
        variants: {
          create: [{ name: 'Standard', stock: p.stock, sku: `${p.sku}-STD` }],
        },
      },
    });
    console.log(`Seeded product: ${p.name}`);
  }
}

async function seedServiceListings(providerId: string, tenantId?: string) {
  const badminton = await prisma.sport.findUnique({ where: { slug: 'badminton' } });
  const cricket = await prisma.sport.findUnique({ where: { slug: 'cricket' } });

  const listings = [
    {
      category: ServiceCategory.STRINGING,
      title: 'Premium Racket Stringing',
      description: 'Yonex BG80 and BG65 restring with same-day turnaround',
      price: 450,
      city: 'Bangalore',
      sportId: badminton?.id,
      turnaroundDays: 1,
    },
    {
      category: ServiceCategory.BAT_REPAIR,
      title: 'Cricket Bat Knocking & Repair',
      description: 'Handle replacement, toe guard, and crack repair',
      price: 800,
      city: 'Bangalore',
      sportId: cricket?.id,
      turnaroundDays: 3,
    },
  ];

  for (const listing of listings) {
    const existing = await prisma.serviceListing.findFirst({
      where: { providerId, title: listing.title },
    });
    if (existing) continue;

    await prisma.serviceListing.create({
      data: {
        providerId,
        tenantId,
        category: listing.category,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        city: listing.city,
        sportId: listing.sportId,
        turnaroundDays: listing.turnaroundDays,
        isActive: true,
      },
    });
    console.log(`Seeded service listing: ${listing.title}`);
  }
}

async function main() {
  await seedSports();

  const admin = await upsertUser('admin@fitora.com', 'AdminPass123!', 'Platform', 'Admin', UserRole.ADMIN);
  const owner = await upsertUser('owner@fitora.com', 'OwnerPass123!', 'Court', 'Owner', UserRole.COURT_OWNER);
  await upsertUser('player@fitora.com', 'PlayerPass123!', 'Test', 'Player', UserRole.PLAYER);
  await upsertUser('trainer@fitora.com', 'TrainerPass123!', 'Coach', 'Ravi', UserRole.TRAINER);
  await upsertUser('printer@fitora.com', 'PrinterPass123!', 'Print', 'Shop', UserRole.PRINTER);
  await upsertUser('provider@fitora.com', 'ProviderPass123!', 'Sports', 'Pro', UserRole.SERVICE_PROVIDER);

  const platformTenant = await ensurePlatformTenant(admin.id);
  const ownerTenant = await ensureOwnerTenant(owner.id, 'Court Owner');

  const provider = await prisma.user.findUnique({ where: { email: 'provider@fitora.com' } });
  if (provider) await seedServiceListings(provider.id, ownerTenant.id);

  const printer = await prisma.user.findUnique({ where: { email: 'printer@fitora.com' } });
  if (printer) {
    const existing = await prisma.printListing.findFirst({
      where: { providerId: printer.id, title: 'Custom T-Shirt Printing' },
    });
    if (!existing) {
      await prisma.printListing.create({
        data: {
          providerId: printer.id,
          tenantId: ownerTenant.id,
          title: 'Custom T-Shirt Printing',
          description: 'High-quality DTG and screen printing for sports teams and events',
          price: 399,
          minQuantity: 1,
          city: 'Bangalore',
          turnaroundDays: 5,
          isActive: true,
        },
      });
      console.log('Seeded print listing for printer@fitora.com');
    }
  }

  const trainer = await prisma.user.findUnique({ where: { email: 'trainer@fitora.com' } });
  if (trainer) {
    await prisma.trainerProfile.upsert({
      where: { userId: trainer.id },
      create: {
        userId: trainer.id,
        bio: 'Certified badminton coach with 8 years experience.',
        yearsExperience: 8,
        specializations: ['Badminton', 'Kids training'],
        isVerified: true,
        averageRating: 4.7,
      },
      update: {},
    });

    await prisma.tenantTrainer.upsert({
      where: { tenantId_userId: { tenantId: ownerTenant.id, userId: trainer.id } },
      create: { tenantId: ownerTenant.id, userId: trainer.id },
      update: { isActive: true, deletedAt: null },
    });
  }

  await seedSampleCourt(owner.id, ownerTenant.id);
  await seedShopCatalog(platformTenant.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
