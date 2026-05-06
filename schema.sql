-- Enable extensions
create extension if not exists "uuid-ossp";

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
  user_id uuid not null references auth.users(id),
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
  user_id uuid not null references auth.users(id),
  product_id bigint not null references products(id),
  created_at timestamp default now(),
  unique(user_id, product_id)
);

create table if not exists addresses (
  id bigserial primary key,
  user_id uuid not null references auth.users(id),
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
  user_id uuid not null references auth.users(id),
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
  user_id uuid not null references auth.users(id),
  product_id bigint not null references products(id),
  rating int,
  text text,
  created_at timestamp default now(),
  unique(order_id, user_id)
);

create table if not exists avatars (
  id bigserial primary key,
  user_id uuid not null references auth.users(id),
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
  ('Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 150.00, 'Electronics', 'https://via.placeholder.com/300x200?text=Wireless+Headphones', true, false),
  ('Gaming Laptop', 'High-performance laptop for gaming and productivity', 1200.00, 'Electronics', 'https://via.placeholder.com/300x200?text=Gaming+Laptop', false, false),
  ('T-Shirt', 'Cotton comfortable t-shirt', 25.00, 'Clothing', 'https://via.placeholder.com/300x200?text=T-Shirt', false, false),
  ('Coffee Maker', 'Automatic coffee maker', 80.00, 'Home', 'https://via.placeholder.com/300x200?text=Coffee+Maker', false, false),
  ('JavaScript Book', 'Learn JavaScript in 30 days', 30.00, 'Books', 'https://via.placeholder.com/300x200?text=JavaScript+Book', false, false)
on conflict do nothing;
