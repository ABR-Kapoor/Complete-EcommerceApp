# E-commerce Fullstack Application

Stack: React + FastAPI + Supabase Postgres + Razorpay

## Features

- Product listing, search, filter
- Mobile OTP login (Supabase Auth)
- Shopping cart and wishlist
- Order management (COD + Razorpay)
- Product reviews and ratings
- Admin dashboard for product and order management
- User profile with avatar upload
- Order status tracking and cancellation

## Setup

### Prerequisites

- Node.js 18+
- Python 3.9+
- Supabase account

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema (see schema.sql)
3. Enable phone auth
4. Create "ecommerce" storage bucket
5. Copy project URL and anon key

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_KEY, etc.
uvicorn main:app --reload
```

Backend runs at http://localhost:8000

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_KEY
npm run dev
```

Frontend runs at http://localhost:5173

## API Endpoints

### Products
- GET `/api/products` - List products (with filters)
- GET `/api/products/{id}` - Get product detail
- GET `/api/products/categories` - List categories
- GET `/api/products/most-bought` - Most bought products

### Cart
- GET `/api/cart/{user_id}` - Get user cart
- POST `/api/cart/{user_id}/add` - Add to cart
- PUT `/api/cart/{user_id}/update/{item_id}` - Update quantity
- DELETE `/api/cart/{user_id}/remove/{item_id}` - Remove from cart

### Wishlist
- GET `/api/wishlist/{user_id}` - Get wishlist
- POST `/api/wishlist/{user_id}/{product_id}` - Add to wishlist
- DELETE `/api/wishlist/{user_id}/{product_id}` - Remove from wishlist

### Orders
- POST `/api/orders/` - Create order
- GET `/api/orders/{user_id}` - Get user orders
- GET `/api/orders/detail/{order_id}` - Get order detail
- PUT `/api/orders/{order_id}/cancel` - Cancel order
- PUT `/api/orders/{order_id}/status` - Update order status (admin)

### Reviews
- POST `/api/reviews/` - Create review
- GET `/api/reviews/product/{product_id}` - Get product reviews
- GET `/api/reviews/order/{order_id}` - Get order reviews

### Admin
- POST `/api/admin/products` - Create product
- PUT `/api/admin/products/{id}` - Update product
- DELETE `/api/admin/products/{id}` - Delete product
- POST `/api/admin/upload/product-image/{product_id}` - Upload product image
- POST `/api/admin/upload/avatar/{user_id}` - Upload avatar
- GET `/api/admin/orders` - Get all orders

## Database Schema

See [schema.sql](schema.sql) for full database structure.

Key tables:
- users
- products
- categories
- carts, cart_items
- wishlists
- orders, order_items
- reviews
- addresses

## Order Status Flow

pending_payment → confirmed → processing → shipped → delivered

Cancellation allowed only before shipped status.

## Deployment

### Frontend (Vercel)
```bash
npm run build
# Connect GitHub repo to Vercel
```

### Backend (Render)
```bash
# Push to GitHub
# Create Render Web Service
# Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
# Add environment variables
```

### Database (Supabase)
- Already hosted

### Storage (Supabase)
- Already configured

## Env Variables

Frontend (.env.local):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=xxx
VITE_API_URL=http://localhost:8000
```

Backend (.env):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
RAZORPAY_KEY_ID=xxx (test mode)
RAZORPAY_KEY_SECRET=xxx (test mode)
```

## Running

Start both servers:
```bash
# Terminal 1 - Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Or use the start script (Unix/Mac):
```bash
chmod +x start.sh
./start.sh
```

## Testing

- Browse to http://localhost:5173
- Create account with phone OTP
- Add products to cart
- Try checkout with COD
- Admin dashboard at `/admin`

## Key Implementation Notes

- Cart and wishlist are stored in Supabase per user
- Auth state persists via localStorage
- Orders created with pending_payment status initially
- COD orders auto-confirm, Razorpay needs payment callback
- One review per order enforced in backend
- Images stored in Supabase bucket
- Admin role checked in both frontend route guard and backend
