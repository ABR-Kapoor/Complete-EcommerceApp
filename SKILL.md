# AURAMART — MASTER MOBILE DEVELOPMENT SKILL

## ROLE

You are the lead product architect, senior Expo/React Native engineer, UX designer and commerce-system engineer for AuraMart.

You are working on an EXISTING AuraMart project.

AuraMart is currently an independent healthcare-commerce application and database.

DO NOT merge AuraMart into AuraSutra's database during this task.

DO NOT rebuild the existing backend unnecessarily.

DO NOT replace working commerce logic without first auditing it.

The immediate objective is:

> Convert the existing AuraMart system into a premium, production-quality, Android-first Expo mobile application while preserving its existing backend and database capabilities.

The future objective is:

> Make AuraMart capable of becoming AuraSutra's healthcare commerce layer without requiring a complete rewrite.

---

# 1. PRODUCT VISION

AuraMart is not intended to feel like a generic ecommerce store.

It is a healthcare commerce platform.

The long-term ecosystem is:

AuraSutra Patient
        ↓
Doctor
        ↓
Prescription
        ↓
AuraMart
        ↓
Healthcare Product / Medicine / Ayurvedic Product
        ↓
Order
        ↓
Delivery
        ↓
Medication / Wellness Continuity
        ↓
Doctor Follow-up

But the current implementation must remain independent.

For now:

AuraMart = standalone healthcare marketplace.

Later:

AuraMart = integrated commerce layer of AuraSutra.

Design the architecture for this future without prematurely implementing it.

---

# 2. EXISTING DATABASE — SOURCE OF TRUTH

The existing AuraMart backend/database already contains commerce-oriented entities including:

- users
- categories
- products
- cart
- cart_items
- wishlist
- wishlist_items
- addresses
- orders
- order_items
- payments
- reviews
- avatars

The existing schema already supports the fundamental commerce lifecycle:

Catalogue
→ Product
→ Cart
→ Order
→ Payment
→ Review

DO NOT create duplicate versions of these entities.

DO NOT create a second local database.

DO NOT hardcode production catalogue information.

Before changing anything, inspect:

- existing schema
- existing API/service layer
- authentication
- database queries
- RLS/security policies
- existing web UI
- product logic
- cart logic
- order logic
- payment implementation
- image/storage implementation
- existing admin functionality

Create:

/docs/AURAMART_MOBILE_AUDIT.md

before major implementation.

---

# 3. FIRST TASK — AUDIT BEFORE CODING

Before writing substantial code, inspect the existing project.

Determine:

### Frontend

- framework
- routing
- state management
- components
- theme
- responsive behaviour
- loading states
- error handling

### Backend

- API architecture
- authentication
- database client
- service layer
- payment APIs
- storage
- server functions
- validation

### Database

Map every table.

Create:

/docs/AURAMART_DATABASE_MAP.md

Example:

users
 ↓
addresses

users
 ↓
cart
 ↓
cart_items
 ↓
products

users
 ↓
wishlist
 ↓
wishlist_items
 ↓
products

users
 ↓
orders
 ↓
order_items
 ↓
products

orders
 ↓
payments

products
 ↓
reviews

Do not assume relationships.

Verify them from the actual schema.

---

# 4. MIGRATION PHILOSOPHY

The existing AuraMart system is the source of truth.

The mobile application is a new client.

Therefore:

EXISTING BACKEND
        ↓
      API / DATA LAYER
        ↓
     EXPO MOBILE
        ↓
       UI

Never:

EXPO
 ↓
direct arbitrary database writes from UI components

Keep data access behind a service/repository layer.

---

# 5. TECHNOLOGY

Use:

- Expo
- React Native
- TypeScript
- Expo Router

Use the existing backend technology where possible.

Preferred supporting technologies where compatible:

- TanStack Query
- Zustand only where necessary
- React Hook Form
- Zod
- Expo SecureStore
- Expo Notifications
- Expo Image
- Expo Linking

Do not install libraries simply because they are popular.

Every dependency must solve a real problem.

---

# 6. MOBILE ARCHITECTURE

Preferred structure:

app/
  _layout.tsx

  (auth)/
    login
    register
    forgot-password

  (tabs)/
    index
    categories
    search
    orders
    profile

  product/
    [id]

  category/
    [id]

  cart/
    index

  checkout/
    address
    payment
    review
    success

  orders/
    [id]

  wishlist/

  addresses/

components/
  ui/
  product/
  cart/
  order/
  profile/

features/
  auth/
  products/
  categories/
  cart/
  wishlist/
  orders/
  payments/
  reviews/
  addresses/

services/
  auth/
  products/
  categories/
  cart/
  wishlist/
  orders/
  payments/
  reviews/
  addresses/

store/

theme/

types/

utils/

Do not force this structure if the existing repository has a better established architecture.

Adapt rather than blindly rewrite.

---

# 7. DESIGN PRINCIPLE

AuraMart must feel like:

PREMIUM
+
HEALTHCARE
+
TRUST
+
COMMERCE
+
SIMPLICITY

It must NOT feel like:

generic Shopify clone
generic Amazon clone
cheap pharmacy website
template marketplace

The interface should communicate:

"Everything here is selected around better health and wellbeing."

---

# 8. AURAMART BRAND RELATIONSHIP

AuraMart is a product within the AuraSutra ecosystem.

Therefore:

- preserve AuraSutra visual DNA
- use the same fundamental typography family where practical
- use related spacing
- use compatible rounded surfaces
- use the same icon philosophy
- maintain premium healthcare aesthetics

BUT:

AuraMart may have its own stronger commerce personality.

AuraSutra:
clinical + connected health

AuraMart:
healthcare + discovery + commerce

They must look related, not identical.

---

# 9. NAVIGATION

Primary mobile navigation:

HOME
CATEGORIES
SEARCH
ORDERS
PROFILE

Cart should remain globally accessible.

Wishlist should be accessible from:

- product
- profile
- product discovery

Do not overload the bottom navigation with too many destinations.

---

# 10. HOME SCREEN

The home screen must NOT be a wall of products.

The hierarchy should be:

1. Header
2. Search
3. Healthcare category discovery
4. Featured products
5. Curated collections
6. Ayurvedic / wellness section
7. Popular products
8. Recently viewed
9. Trust/quality information

Possible structure:

--------------------------------
Good health starts here.
[ Search products ]

[ Ayurveda ] [ Wellness ]
[ Medicines ] [ Devices ]

Featured
[ product cards ]

Ayurvedic picks
[ product cards ]

Healthcare essentials
[ product cards ]

Popular
[ product cards ]
--------------------------------

Keep content dynamic.

Never hardcode fake product statistics.

---

# 11. SEARCH

Search must be one of the strongest parts of AuraMart.

Support:

- product name
- category
- keywords
- relevant tags if database supports them

UX:

Tap search
→ keyboard immediately opens
→ search suggestions
→ results
→ filters
→ sorting

Filters can include:

- category
- price
- availability
- rating
- discount
- brand where applicable

Do not create filters that the backend cannot support.

---

# 12. CATEGORY SYSTEM

AuraMart should eventually support healthcare-oriented categories.

Examples:

Ayurveda
Wellness
Medicines
Healthcare Devices
Personal Care
Nutrition
Home Healthcare
Health Accessories

However:

DO NOT insert these blindly into the production database.

Inspect the existing category system.

Create/update categories only through appropriate admin/database mechanisms.

Avoid generic ecommerce categories such as:

Electronics
Books
Fashion

unless the product strategy explicitly requires them.

---

# 13. PRODUCT CARD

Every product card should communicate immediately:

Product image
Product name
Price
Discount where applicable
Rating
Availability
Wishlist

Keep it visually clean.

Do not put 10 pieces of metadata on a card.

The user should understand:

WHAT
HOW MUCH
AVAILABLE?
WHY INTERESTING?

within seconds.

---

# 14. PRODUCT DETAIL

Product page should contain:

Product image gallery

Product name

Rating

Price

Discount

Availability

Description

Benefits / usage information where appropriate

Ingredients where applicable

Warnings where applicable

Quantity selector

Add to Cart

Buy Now

Wishlist

Reviews

Related products

Do not invent medical claims.

If a product has health-related claims, display only information supported by the actual catalogue/content.

---

# 15. HEALTHCARE TRUST

Healthcare commerce requires stronger trust signals than generic ecommerce.

Where verified information exists, surface:

- authenticity
- product information
- manufacturer/brand
- ingredients
- usage
- warnings
- expiry information where applicable
- seller information where applicable
- customer reviews

Do not fabricate:

"doctor approved"
"clinically proven"
"government certified"
"100% safe"

unless the underlying product data actually supports the claim.

---

# 16. AYURVEDIC PRODUCTS

Ayurvedic products are an important AuraMart category.

Design product presentation to support:

- product description
- traditional use
- ingredients
- recommended usage
- precautions
- quantity
- manufacturer
- packaging information

Do not turn traditional-use descriptions into unsupported medical guarantees.

Avoid statements such as:

"cures diabetes"

unless legally verified and explicitly permitted.

Prefer:

"traditionally used for..."

where appropriate and supported.

---

# 17. CART

Cart must be persistent.

Display:

Product
Variant
Quantity
Price
Discount
Subtotal

Then:

Delivery
Coupon
Final total

Allow:

increment quantity
decrement quantity
remove
save for later if supported

Cart state must remain consistent with backend.

Do not rely solely on local state for final pricing.

Backend must be authoritative.

---

# 18. CART VALIDATION

Before checkout:

Validate:

- product availability
- inventory
- current price
- quantity
- address eligibility
- coupon validity
- order total

If price changed:

Explain clearly.

Example:

"The price of this item has changed since you added it."

Never silently change the amount.

---

# 19. WISHLIST

Wishlist should support:

- add
- remove
- move to cart
- product availability indication

Do not duplicate wishlist logic in multiple places.

Use the existing wishlist schema.

---

# 20. ADDRESS MANAGEMENT

Support:

- add address
- edit
- delete
- select default
- choose delivery address

Use the existing addresses table.

Validate:

name
phone
address
city
state
postal code
country

Do not store unnecessary personal information.

---

# 21. CHECKOUT

Checkout should be extremely clear.

Flow:

Cart
 ↓
Address
 ↓
Order Review
 ↓
Payment
 ↓
Confirmation

At review show:

Items
Subtotal
Discount
Delivery
Final amount

CTA:

PLACE ORDER / PAY

Do not hide the final amount.

---

# 22. PAYMENT

Inspect the existing payment implementation first.

Reuse it where possible.

Never expose:

API secrets
payment private keys
service-role credentials

from Expo.

Payment confirmation must come from a trusted backend/payment verification mechanism.

Never mark an order as "paid" solely because the client says payment succeeded.

---

# 23. ORDER CREATION

Order creation should be transactional where backend architecture permits.

Expected:

Cart
 ↓
Validate
 ↓
Create order
 ↓
Create order items
 ↓
Payment
 ↓
Payment verification
 ↓
Order confirmation
 ↓
Clear cart

Avoid:

payment successful
but order missing

or:

order created
but cart remains incorrectly populated.

---

# 24. ORDER STATUS

Use a clear lifecycle.

Potential states:

PLACED
CONFIRMED
PROCESSING
SHIPPED
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
REFUNDED

Only implement states actually supported by the backend.

Do not invent logistics functionality.

---

# 25. ORDER DETAIL

Show:

Order number
Date
Items
Quantity
Price
Address
Payment status
Order status
Total

Timeline:

Placed
  ↓
Confirmed
  ↓
Processing
  ↓
Shipped
  ↓
Out for delivery
  ↓
Delivered

If a status does not exist yet:

do not fake it.

---

# 26. ORDER HISTORY

Orders screen:

Upcoming / Active
Past Orders

Each card:

Order ID
Date
Items
Total
Status

Tap:

Order detail

Provide:

Reorder

where safe and supported.

---

# 27. REVIEWS

Product review system should use existing review architecture.

Support:

rating
text
optional image if existing backend supports it

Display:

average rating
rating distribution if available
recent reviews

Do not allow arbitrary review manipulation from client.

Backend must enforce ownership/order relationship.

---

# 28. AUTHENTICATION

AuraMart is independently authenticated for now.

Do not merge AuraSutra authentication yet.

Support the existing authentication method.

The architecture must make future identity integration possible.

Future:

AuraSutra Identity
        ↓
AuraMart account

But NOT now.

---

# 29. FUTURE AURASUTRA INTEGRATION

Design interfaces so AuraMart can eventually receive:

patient_id
doctor recommendation
prescription reference
health-product recommendation

without redesigning the entire app.

Future:

Prescription
    ↓
Find on AuraMart
    ↓
Matching product
    ↓
Add to cart
    ↓
Order

But this is FUTURE.

Do not implement fake integration now.

---

# 30. FUTURE DOCTOR RECOMMENDATIONS

Future feature:

Doctor can recommend:

- medicine
- Ayurvedic product
- wellness product
- healthcare device

Patient receives:

"Recommended by your doctor"

This must be implemented later with proper permissions.

Do not expose this as a fake feature in V1.

---

# 31. FUTURE DEVICE COMMERCE

AuraMart may eventually sell connected health devices.

Future:

Purchase device
 ↓
Pair device
 ↓
AuraSutra patient
 ↓
Health data
 ↓
Doctor

Do not build this now unless an existing backend supports it.

However, keep product metadata extensible enough for future device categories.

---

# 32. PRODUCT DATA MODEL

Do not assume current schema is perfect.

Map:

products
→ categories
→ inventory
→ images
→ variants
→ reviews

If missing:

document it.

Do not silently add columns during UI development.

Create:

/docs/PRODUCT_SCHEMA_GAPS.md

if necessary.

---

# 33. ADMIN / CATALOGUE

AuraMart catalogue is controlled by the owner/admin.

Mobile app should primarily be the customer-facing experience.

Do NOT expose product creation/editing to ordinary customers.

If admin capabilities already exist elsewhere:

reuse the existing backend.

Do not build a full admin mobile app unless explicitly requested.

---

# 34. INVENTORY

Never show:

"In Stock"

unless backend data supports it.

Support:

available
low stock
out of stock

if inventory information exists.

Do not allow users to checkout unavailable products.

Backend must validate inventory again at checkout.

---

# 35. PERFORMANCE

AuraMart will contain many images.

Optimize:

- image sizes
- thumbnails
- lazy loading
- caching
- pagination
- query caching

Never load the entire catalogue on app startup.

Use pagination/infinite scrolling.

---

# 36. IMAGE HANDLING

Use Expo Image or existing image infrastructure.

Support:

placeholder
loading
failure
cached image

Never show broken image layouts.

Product images must maintain consistent aspect ratio.

---

# 37. NETWORK RESILIENCE

Healthcare commerce users may have unstable networks.

Every major operation needs:

loading
success
error
retry

Examples:

"Couldn't load products.
Try again."

"Payment verification is taking longer than expected."

Never display false success.

---

# 38. OFFLINE BEHAVIOUR

Read-only content may be cached.

Do NOT assume offline operations succeeded for:

- payment
- order
- cart synchronization
- address modification

When network is unavailable:

clearly explain it.

---

# 39. SECURITY

Never:

- put service keys inside Expo
- trust client-side prices
- trust client-side order totals
- trust client-side payment confirmation
- expose private user information
- log authentication tokens
- log payment information
- log full addresses unnecessarily

Backend is authoritative.

---

# 40. RLS / AUTHORIZATION

If backend uses database-level policies:

inspect them.

Do not disable them just to make the mobile app work.

If a query fails due to authorization:

understand and correct the permission model.

Do not bypass security.

---

# 41. ERROR HANDLING

Never show raw database errors.

Bad:

"PostgrestError 23505"

Good:

"This item is no longer available."

Use human-readable errors.

Log technical details only in development/secure monitoring.


# 42. EMPTY STATES

Every empty screen needs context.

Cart:

"Your cart is empty.
Explore healthcare essentials."

Wishlist:

"Nothing saved yet.
Save products you want to revisit."

Orders:

"No orders yet.
Explore AuraMart."

Do not leave blank screens.

---

# 43. LOADING STATES

Use skeletons instead of spinning loaders everywhere.

Product list:

product skeleton cards

Product detail:

image skeleton
text skeleton

Orders:

order skeleton

Do not freeze the UI.

---

# 44. SEARCH UX

Search should support:

recent searches
clear search
suggestions
no results

No results example:

"We couldn't find that.
Try another product name or category."

Potential future:

semantic health search

But don't implement AI search unless backend supports it.

---

# 45. NOTIFICATIONS

Prepare architecture for:

order confirmed
payment confirmed
order shipped
out for delivery
delivered
refund
promotional notifications

Respect user preferences.

Do not spam.

---

# 46. PROMOTIONS

Support existing coupon architecture if compatible.

Do not hardcode promotional percentages.

Backend determines:

validity
discount
expiry
eligibility

Client displays the result.

---

# 47. PROFILE

Profile should contain:

name
avatar
phone/email
addresses
orders
wishlist
settings
notifications
support
privacy
terms

Do not overload the screen.

---

# 48. SUPPORT

Include:

Help
Contact support
Order issue
Payment issue
Return/refund information

Use existing backend workflow where available.

---

# 49. REFUNDS

Do not invent refund rules.

Inspect existing order/payment system.

If refunds exist:

show status.

Potential:

Requested
Processing
Approved
Refunded
Rejected

Only display states supported by backend.

---

# 50. ACCESSIBILITY

Every important interactive element must have:

- accessible label
- sufficient touch target
- sufficient contrast
- screen-reader compatibility

Minimum touch target:

44 × 44 px

Support Android back navigation properly.

---

# 51. ANDROID FIRST

Test:

small Android phone
medium Android phone
large Android phone

Test:

slow 4G
unstable WiFi
keyboard
back button
permissions
notifications
image loading
screen rotation where supported

Do not assume iOS behaviour.

---

# 52. RESPONSIVE UX

Do not simply shrink desktop screens.

Design specifically for mobile.

Use:

bottom sheets
mobile-friendly filters
sticky purchase CTA
thumb-friendly controls
large product images

Avoid:

tiny buttons
desktop tables
dense navigation
hover-dependent interaction

---

# 53. PRODUCT DETAIL CTA

On product page, the purchase area should remain easy to access.

Preferred:

Add to Cart
Buy Now

For long pages, consider a compact sticky bottom CTA.

Do not obscure product information.

---

# 54. TRUST UX

Healthcare commerce requires confidence.

Possible trust section:

Authentic products
Secure checkout
Clear product information
Transparent pricing
Order tracking

Only display claims that AuraMart can substantiate.

---

# 55. ANALYTICS

Track product behaviour without unnecessarily collecting health information.

Allowed examples:

app_open
search
product_view
category_view
wishlist_add
cart_add
checkout_start
payment_start
order_success
order_cancelled

Do NOT collect medical conditions or health information as marketing analytics.

---

# 56. FUTURE PERSONALIZATION

Later AuraMart can support:

AuraSutra patient context
doctor recommendations
previous purchases
adherence
health goals

But personalization must be:

consent-aware
privacy-aware
transparent

Do not silently use medical information for marketing.

---

# 57. FUTURE HEALTHCARE COMMERCE

Design the architecture for:

Patient
 ↓
Prescription
 ↓
AuraMart
 ↓
Product matching
 ↓
Order
 ↓
Medication
 ↓
Adherence
 ↓
Doctor follow-up

This is the strategic reason AuraMart exists inside the AuraSutra ecosystem.

But V1 remains independent.

---

# 58. FUTURE INTERNATIONALIZATION

Eventually AuraMart may expand beyond India.

Keep product/address/order architecture extensible for:

currency
country
tax
shipping
language
regional catalogue
regulatory requirements

Do not hardcode Indian assumptions deep inside business logic.

India remains the initial market.

---

# 59. UI QUALITY BAR

Every screen should pass:

Is the purpose immediately obvious?

Is the primary action obvious?

Is the screen visually balanced?

Are there unnecessary elements?

Does it feel like healthcare?

Does it feel premium?

Does it feel trustworthy?

Does it feel fast?

If not, improve it.

---

# 60. DO NOT USE FAKE DATA

During development, mock data may be used temporarily.

But clearly mark:

DEV ONLY

Before production:

remove:

fake products
fake prices
fake ratings
fake orders
fake inventory
fake payment status

Do not let fake data reach production.

---

# 61. NO DEAD BUTTONS

Every visible CTA must either:

work

OR

not be shown.

Never create:

"Coming Soon"

buttons throughout the UI simply to make the application look feature-rich.

---

# 62. NO GENERIC ECOMMERCE TEMPLATE

Avoid making AuraMart look like:

Amazon clone
Flipkart clone
generic pharmacy template
generic Shopify template

The visual identity must communicate:

AuraSutra ecosystem
+
healthcare
+
premium commerce.

---

# 63. FUTURE AURASUTRA CONNECTION LAYER

Create clean interfaces such as:

AuraSutraIntegrationService

but do not connect it to the AuraSutra DB yet.

Possible future methods:

getPatientContext()
getPrescription()
getDoctorRecommendations()
linkAuraSutraAccount()
getMedicationHistory()

For now:

do not call nonexistent APIs.

Keep interfaces abstract and documented.

---

# 64. DEVELOPMENT ORDER

Build in this order:

PHASE 1
Audit existing AuraMart

PHASE 2
Authentication

PHASE 3
Theme/design system

PHASE 4
Home

PHASE 5
Categories

PHASE 6
Search

PHASE 7
Product detail

PHASE 8
Wishlist

PHASE 9
Cart

PHASE 10
Address

PHASE 11
Checkout

PHASE 12
Payment

PHASE 13
Orders

PHASE 14
Reviews

PHASE 15
Profile

PHASE 16
Notifications

PHASE 17
Performance

PHASE 18
Android QA

PHASE 19
Release preparation

---

# 65. TESTING

Every major feature must test:

Happy path
Empty state
Loading state
Error state
Unauthorized state
Network failure

Critical flow:

Login
→ Home
→ Search
→ Product
→ Wishlist
→ Cart
→ Address
→ Checkout
→ Payment
→ Order
→ Order detail
→ Review

---

# 66. PAYMENT TESTING

Test:

successful payment
failed payment
cancelled payment
network interruption
duplicate callback
payment success but order failure
order success but UI timeout

The backend must remain authoritative.

---

# 67. DATA CONSISTENCY

Test:

cart quantity synchronization

price changes

out-of-stock products

deleted products

expired coupons

duplicate orders

duplicate payment callbacks

concurrent checkout

---

# 68. RELEASE CHECKLIST

Before release:

TypeScript passes
Lint passes
Tests pass
Expo build succeeds
Android APK/AAB builds
Authentication works
Catalogue works
Search works
Cart works
Checkout works
Payment works
Orders work
Reviews work
Notifications work
No secrets exposed
No fake data
No console sensitive logs
No broken routes
No dead buttons

Create:

/docs/AURAMART_MOBILE_RELEASE_READINESS.md

with:

PASS
FAIL
BLOCKED

for each item.

---

# 69. FINAL ARCHITECTURAL RULE

Remember:

AuraMart is independent TODAY.

AuraMart is part of AuraSutra TOMORROW.

Therefore:

DO NOT integrate prematurely.

DO NOT duplicate unnecessarily.

DO NOT tightly couple.

DO build clean interfaces.

DO preserve existing commerce logic.

DO create a scalable data layer.

DO make the mobile experience excellent.

The final architecture must allow:

CURRENT:

AuraMart DB
    ↓
AuraMart Expo App

FUTURE:

AuraSutra Ecosystem
        ↓
Unified Identity
        ↓
Patient
        ↓
Doctor
        ↓
AuraMart
        ↓
Healthcare Commerce

without requiring a complete rewrite.

# FINAL PRODUCT PRINCIPLE

AuraMart should not feel like:

"another online store."

It should feel like:

"A trusted healthcare marketplace built to eventually become the commerce layer of a connected health ecosystem."

Build for that future.