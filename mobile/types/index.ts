export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image_url: string;
  sold: boolean;
  is_sale: boolean;
  stock?: number;
  avg_rating?: number | null;
  review_count?: number;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  created_at?: string;
}

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
  created_at?: string;
  products: {
    title: string;
    price: number;
    image_url: string;
  };
}

export interface WishlistItem {
  product_id: number;
}

export interface Address {
  id?: number;
  user_id?: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: number;
  user_id: string;
  total_price: number;
  payment_method: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  address?: Address | null;
}

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  created_at?: string;
  products?: {
    title: string;
    image_url: string;
    category?: string;
  };
}

export interface CreateOrderPayload {
  user_id: string;
  email: string;
  name?: string;
  phone?: string;
  total_price: number;
  payment_method: string;
  status?: string;
  razorpay_payment_id?: string;
  address?: Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  items: Array<{
    product_id: number;
    quantity: number;
    price: number;
  }>;
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  status: string;
  razorpay_id: string;
  created_at?: string;
}

export interface Review {
  id: number;
  order_id: number | null;
  user_id: string;
  product_id: number;
  rating: number;
  text: string;
  created_at?: string;
  users?: {
    name: string;
    avatar_url: string | null;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  created_at?: string;
}
