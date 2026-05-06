import { useParams, useNavigate } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useAuthStore } from "../store/authStore";
import { useState, useEffect } from "react";
import api from "../lib/api";

interface Review {
  id: number;
  rating: number;
  text: string;
  created_at: string;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading } = useProduct(Number(id));
  const user = useAuthStore((state) => state.user);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quantity, setQuantity] = useState(1);
  const addToCart = useCartStore((state) => state.addItem);
  const wishlistItems = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  useEffect(() => {
    if (id) {
      api.get(`/api/reviews/product/${id}`).then((res) => setReviews(res.data));
    }
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!product) return <p>Product not found</p>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate("/")} className="text-blue-600 mb-4">← Back</button>
      
      <div className="grid grid-cols-2 gap-8">
        <img src={product.image_url} alt={product.title} className="w-full rounded-lg" />
        
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
          <p className="text-gray-600 mb-4">{product.category}</p>
          <p className="text-3xl font-bold text-blue-600 mb-4">₹{product.price}</p>
          {product.is_sale && <span className="bg-green-500 text-white px-3 py-1 rounded">ON SALE</span>}
          
          <p className="text-gray-700 mb-6">{product.description}</p>
          
          <div className="flex gap-4 mb-6">
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-20 px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                if (!user) {
                  navigate("/login");
                  return;
                }
                addToCart({
                  id: product.id,
                  product_id: product.id,
                  quantity,
                  title: product.title,
                  price: product.price,
                  image_url: product.image_url,
                });
              }}
              className="flex-1 bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700"
            >
              Add to Cart
            </button>
            <button
              onClick={() => {
                if (!user) {
                  navigate("/login");
                  return;
                }
                toggleWishlist(product.id);
              }}
              className={`px-6 py-3 rounded font-semibold ${
                wishlistItems.includes(product.id)
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              ❤
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Reviews</h2>
        {reviews.length === 0 ? (
          <p>No reviews yet</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div className="text-yellow-500">{"⭐".repeat(review.rating)}</div>
                  <span className="text-gray-500 text-sm">{review.created_at}</span>
                </div>
                <p>{review.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
