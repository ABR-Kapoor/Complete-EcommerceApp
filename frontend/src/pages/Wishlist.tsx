import { useWishlistStore } from "../store/wishlistStore";
import { useProducts } from "../hooks/useProducts";
import type { Product } from "../types/product";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { ProductCard } from "../components/ProductCard";
import { Navbar } from "../components/Navbar";

export const Wishlist = () => {
  const { items: wishlistIds, toggle } = useWishlistStore();
  const { products } = useProducts();
  const navigate = useNavigate();
  const addToCart = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

  const favoriteProducts = products.filter((p) => wishlistIds.includes(p.id));

  const handleAddToCart = (product: Product) => {
    addToCart({ ...product, product_id: product.id, quantity: 1 });
  };

  return (
    <div className="app-shell" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <div className="shell-glow" />
      <Navbar />


      <main className="page-section">
        <div style={{ marginBottom: 40 }}>
          <h1 className="section-title" style={{ fontSize: "2.5rem", fontWeight: 800 }}>Wishlist</h1>
          <p className="muted" style={{ fontWeight: 600 }}>{favoriteProducts.length} items saved in your collection</p>
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="empty-state">
            <div className="stack" style={{ placeItems: "center" }}>
              <p className="empty-title">Your wishlist is empty</p>
              <button className="btn btn-primary" onClick={() => navigate("/")}>Explore Products</button>
            </div>
          </div>
        ) : (
          <div className="product-grid" style={{ gap: 24 }}>
            {favoriteProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                inCart={cartItems.some(i => i.product_id === product.id)}
                inWishlist={true}
                onAddToCart={handleAddToCart}
                onToggleWishlist={toggle}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
