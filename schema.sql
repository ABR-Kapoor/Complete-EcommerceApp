-- Enable extensions
create extension if not exists "uuid-ossp";

-- Drop everything first (clean slate)
drop table if exists avatars cascade;
drop table if exists reviews cascade;
drop table if exists payments cascade;
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists addresses cascade;
drop table if exists wishlists cascade;
drop table if exists cart_items cascade;
drop table if exists carts cascade;
drop table if exists products cascade;
drop table if exists categories cascade;
drop table if exists users cascade;

-- Tables
create table if not exists users (
  id text primary key, -- Clerk User ID
  name text,
  email text unique,
  phone text,
  avatar_url text,
  role text default 'user',
  created_at timestamp default now()
);

-- Tables
create table if not exists categories (
  id bigserial primary key,
  name text unique not null,
  created_at timestamp default now()
);

create table if not exists products (
  id bigserial primary key,
  title text not null,
  description text,
  price decimal(10, 2) not null,
  category text not null,
  image_url text,
  sold boolean default false,
  is_sale boolean default false,
  created_at timestamp default now()
);

create table if not exists carts (
  id bigserial primary key,
  user_id text not null references users(id),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists cart_items (
  id bigserial primary key,
  cart_id bigint not null references carts(id) on delete cascade,
  product_id bigint not null references products(id),
  quantity int default 1,
  created_at timestamp default now()
);

create table if not exists wishlists (
  id bigserial primary key,
  user_id text not null references users(id),
  product_id bigint not null references products(id),
  created_at timestamp default now(),
  unique(user_id, product_id)
);

create table if not exists addresses (
  id bigserial primary key,
  user_id text not null references users(id),
  street text,
  city text,
  state text,
  zip_code text,
  phone text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(user_id)
);

create table if not exists orders (
  id bigserial primary key,
  user_id text not null references users(id),
  total_price decimal(10, 2),
  payment_method text,
  status text default 'pending_payment',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_id bigint not null references products(id),
  quantity int,
  price decimal(10, 2),
  created_at timestamp default now()
);

create table if not exists payments (
  id bigserial primary key,
  order_id bigint not null references orders(id),
  amount decimal(10, 2),
  status text,
  razorpay_id text,
  created_at timestamp default now()
);

create table if not exists reviews (
  id bigserial primary key,
  order_id bigint not null references orders(id),
  user_id text not null references users(id),
  product_id bigint not null references products(id),
  rating int,
  text text,
  created_at timestamp default now(),
  unique(order_id, user_id)
);

create table if not exists avatars (
  id bigserial primary key,
  user_id text not null references users(id),
  url text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(user_id)
);

-- Indexes
create index idx_products_category on products(category);
create index idx_products_title on products(title);
create index idx_orders_user_id on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_cart_items_cart_id on cart_items(cart_id);
create index idx_wishlists_user_id on wishlists(user_id);
create index idx_reviews_order_id on reviews(order_id);
create index idx_reviews_product_id on reviews(product_id);

-- Insert sample categories
insert into categories (name) values ('Electronics'), ('Clothing'), ('Home'), ('Books') on conflict do nothing;

-- Insert sample products
insert into products (title, description, price, category, image_url, is_sale, sold) values
  ('Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 150.00, 'Electronics', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000', true, false),
  ('Gaming Laptop', 'High-performance laptop for gaming and productivity', 1200.00, 'Electronics', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&q=80&w=1000', false, false),
  ('T-Shirt', 'Cotton comfortable t-shirt', 25.00, 'Clothing', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000', false, false),
  ('Coffee Maker', 'Automatic coffee maker', 80.00, 'Home', 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&q=80&w=1000', false, false),
  ('JavaScript Book', 'Learn JavaScript in 30 days', 30.00, 'Books', 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&q=80&w=1000', false, false)
on conflict do nothing;

-- Enable RLS
alter table users enable row level security;
alter table products enable row level security;
alter table categories enable row level security;
alter table orders enable row level security;
alter table cart_items enable row level security;
alter table wishlists enable row level security;
alter table reviews enable row level security;

-- Public read policies
create policy "Allow public read products" on products for select to anon, authenticated using (true);
create policy "Allow public read categories" on categories for select to anon, authenticated using (true);

-- User policies
create policy "Allow users to read their own profile" on users for select to authenticated using (id = auth.uid()::text);
create policy "Allow users to read their own orders" on orders for select to authenticated using (user_id = auth.uid()::text);
create policy "Allow users to create orders" on orders for insert to authenticated with check (user_id = auth.uid()::text);
create policy "Allow users to manage their cart" on cart_items for all to authenticated using (exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()::text));

