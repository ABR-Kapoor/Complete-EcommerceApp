export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image_url: string;
  sold: boolean;
  is_sale: boolean;
  stock: number;
}
