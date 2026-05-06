# E-commerce Fullstack App PRD

## 1. Product Summary

Build a modern e-commerce web app based on the assignment brief, using React for the frontend, FastAPI for the backend, Supabase Postgres for the database, Supabase Storage for product images and user avatars, Supabase Auth for mobile OTP login, and Razorpay test mode for online payments.

The app must support customer shopping flows, admin product management, cart and wishlist management, order placement, product reviews, ratings, and a clean bold UI that can be delivered quickly.

## 2. Goals

- Deliver the assignment requirements in a simpler, modern stack.
- Keep the build fast and maintainable.
- Use Supabase for auth, database, and storage to reduce custom infrastructure.
- Support both customer and admin workflows in one React app.
- Keep the implementation practical and standard for e-commerce behavior.

## 3. Recommended Stack

- Frontend: React
- Backend: FastAPI
- Database: Supabase Postgres
- Auth: Supabase Auth with mobile OTP
- Storage: Supabase Storage
- Payments: Razorpay test mode
- Admin panel: same React app under `/admin`

## 4. Product Scope

### Customer Features

- Mobile OTP login via Supabase Auth.
- Product listing page with grid layout.
- Category filter from sidebar.
- Price range filter.
- Debounced search by product title.
- Product details page by ID.
- Add to cart, update quantity, remove from cart.
- Checkout flow with COD or Razorpay.
- Order history page.
- Order cancellation before shipped only.
- Wishlist saved against the logged-in user in the database.
- One review per order from the logged-in user.
- User avatar upload and profile update.

### Admin Features

- Same login flow as users, with admin role from database.
- Access restricted to `/admin`.
- Product CRUD.
- Manage product images.
- Manage orders and update order status.
- View customer activity and order data.
- Moderate reviews if needed.

## 5. Assignment Coverage

The app will cover the brief as follows:

- Product listing and details: yes.
- Filters and search: yes.
- Cart system: yes.
- Order management: yes.
- Mobile OTP login: yes.
- Most bought products section: yes.
- Seed data from JSON: yes.
- Payment method: COD and Razorpay test mode.
- Wishlist: yes.
- Reviews and ratings: yes.
- Admin panel: yes.

## 6. Standard E-commerce Behavior

The order lifecycle should be standard and easy to understand:

- `pending_payment`: order created but payment not completed yet.
- `confirmed`: payment received or COD order accepted.
- `processing`: order is being prepared.
- `shipped`: order handed to courier.
- `delivered`: order completed.
- `cancelled`: order cancelled before shipping.
- `refunded`: payment was completed and the order was cancelled before shipping, so the system records refund state.

Rule set:

- COD orders can move to `confirmed` after placement.
- Razorpay orders move to `confirmed` only after payment success.
- Cancellation is allowed only before `shipped`.
- If a paid order is cancelled before shipping, the order should move into refund handling state.

## 7. Core User Flows

### Guest to Customer

1. Open product listing.
2. Search or filter products.
3. View product details.
4. Log in with mobile OTP.
5. Add product to cart.
6. Add product to wishlist.
7. Checkout with COD or Razorpay.
8. View order history.
9. Cancel order if still eligible.
10. Leave one review per order.

### Admin Flow

1. Log in using the same auth screen.
2. Database role check marks the user as admin.
3. Open `/admin`.
4. Create, update, and delete products.
5. Upload product images.
6. Review and update orders.
7. Inspect reviews and ratings.

## 8. Functional Requirements

### Authentication

- Mobile OTP login through Supabase only.
- Store authenticated user session in the frontend.
- Use role-based access for admin features.

### Products

- Fetch all products.
- Filter by category, sold status, and price range.
- Search by title.
- View product detail by ID.
- Show sale badge.
- Show most bought products section.
- Support seed data import from JSON.

### Cart

- Add to cart.
- Increase and decrease quantity.
- Remove from cart.
- Save cart per user in backend storage.

### Wishlist

- Save wishlist items per user in the database.
- Allow wishlist only after login.

### Orders

- Place order.
- Store one address per user.
- Support COD and Razorpay.
- Show order summary with total, quantity, and date.
- Allow cancellation before shipped only.
- Track standard status transitions.

### Reviews and Ratings

- Allow one review per order.
- Store rating and text review.
- Show reviews on product detail page.

### Admin

- Product CRUD.
- Order management.
- Status updates.
- User/admin role control.

### Uploads

- Store product images in Supabase bucket.
- Store user avatars in Supabase bucket.
- Keep upload flow simple and quick.

## 9. Data Model Overview

The database should be modeled around these core entities:

- users
- roles
- products
- categories
- product_images
- carts
- cart_items
- wishlists
- orders
- order_items
- payments
- reviews
- addresses
- avatars

## 10. Non-Functional Requirements

- Fast initial load.
- Responsive desktop and mobile layout.
- Clean API design.
- Simple maintainable folder structure.
- Minimal custom infrastructure.
- English only UI.

## 11. UI Direction

- Bold modern look.
- Fast to build.
- Clear typography and strong product cards.
- Prominent filters and checkout actions.
- `/admin` should use a clean dashboard layout.

## 12. Simplifying Decisions

- Use Supabase for auth, database, and storage.
- Use same login for user and admin.
- Use one address per user.
- Skip tax and shipping fee.
- Keep payment integration limited to Razorpay test mode and COD.
- Keep image optimization simple unless later needed for performance.

## 13. Out of Scope For First Build

- Multi-address checkout.
- Tax calculations.
- Shipping fee engine.
- Multi-language support.
- Guest wishlist.
- Complex refunds workflow UI.
- Advanced recommendation engine.

## 14. Acceptance Criteria

- User can log in with mobile OTP.
- User can browse, search, and filter products.
- User can manage cart and wishlist.
- User can place COD or Razorpay order.
- User can see order history and cancel before shipping.
- User can submit one review per order.
- Admin can manage products and orders from `/admin`.
- Product images and avatars are stored in Supabase bucket.
- App uses React, FastAPI, Supabase Postgres, and Supabase storage/auth.

## 15. Risks And Notes

- Razorpay test integration should be confirmed early because payment callbacks affect order state.
- Admin role rules must be enforced both in backend and frontend.
- Wishlist, cart, and orders should all be tied to the authenticated user ID.
- The most bought products section depends on order quantity aggregation and should be verified with seeded data.
