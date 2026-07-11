# FitOra — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 5, 2026  
**Owner:** Product & Engineering  

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Business Goals](#2-business-goals)
3. [User Personas](#3-user-personas)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Business Rules](#6-business-rules)
7. [Success Metrics](#7-success-metrics)
8. [MVP Scope](#8-mvp-scope)
9. [Future Scope](#9-future-scope)

---

## 1. Product Vision

### 1.1 One-Line Vision

**FitOra is India’s all-in-one sports & fitness platform — connecting players, court owners, trainers, and service providers in a single digital ecosystem.**

### 1.2 Problem Statement

Sports participation in India is growing, but the supporting infrastructure remains fragmented:

- **Players** use WhatsApp, phone calls, and cash to book courts, enroll kids in coaching, buy gear, and arrange equipment services.
- **Court owners** manage slots, memberships, and training programs manually — often across spreadsheets and messaging apps.
- **Trainers** lack digital tools for attendance, kid profiles, and parent communication.
- **Service providers** (stringing, bat repair) and **printers** (custom team apparel) operate offline with no discoverability or order tracking.
- **Platform operators** have no unified view of bookings, revenue, users, or fulfillment quality.

There is no single product that combines **venue booking, memberships, kids training, commerce, printing, and sports services** with role-specific workflows and integrated payments.

### 1.3 Solution

FitOra is a **multi-sided marketplace and operations platform** that digitizes the full sports lifecycle:

| Stakeholder | Core Value |
|-------------|------------|
| **Player** | Discover, book, pay, and manage everything in one app |
| **Court Owner** | Run courts, slots, memberships, and training programs digitally |
| **Trainer** | Manage batches, attendance, and kid progress |
| **Service Provider** | List services, receive orders, track fulfillment |
| **Printer** | Accept print jobs, share proofs, manage delivery |
| **Admin** | Govern the platform, approve venues, monitor transactions |

### 1.4 Product Principles

1. **Mobile-first, India-first** — Optimized for Indian cities, UPI/Razorpay payments, and local sports (badminton, cricket, football, tennis, swimming, gym).
2. **Role-aware UX** — Each user sees only what they need; one account can hold multiple roles.
3. **Pay-before-confirm** — Bookings, memberships, training, shop orders, and service orders require successful payment before confirmation.
4. **Court-owner autonomy** — Owners control pricing, slots, plans, and programs; admin governs quality via approval workflows.
5. **Trust & transparency** — Order status, check-in codes, attendance records, and fulfillment tracking are visible to all parties.

---

## 2. Business Goals

### 2.1 Primary Goals (Year 1)

| Goal | Description | Target |
|------|-------------|--------|
| **Supply acquisition** | Onboard court owners and trainers in launch cities | 50+ courts, 30+ trainers in 2 cities |
| **Demand generation** | Acquire active players who book or purchase | 5,000 registered players |
| **Transaction volume** | Drive paid bookings and purchases through the platform | ₹50L+ GMV in 12 months |
| **Marketplace activation** | Enable service providers and printers on the platform | 20+ service listings, 10+ print vendors |
| **Operational efficiency** | Reduce manual coordination for court owners | 80% of bookings self-serve (no phone/WhatsApp) |

### 2.2 Secondary Goals

- Build **recurring revenue** via membership plans (monthly, quarterly, annual).
- Increase **kids training enrollment** as a retention driver for families.
- Cross-sell **e-commerce and printing** to players and academies.
- Establish FitOra as the **default booking layer** for independent sports venues (not just large chains).

### 2.3 Business Model

| Revenue Stream | Mechanism |
|----------------|-----------|
| **Booking commission** | % fee on court slot bookings |
| **Membership facilitation** | Fee or revenue share on membership sales |
| **Training enrollment fee** | Fee per kids training enrollment |
| **E-commerce margin** | Margin on platform-owned inventory or commission on third-party sellers |
| **Marketplace commission** | Fee on sports services and print orders |
| **Premium listings** | Optional promoted placement for courts and service providers |
| **SaaS (future)** | Subscription for court owners (advanced analytics, multi-location) |

### 2.4 Strategic Positioning

FitOra sits at the intersection of:

- **Playo / Hudle** (court booking)
- **Academy management tools** (kids training)
- **Sports e-commerce** (Decathlon-style gear)
- **Local services marketplaces** (Urban Company-style stringing/repair)

The differentiator is **unification** — one account, one payment wallet, one order history across booking, training, shop, print, and services.

---

## 3. User Personas

### 3.1 Player — Rahul (28, Bangalore)

**Profile:** Working professional, plays badminton 2–3×/week, occasional football with friends.

**Goals:**
- Find and book courts near home/office quickly
- Get membership discounts at favorite venues
- Buy gear without visiting multiple stores

**Pain Points:**
- Calling venues to check slot availability
- No single place for bookings + gear + racket stringing
- Forgetting membership expiry dates

**FitOra Jobs-to-be-Done:**
- Browse courts by sport, city, and time
- Book and pay in under 2 minutes
- View booking history and check-in codes
- Purchase memberships and shop products

---

### 3.2 Parent — Priya (35, Mumbai)

**Profile:** Mother of two kids (ages 8 and 11), enrolls them in weekend sports coaching.

**Goals:**
- Enroll kids in structured training programs
- Track attendance and progress digitally
- Order team t-shirts for school tournaments

**Pain Points:**
- Paper registration forms and cash payments at academies
- No visibility into whether kids attended sessions
- Coordinating custom jersey printing separately

**FitOra Jobs-to-be-Done:**
- Create digital kid profiles
- Enroll in training batches and pay online
- View attendance and enrollment status
- Order custom print jobs with design upload

---

### 3.3 Court Owner — Vikram (42, Hyderabad)

**Profile:** Owns 2 badminton courts and 1 multi-sport turf; runs a small academy.

**Goals:**
- Fill empty slots and reduce no-shows
- Sell memberships for predictable revenue
- Offer kids training without managing everything manually

**Pain Points:**
- Manual slot management and double bookings
- Chasing payments and membership renewals
- No dashboard for revenue or utilization

**FitOra Jobs-to-be-Done:**
- Register courts, set pricing, generate slots
- Create membership plans (hourly, daily, monthly, quarterly, annual)
- Set up training programs and batches
- View bookings and revenue (future: analytics)

---

### 3.4 Trainer — Coach Ravi (30, Bangalore)

**Profile:** Certified badminton coach, assigned to academy batches.

**Goals:**
- See assigned batches and enrolled kids
- Mark attendance quickly after each session
- Maintain kid records without paper files

**Pain Points:**
- Paper attendance sheets
- No centralized kid medical/emergency info
- Parents asking for attendance history via WhatsApp

**FitOra Jobs-to-be-Done:**
- View assigned training batches
- Mark daily attendance per kid
- Access kid profiles (emergency contact, medical notes)

---

### 3.5 Service Provider — Arjun (38, Delhi)

**Profile:** Runs a racket stringing and cricket bat repair shop.

**Goals:**
- Get discovered by players beyond walk-in customers
- Receive and track service orders digitally
- Reduce back-and-forth on pricing and turnaround

**Pain Points:**
- No online presence beyond Google Maps
- Orders coordinated via phone/WhatsApp
- No payment guarantee before starting work

**FitOra Jobs-to-be-Done:**
- List services (stringing, bat repair, equipment repair) with pricing
- Receive paid orders with equipment details
- Update order status (accepted → in progress → completed)

---

### 3.6 Printer — Meera (33, Pune)

**Profile:** Small print shop specializing in sports team apparel and event merchandise.

**Goals:**
- Receive bulk t-shirt print orders from teams and academies
- Share design proofs before production
- Manage turnaround expectations clearly

**Pain Points:**
- Design files shared inconsistently (WhatsApp, email, USB)
- Payment disputes on custom orders
- No order pipeline view

**FitOra Jobs-to-be-Done:**
- List print services with per-piece pricing
- Receive orders with design URL, size, quantity, custom text
- Upload proof URL and update fulfillment status

---

### 3.7 Admin — Platform Operator

**Profile:** FitOra internal team member responsible for platform health.

**Goals:**
- Approve new courts before they go live
- Monitor users, bookings, payments, and orders
- Resolve disputes and enforce platform policies

**Pain Points:**
- No single admin view across modules
- Manual verification of court listings
- Limited visibility into marketplace fulfillment quality

**FitOra Jobs-to-be-Done:**
- Approve/reject court registrations
- View all users, courts, orders, and transactions
- Monitor platform KPIs (future: dashboards, alerts)

---

## 4. Functional Requirements

Requirements are grouped by module. Priority labels: **P0** (MVP-critical), **P1** (MVP-desired), **P2** (post-MVP).

---

### 4.1 Authentication & Authorization

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| AUTH-01 | User registration with email and password | P0 | All |
| AUTH-02 | Login, logout, JWT access + refresh tokens | P0 | All |
| AUTH-03 | Role assignment at registration (Player, Court Owner, Trainer, Service Provider, Printer) | P0 | All |
| AUTH-04 | Multi-role support on a single account | P1 | All |
| AUTH-05 | Admin-only login to admin dashboard | P0 | Admin |
| AUTH-06 | Role-based access control (RBAC) on all API endpoints | P0 | All |
| AUTH-07 | Email verification | P2 | All |
| AUTH-08 | Phone OTP login | P2 | All |
| AUTH-09 | Password reset flow | P1 | All |

---

### 4.2 Court Booking

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| COURT-01 | Court owner creates court (name, sport, address, city, amenities, images) | P0 | Court Owner |
| COURT-02 | Admin approves court before public visibility | P0 | Admin |
| COURT-03 | Court owner generates time slots with price | P0 | Court Owner |
| COURT-04 | Court owner blocks/unblocks slots | P1 | Court Owner |
| COURT-05 | Player browses courts by sport, city, search | P0 | Player |
| COURT-06 | Player views court detail and available slots | P0 | Player |
| COURT-07 | Player books a slot (creates pending booking) | P0 | Player |
| COURT-08 | Payment required before booking confirmation | P0 | Player |
| COURT-09 | Confirmed booking generates unique check-in code | P0 | System |
| COURT-10 | Player views booking history with status | P0 | Player |
| COURT-11 | Court owner views bookings for their courts | P1 | Court Owner |
| COURT-12 | Booking cancellation with refund policy | P2 | Player, Court Owner |
| COURT-13 | Recurring / bulk slot generation | P2 | Court Owner |
| COURT-14 | Court ratings and reviews | P2 | Player |

---

### 4.3 Membership Management

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| MEM-01 | Court owner creates membership plans (hourly, daily, monthly, quarterly, half-yearly, annual) | P0 | Court Owner |
| MEM-02 | Plans include name, description, price, benefits | P0 | Court Owner |
| MEM-03 | Player browses plans per court | P0 | Player |
| MEM-04 | Player purchases membership with payment | P0 | Player |
| MEM-05 | Membership activates on successful payment with start/end dates | P0 | System |
| MEM-06 | Player views active and expired memberships | P0 | Player |
| MEM-07 | Membership discount applied on court bookings | P1 | System |
| MEM-08 | Promo codes for membership purchase | P2 | Court Owner, Admin |
| MEM-09 | Auto-renewal reminders | P2 | System |
| MEM-10 | Membership usage analytics for court owner | P2 | Court Owner |

---

### 4.4 Kids Training Management

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| TRAIN-01 | Court owner creates training program (sport, age range, fee, description) | P0 | Court Owner |
| TRAIN-02 | Court owner creates batches within a program (schedule, capacity, assigned trainer) | P0 | Court Owner |
| TRAIN-03 | Parent creates kid profile (DOB, school, medical notes, emergency contact) | P0 | Player |
| TRAIN-04 | Parent enrolls kid in a batch | P0 | Player |
| TRAIN-05 | Payment required before enrollment activation | P0 | Player |
| TRAIN-06 | Parent views enrolled kids and enrollment status | P0 | Player |
| TRAIN-07 | Trainer views assigned batches and enrolled kids | P0 | Trainer |
| TRAIN-08 | Trainer marks daily attendance per kid | P0 | Trainer |
| TRAIN-09 | Attendance history visible to parent | P1 | Player |
| TRAIN-10 | Batch capacity enforcement | P0 | System |
| TRAIN-11 | Progress notes / skill assessments | P2 | Trainer |
| TRAIN-12 | Certificate generation on program completion | P2 | System |

---

### 4.5 Trainer Management

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| TRNR-01 | Trainer role with dedicated dashboard | P0 | Trainer |
| TRNR-02 | Trainer assigned to batches by court owner | P0 | Court Owner |
| TRNR-03 | Trainer views schedule across all assigned batches | P1 | Trainer |
| TRNR-04 | Trainer profile (bio, certifications, sports) | P2 | Trainer |
| TRNR-05 | Court owner invites/links trainer to academy | P2 | Court Owner |
| TRNR-06 | Trainer performance metrics (attendance rate, batch size) | P2 | Court Owner, Admin |

---

### 4.6 E-commerce

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| SHOP-01 | Product catalog with categories (gear, apparel, trophies, accessories) | P0 | All (browse) |
| SHOP-02 | Product detail page (price, description, stock, sport type) | P0 | Player |
| SHOP-03 | Shopping cart (add, update quantity, remove) | P0 | Player |
| SHOP-04 | Checkout with shipping address | P0 | Player |
| SHOP-05 | Payment required before order confirmation | P0 | Player |
| SHOP-06 | Stock decremented on confirmed order | P0 | System |
| SHOP-07 | Order history for player | P0 | Player |
| SHOP-08 | Admin product CRUD | P1 | Admin |
| SHOP-09 | Order fulfillment status (confirmed → shipped → delivered) | P1 | Admin |
| SHOP-10 | Product search and filters | P0 | Player |
| SHOP-11 | Wishlist | P2 | Player |
| SHOP-12 | Third-party seller onboarding | P2 | Admin |

---

### 4.7 T-shirt Printing

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| PRINT-01 | Printer creates print service listings | P0 | Printer |
| PRINT-02 | Listing includes pricing, turnaround days, city | P0 | Printer |
| PRINT-03 | Player browses print services | P0 | Player |
| PRINT-04 | Player submits print order with design URL, size, color, quantity, custom text | P0 | Player |
| PRINT-05 | Payment required before order acceptance | P0 | Player |
| PRINT-06 | Printer views incoming paid orders | P0 | Printer |
| PRINT-07 | Printer updates order status and uploads proof URL | P1 | Printer |
| PRINT-08 | Player views print order history and proof | P1 | Player |
| PRINT-09 | In-app design upload (file storage) | P2 | Player |
| PRINT-10 | Design preview / mockup before order | P2 | Player, Printer |
| PRINT-11 | Bulk pricing tiers (min quantity discounts) | P2 | Printer |

---

### 4.8 Sports Services

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| SVC-01 | Service provider creates listings (stringing, bat repair, equipment repair) | P0 | Service Provider |
| SVC-02 | Listing includes sport type, price, city, turnaround | P0 | Service Provider |
| SVC-03 | Player browses and filters services | P0 | Player |
| SVC-04 | Player books service with equipment details and pickup address | P0 | Player |
| SVC-05 | Payment required before provider acceptance | P0 | Player |
| SVC-06 | Provider views and manages incoming orders | P0 | Service Provider |
| SVC-07 | Provider updates status (accepted → in progress → completed) | P0 | Service Provider |
| SVC-08 | Player views service order history | P0 | Player |
| SVC-09 | Provider ratings and reviews | P2 | Player |
| SVC-10 | On-site pickup/delivery scheduling | P2 | Service Provider |

---

### 4.9 Admin Dashboard

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| ADM-01 | Admin login (separate app) | P0 | Admin |
| ADM-02 | Dashboard with platform summary metrics | P1 | Admin |
| ADM-03 | User list and management | P0 | Admin |
| ADM-04 | Court approval workflow | P0 | Admin |
| ADM-05 | View all bookings | P1 | Admin |
| ADM-06 | View all shop orders | P1 | Admin |
| ADM-07 | View all marketplace orders (services + print) | P1 | Admin |
| ADM-08 | Product management | P1 | Admin |
| ADM-09 | Platform configuration (commission rates, policies) | P2 | Admin |
| ADM-10 | Dispute resolution tools | P2 | Admin |
| ADM-11 | Audit logs | P2 | Admin |
| ADM-12 | Revenue and GMV reports | P2 | Admin |

---

### 4.10 Notifications

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| NOTIF-01 | Email notification on booking confirmation | P1 | Player |
| NOTIF-02 | Email notification on membership activation | P1 | Player |
| NOTIF-03 | Email notification on training enrollment | P1 | Player, Trainer |
| NOTIF-04 | Email notification on shop order confirmation | P1 | Player |
| NOTIF-05 | Email/SMS to provider on new marketplace order | P1 | Service Provider, Printer |
| NOTIF-06 | Push notifications (mobile) | P2 | All |
| NOTIF-07 | WhatsApp notifications via Business API | P2 | All |
| NOTIF-08 | In-app notification center | P2 | All |
| NOTIF-09 | Reminders: upcoming booking, membership expiry, training session | P2 | Player |
| NOTIF-10 | Admin alerts for failed payments, disputes | P2 | Admin |

---

### 4.11 Payments

| ID | Requirement | Priority | Roles |
|----|-------------|----------|-------|
| PAY-01 | Unified payment layer for all purchasable entities | P0 | System |
| PAY-02 | Razorpay integration (orders, verify, webhook) | P0 | System |
| PAY-03 | Mock payment mode for development/staging | P0 | System |
| PAY-04 | Polymorphic payment entity types (booking, membership, training, shop, marketplace) | P0 | System |
| PAY-05 | Payment status tracking (pending, paid, failed, refunded) | P0 | System |
| PAY-06 | Refund processing | P2 | Admin |
| PAY-07 | Payment history for user | P1 | Player |
| PAY-08 | Payout to court owners / providers (split payments) | P2 | System |
| PAY-09 | Invoice / receipt generation | P2 | System |
| PAY-10 | GST-compliant invoicing | P2 | System |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P01 | API response time (p95) for read endpoints | < 300ms |
| NFR-P02 | API response time (p95) for write/booking endpoints | < 500ms |
| NFR-P03 | Page load time (web, 4G) | < 3s |
| NFR-P04 | Concurrent users supported (MVP) | 500 simultaneous |
| NFR-P05 | Slot availability query under peak load | < 200ms |

### 5.2 Availability & Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A01 | Platform uptime | 99.5% (MVP), 99.9% (production) |
| NFR-A02 | Payment idempotency — no double charges | 100% |
| NFR-A03 | Booking slot locking — no double bookings | 100% |
| NFR-A04 | Database backups | Daily automated |
| NFR-A05 | Graceful degradation if payment gateway is down | Queue + retry |

### 5.3 Security

| ID | Requirement |
|----|-------------|
| NFR-S01 | Passwords hashed with bcrypt (cost ≥ 12) |
| NFR-S02 | JWT access tokens with short expiry; refresh token rotation |
| NFR-S03 | RBAC enforced on every protected endpoint |
| NFR-S04 | HTTPS everywhere in production |
| NFR-S05 | Input validation and sanitization on all API inputs |
| NFR-S06 | Rate limiting on auth endpoints |
| NFR-S07 | PCI compliance via Razorpay (no card data stored on FitOra) |
| NFR-S08 | PII encryption at rest for kid profiles and emergency contacts |
| NFR-S09 | OWASP Top 10 mitigations |

### 5.4 Scalability

| ID | Requirement |
|----|-------------|
| NFR-SC01 | Stateless API — horizontal scaling via container orchestration |
| NFR-SC02 | Database connection pooling |
| NFR-SC03 | Redis for session/cache (future) |
| NFR-SC04 | File storage via object storage (S3-compatible) for images and designs |
| NFR-SC05 | Modular monolith architecture — extractable microservices per domain |

### 5.5 Usability & Accessibility

| ID | Requirement |
|----|-------------|
| NFR-U01 | Mobile-responsive web UI (320px – 1440px+) |
| NFR-U02 | Consistent design system (Playo-inspired: green palette, card layouts, animations) |
| NFR-U03 | Role-specific dashboards with clear CTAs |
| NFR-U04 | Error messages in plain language |
| NFR-U05 | WCAG 2.1 AA compliance (target for v2) |

### 5.6 Maintainability

| ID | Requirement |
|----|-------------|
| NFR-M01 | Monorepo with shared types package |
| NFR-M02 | OpenAPI/Swagger documentation for all API endpoints |
| NFR-M03 | Environment-based configuration (dev, staging, production) |
| NFR-M04 | Database migrations via Prisma |
| NFR-M05 | Linting and type-checking in CI |

### 5.7 Compliance & Legal

| ID | Requirement |
|----|-------------|
| NFR-C01 | Terms of Service and Privacy Policy |
| NFR-C02 | Parental consent for kid profile data (COPPA-aligned practices) |
| NFR-C03 | GST registration and tax invoice support (India) |
| NFR-C04 | Data retention and deletion policy (GDPR-inspired for future expansion) |

---

## 6. Business Rules

### 6.1 Court & Booking Rules

| Rule ID | Rule |
|---------|------|
| BR-C01 | A court must be approved by admin before appearing in public search |
| BR-C02 | A slot can only be booked by one user at a time |
| BR-C03 | Booking status flow: `PENDING` → (payment) → `CONFIRMED` → `COMPLETED` / `CANCELLED` |
| BR-C04 | Check-in code is generated only after payment succeeds |
| BR-C05 | Blocked slots are not available for booking |
| BR-C06 | Court owner can only manage their own courts |

### 6.2 Membership Rules

| Rule ID | Rule |
|---------|------|
| BR-M01 | Membership duration determines start/end date calculation |
| BR-M02 | Only one active membership per plan per user at a time |
| BR-M03 | Membership activates only after payment succeeds |
| BR-M04 | Membership benefits (e.g., booking discount) apply only while `isActive = true` |
| BR-M05 | Court owner sets plan pricing; admin does not override |

### 6.3 Training Rules

| Rule ID | Rule |
|---------|------|
| BR-T01 | Kid age must fall within program min/max age range |
| BR-T02 | Enrollment blocked when batch is at max capacity |
| BR-T03 | One enrollment per kid per batch |
| BR-T04 | Enrollment activates only after payment succeeds |
| BR-T05 | Only the assigned trainer can mark attendance for their batch |
| BR-T06 | Parent can only manage their own kid profiles |

### 6.4 E-commerce Rules

| Rule ID | Rule |
|---------|------|
| BR-S01 | Cart checkout blocked if any item exceeds available stock |
| BR-S02 | Stock decremented atomically on payment confirmation |
| BR-S03 | Cart cleared after successful shop order payment |
| BR-S04 | Only paid orders appear in order history |
| BR-S05 | Inactive products are not shown in catalog |

### 6.5 Marketplace (Services & Print) Rules

| Rule ID | Rule |
|---------|------|
| BR-MK01 | Service providers can only create service-category listings (stringing, repair) |
| BR-MK02 | Printers can only create print-category listings |
| BR-MK03 | Print orders require design URL and t-shirt size |
| BR-MK04 | Order total = listing price × quantity |
| BR-MK05 | Provider can only update status on orders assigned to them |
| BR-MK06 | Order status flow: `PENDING` → (payment) → `ACCEPTED` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED` |
| BR-MK07 | Only paid orders visible to providers |

### 6.6 Payment Rules

| Rule ID | Rule |
|---------|------|
| BR-P01 | All monetary transactions go through the unified payment module |
| BR-P02 | Payment entity type determines post-payment action (confirm booking, activate membership, etc.) |
| BR-P03 | Failed payments do not change entity status from PENDING |
| BR-P04 | Duplicate payment completion is idempotent (already-paid returns existing result) |
| BR-P05 | Currency is INR for MVP |

### 6.7 Role & Access Rules

| Rule ID | Rule |
|---------|------|
| BR-R01 | A user can hold multiple roles simultaneously |
| BR-R02 | Admin role cannot be self-assigned at registration |
| BR-R03 | API endpoints enforce role checks via RBAC guards |
| BR-R04 | Users can only access their own bookings, orders, memberships, and kid profiles |
| BR-R05 | Court owners access only their courts' data; trainers access only assigned batches |

---

## 7. Success Metrics

### 7.1 North Star Metric

**Monthly Paid Transactions (MPT)** — Total count of successful payments across bookings, memberships, training, shop, and marketplace in a calendar month.

### 7.2 Acquisition Metrics

| Metric | Definition | MVP Target (6 months) |
|--------|------------|----------------------|
| Registered users | Total accounts created | 2,000 |
| Registered court owners | Court owners with ≥1 court | 30 |
| Registered trainers | Trainers with ≥1 assigned batch | 20 |
| Registered service providers | Providers with ≥1 active listing | 10 |
| Court approval rate | Approved / submitted courts | > 80% |

### 7.3 Engagement Metrics

| Metric | Definition | MVP Target |
|--------|------------|------------|
| MAU | Monthly active users (any login + action) | 800 |
| Booking conversion | Bookings / court detail views | > 15% |
| Repeat booking rate | Users with ≥2 bookings in 30 days | > 25% |
| Membership attach rate | Membership purchases / total players | > 10% |
| Training enrollment rate | Enrollments / training page views | > 8% |

### 7.4 Revenue Metrics

| Metric | Definition | MVP Target (6 months) |
|--------|------------|----------------------|
| GMV | Gross merchandise value (all paid transactions) | ₹15L |
| Avg booking value | GMV from bookings / booking count | ₹400–₹800 |
| Shop AOV | Average shop order value | ₹800+ |
| Marketplace order volume | Paid service + print orders | 100+ |
| Revenue (platform fees) | FitOra commission/fee income | ₹1.5L |

### 7.5 Operational Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Payment success rate | Successful / attempted payments | > 95% |
| Booking cancellation rate | Cancelled / confirmed bookings | < 10% |
| Marketplace fulfillment time | Avg days from payment to completed | < listed turnaround |
| Admin court approval time | Avg hours from submission to decision | < 24h |
| API error rate | 5xx responses / total requests | < 0.5% |

### 7.6 Quality Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| App crash rate | Crashes / sessions | < 0.1% |
| NPS | Net Promoter Score (quarterly survey) | > 40 |
| Support ticket volume | Tickets per 100 transactions | < 5 |
| Provider SLA adherence | Orders completed within turnaround / total | > 90% |

---

## 8. MVP Scope

### 8.1 MVP Definition

The MVP delivers a **working end-to-end platform** where all six roles can register, perform their core workflows, and complete paid transactions — across booking, memberships, training, e-commerce, printing, and sports services.

**Target launch:** 2 cities (e.g., Bangalore + Hyderabad)  
**Platforms:** Web (responsive) — mobile apps deferred  
**Payments:** Razorpay (with mock mode for dev)

### 8.2 MVP — In Scope

| Module | MVP Deliverables |
|--------|------------------|
| **Auth & RBAC** | Register, login, logout, JWT, 6 roles, role dashboards |
| **Court Booking** | Court CRUD, slot generation, browse, book, pay, check-in code, booking history |
| **Memberships** | Plan CRUD, purchase, activation, my memberships, booking discount |
| **Kids Training** | Programs, batches, kid profiles, enrollment, payment, attendance |
| **Trainer Mgmt** | Trainer dashboard, view batches, mark attendance |
| **E-commerce** | Product catalog, cart, checkout, orders, stock management |
| **T-shirt Printing** | Printer listings, design URL orders, provider dashboard, status updates |
| **Sports Services** | Service listings, book with equipment details, provider dashboard |
| **Admin Dashboard** | Login, user list, court approval, basic monitoring |
| **Payments** | Unified Razorpay layer, mock mode, all entity types |
| **Notifications** | Email on key events (booking confirm, order confirm) — minimal |

### 8.3 MVP — Explicitly Out of Scope

- Native iOS/Android apps
- WhatsApp / SMS notifications
- In-app chat between users
- Refunds and dispute management
- Split payouts to court owners / providers
- Advanced analytics and reporting
- Multi-language support
- Loyalty points / gamification
- Event/tournament management
- Live score tracking
- AI-based recommendations
- Franchise / multi-location court owner accounts
- Inventory management for court owners (beyond platform shop)

### 8.4 MVP Role Matrix (Simplified)

```
┌─────────────────────┬───────┬─────────────┬─────────┬────────┬───────────┬─────────┐
│ Capability          │ Admin │ Court Owner │ Trainer │ Player │ Svc Prov  │ Printer │
├─────────────────────┼───────┼─────────────┼─────────┼────────┼───────────┼─────────┤
│ Approve courts      │  ✓    │             │         │        │           │         │
│ Manage courts/slots │       │      ✓      │         │        │           │         │
│ Create memberships  │       │      ✓      │         │        │           │         │
│ Create training     │       │      ✓      │         │        │           │         │
│ Mark attendance     │       │             │    ✓    │        │           │         │
│ Book courts         │       │             │         │   ✓    │           │         │
│ Buy memberships     │       │             │         │   ✓    │           │         │
│ Enroll kids         │       │             │         │   ✓    │           │         │
│ Shop                │       │             │         │   ✓    │           │         │
│ Book services       │       │             │         │   ✓    │           │         │
│ List services       │       │             │         │        │     ✓     │         │
│ List print jobs     │       │             │         │        │           │    ✓    │
│ Fulfill orders      │       │             │         │        │     ✓     │    ✓    │
│ Manage users        │  ✓    │             │         │        │           │         │
└─────────────────────┴───────┴─────────────┴─────────┴────────┴───────────┴─────────┘
```

### 8.5 MVP Technical Architecture (Reference)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Web App     │  │  Admin App   │  │  API         │
│  (Next.js)   │  │  (Next.js)   │  │  (NestJS)    │
│  Port 3000   │  │  Port 3002   │  │  Port 3001   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
              ┌──────────┴──────────┐
              │  PostgreSQL + Redis │
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              │  Razorpay (Payments)│
              └─────────────────────┘
```

### 8.6 MVP Launch Checklist

- [ ] All P0 functional requirements implemented and tested
- [ ] Razorpay production keys configured
- [ ] Admin can approve courts
- [ ] End-to-end payment flow verified for all entity types
- [ ] Seed data for demo courts, products, and services
- [ ] Terms of Service and Privacy Policy published
- [ ] Basic email notifications live
- [ ] Error monitoring (e.g., Sentry) configured
- [ ] Production deployment with HTTPS
- [ ] Onboard 5 pilot court owners before public launch

---

## 9. Future Scope

### 9.1 Phase 2 — Growth (Months 4–9)

| Area | Features |
|------|----------|
| **Mobile apps** | React Native or Flutter apps for iOS and Android |
| **Notifications** | Push notifications, WhatsApp Business API, in-app notification center |
| **Payments** | Refunds, split payouts, invoices with GST |
| **Booking** | Cancellation policies, waitlists, recurring bookings |
| **Memberships** | Auto-renewal, promo codes, family plans |
| **Training** | Progress reports, skill assessments, certificates |
| **Admin** | Revenue dashboards, GMV reports, audit logs |
| **Discovery** | Court ratings/reviews, search by map/location |

### 9.2 Phase 3 — Scale (Months 10–18)

| Area | Features |
|------|----------|
| **Marketplace** | Provider ratings, SLA tracking, dispute resolution |
| **E-commerce** | Third-party sellers, academy-branded stores |
| **Print** | In-app design tool, mockup preview, bulk pricing |
| **Court Owner SaaS** | Multi-location management, advanced analytics, staff accounts |
| **Events** | Tournament creation, bracket management, registration |
| **Integrations** | Google Calendar sync, accounting exports (Tally/Zoho) |
| **Loyalty** | Points, referral program, tiered membership benefits |

### 9.3 Phase 4 — Platform (18+ Months)

| Area | Features |
|------|----------|
| **API platform** | Public API for third-party integrators |
| **White-label** | FitOra-powered booking widget for court websites |
| **AI features** | Slot demand forecasting, dynamic pricing, personalized recommendations |
| **Geographic expansion** | Tier-2/3 cities, international markets |
| **Hardware** | Check-in kiosks, QR-based court access |
| **Community** | Player matching, team formation, social feeds |
| **Insurance** | Sports injury insurance partnerships |
| **Live streaming** | Court camera integration for parents/recruiters |

### 9.4 Technical Evolution

| Phase | Architecture Direction |
|-------|----------------------|
| MVP | Modular monolith (NestJS), single PostgreSQL, Redis for cache |
| Phase 2 | Background job queue (Bull/BullMQ), email service, file storage (S3) |
| Phase 3 | Extract payment service, notification service; read replicas |
| Phase 4 | Event-driven architecture, microservices where justified by scale |

---

## Appendix A — Glossary

| Term | Definition |
|------|------------|
| **GMV** | Gross Merchandise Value — total value of transactions before fees |
| **Slot** | A time-bounded, priced bookable window on a court |
| **Batch** | A scheduled group within a training program with assigned trainer |
| **Listing** | A service or print offering created by a provider or printer |
| **Check-in code** | Unique code generated on booking confirmation for venue entry |
| **Marketplace order** | A paid request for a sports service or print job |

## Appendix B — Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-05 | Product & Engineering | Initial PRD |

---

*This document is the single source of truth for FitOra product requirements. All engineering, design, and business decisions should trace back to sections in this PRD. Updates require review from Product Owner and Engineering Lead.*
