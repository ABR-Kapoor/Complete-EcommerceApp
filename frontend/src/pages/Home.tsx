import { useState, useMemo } from "react";
import { useProducts } from "../hooks/useProducts";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useAuthStore } from "../store/authStore";
import { Link } from "react-router-dom";

export const Home = () => {
  const [category, setCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { products } = useProducts(category, minPrice, maxPrice, debouncedSearch);
  const addToCart = useCartStore((state) => state.addItem);
  const wishlist = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const user = useAuthStore((state) => state.user);

  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category))];
  }, [products]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">ShopHub</h1>
          <div className="flex gap-4">
            {user && user.role === "admin" && (
              <Link to="/admin" className="text-blue-600 hover:text-blue-800">
                Admin
              </Link>
            )}
            <Link to="/cart" className="text-gray-600 hover:text-gray-900">
              Cart
            </Link>
            <Link to="/orders" className="text-gray-600 hover:text-gray-900">
              Orders
            </Link>
            {user && (
              <Link to="/profile" className="text-gray-600 hover:text-gray-900">
                {user.name}
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-bold mb-4">Filters</h3>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">All</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price Range</label>
              <input
                type="range"
                min="0"
                max="10000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">
                ₹{minPrice} - ₹{maxPrice}
              </span>
            </div>
          </div>

          <div className="col-span-3">
            <div className="grid grid-cols-3 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="bg-white rounded shadow overflow-hidden hover:shadow-lg transition"
                >
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg truncate">{product.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{product.category}</p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-2xl font-bold text-gray-900">₹{product.price}</span>
                      {product.is_sale && <span className="bg-green-500 text-white px-2 py-1 text-xs rounded">Sale</span>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (user) {
                            addToCart({
                              id: product.id,
                              product_id: product.id,
                              quantity: 1,
                              title: product.title,
                              price: product.price,
                              image_url: product.image_url,
                            });
                          }
                        }}
                        className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (user) {
                            toggleWishlist(product.id);
                          }
                        }}
                        className={`px-3 py-2 rounded ${
                          wishlist.includes(product.id)
                            ? "bg-red-500 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        ♥
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
