import { useState, useMemo } from "react";
import { useProducts } from "../hooks/useProducts";
import { useWishlistStore } from "../store/wishlistStore";
import { useCartStore } from "../store/cartStore";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { products, loading } = useProducts(category, minPrice, maxPrice, search);
  const wishlistItems = useWishlistStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const debouncedSearch = useMemo(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const categories = ["Electronics", "Clothing", "Home", "Books"];
  const mostBought = products.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">ECommerce</h1>
          <div className="flex gap-4">
            {user ? (
              <>
                <Link to="/orders" className="text-blue-600">Orders</Link>
                <Link to="/profile" className="text-blue-600">Profile</Link>
                <Link to="/cart" className="text-blue-600 relative">
                  Cart
                  {useCartStore((s) => s.items.length) > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {useCartStore((s) => s.items.length)}
                    </span>
                  )}
                </Link>
              </>
            ) : (
              <Link to="/login" className="text-blue-600">Login</Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSearch();
            }}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div className="flex gap-8">
          <div className="w-48">
            <h3 className="font-bold mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat === category ? "" : cat)}
                  className={`block w-full text-left px-3 py-2 rounded ${
                    category === cat ? "bg-blue-500 text-white" : "hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <h3 className="font-bold mt-6 mb-4">Price Range</h3>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="10000"
                value={minPrice}
                onChange={(e) => setMinPrice(Number(e.target.value))}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="10000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-sm">₹{minPrice} - ₹{maxPrice}</p>
            </div>
          </div>

          <div className="flex-1">
            {mostBought.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Most Bought Products</h2>
                <div className="grid grid-cols-4 gap-4">
                  {mostBought.map((product) => (
                    <Link key={product.id} to={`/product/${product.id}`}>
                      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                        <img src={product.image_url} alt={product.title} className="w-full h-40 object-cover" />
                        <div className="p-4">
                          <h4 className="font-semibold truncate">{product.title}</h4>
                          <p className="text-lg font-bold text-blue-600">₹{product.price}</p>
                          {product.is_sale && <span className="text-green-600 text-sm font-bold">ON SALE</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold mb-4">All Products</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                    <img src={product.image_url} alt={product.title} className="w-full h-40 object-cover" />
                    <div className="p-4">
                      <Link to={`/product/${product.id}`} className="font-semibold hover:text-blue-600">
                        {product.title}
                      </Link>
                      <p className="text-gray-600 text-sm">{product.category}</p>
                      <p className="text-lg font-bold text-blue-600">₹{product.price}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => addToCart({ id: product.id, product_id: product.id, quantity: 1, title: product.title, price: product.price, image_url: product.image_url })}
                          className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className={`px-3 py-2 rounded ${wishlistItems.includes(product.id) ? "bg-red-500 text-white" : "bg-gray-200"}`}
                        >
                          ❤
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
