import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useProducts } from "../hooks/useProducts";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { ProductCard } from "../components/ProductCard";
import { Navbar } from "../components/Navbar";
import { Tag, Search, X } from "lucide-react";

export const Home = () => {
  const [category, setCategory] = useState("");
  const [minPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [cartFeedback, setCartFeedback] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"" | "price_asc" | "price_desc" | "name">(""); 
  const { products: rawProducts } = useProducts(category, minPrice, maxPrice, query);
  const addToCart = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const wishlist = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<typeof products>([]);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search), 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const categories = useMemo(
    () => [...new Set(rawProducts.map((p) => p.category))],
    [rawProducts]
  );

  const products = useMemo(() => {
    let sorted = [...rawProducts];
    if (sortBy === "price_asc") sorted.sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") sorted.sort((a, b) => b.price - a.price);
    if (sortBy === "name") sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [rawProducts, sortBy]);

  const saleProducts = products.filter((p) => p.is_sale);

  useEffect(() => {
    if (products.length > 0) {
      const pick = () => {
        setFeatured([...products].sort(() => 0.5 - Math.random()).slice(0, 2));
      };
      pick();
      const interval = setInterval(pick, 15000); // Rotate every 15 seconds
      return () => clearInterval(interval);
    }
  }, [products]);

  const handleAddToCart = (product: typeof products[0]) => {
    if (!isSignedIn) { navigate("/login"); return; }
    if (product.stock <= 0) return;
    addToCart({ id: product.id, product_id: product.id, quantity: 1, title: product.title, price: product.price, image_url: product.image_url });
    setCartFeedback(product.id);
    setTimeout(() => setCartFeedback(null), 1400);
  };

  return (
    <div>
      <Navbar />


      {/* ── Hero ── */}
      <section className="hero page-section">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            New arrivals · {saleProducts.length} on sale right now
          </div>
          <h1 className="hero-title">ABR Ecommerce.</h1>
          <p className="hero-text">
            Discover {products.length} curated products. Fast checkout, real-time order tracking, and a shopping experience built for perfection.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/cart">View Cart {cartCount > 0 && `(${cartCount})`}</Link>
            <Link className="btn btn-ghost" to="/orders">Track Orders</Link>
          </div>
          <div className="hero-metrics">
            <div className="metric">
              <span className="metric-value">{products.length.toString().padStart(2, "0")}</span>
              <span className="metric-label">Products</span>
            </div>
            <div className="metric">
              <span className="metric-value">{saleProducts.length.toString().padStart(2, "0")}</span>
              <span className="metric-label">On Sale</span>
            </div>
            <div className="metric">
              <span className="metric-value">{categories.length.toString().padStart(2, "0")}</span>
              <span className="metric-label">Categories</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="vision-card">
            <div className="vision-head">
              <div>
                <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 4 }}>Featured this week</p>
                <h2 className="vision-title">Top picks</h2>
              </div>
              <span className="pill success">● live</span>
            </div>
            <div className="mini-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {featured.map((product) => (
                <Link 
                  key={product.id} 
                  to={`/product/${product.id}`} 
                  className="mini-stat" 
                  style={{ 
                    display: "flex", flexDirection: "column", gap: 8, padding: 12, 
                    background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
                    transition: "all 15s", textDecoration: "none"
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = "#6366f1"}
                  onMouseOut={e => e.currentTarget.style.borderColor = "#f1f5f9"}
                >
                  <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", background: "#f8fafc" }}>
                    <img src={product.image_url} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong style={{ fontSize: "0.95rem", color: "#1e293b" }}>₹{product.price}</strong>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.title}</span>
                  </div>
                </Link>
              ))}
            </div>
            {saleProducts.length > 0 && (
              <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.82rem", color: "#c2410c", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag size={16} /> {saleProducts.length} items on sale — don't miss out!
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Products + Filter ── */}
      <section className="section-grid">
        {/* Filter Sidebar */}
        <aside className="filter-panel">
          <div className="stack">
            <div>
              <p className="panel-copy">Discover</p>
              <h2 className="panel-title">Filter</h2>
            </div>

            <div>
              <label className="label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={14} /> Search
              </label>
              <input
                className="input"
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Category</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => setCategory("")}
                  style={{
                    padding: "7px 14px", borderRadius: 999, border: "1.5px solid",
                    fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                    borderColor: category === "" ? "#6366f1" : "#e5e7eb",
                    background: category === "" ? "#ede9fe" : "#f9fafb",
                    color: category === "" ? "#6366f1" : "#374151",
                    transition: "all 160ms ease"
                  }}
                >All</button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    style={{
                      padding: "7px 14px", borderRadius: 999, border: "1.5px solid",
                      fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                      borderColor: category === c ? "#6366f1" : "#e5e7eb",
                      background: category === c ? "#ede9fe" : "#f9fafb",
                      color: category === c ? "#6366f1" : "#374151",
                      transition: "all 160ms ease"
                    }}
                  >{c}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <label className="label" style={{ margin: 0 }}>Max Price</label>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#6366f1" }}>₹{maxPrice.toLocaleString()}</span>
              </div>
              <input className="range" type="range" min="0" max="10000" step="100" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
              <div className="row-between" style={{ marginTop: 6 }}>
                <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>₹0</span>
                <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>₹10,000</span>
              </div>
            </div>

            <div>
              <label className="label">Sort By</label>
              <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
                <option value="">Default</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {(search || category || maxPrice < 10000 || sortBy) && (
              <button className="btn btn-ghost" onClick={() => { setSearch(""); setCategory(""); setMaxPrice(10000); setSortBy(""); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <X size={16} /> Clear Filters
              </button>
            )}

            <div className="toolbar">
              <span className="pill sale">{products.length} results</span>
              <span className="pill success">{wishlist.length} saved</span>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <main>
          <div className="product-header">
            <div>
              <p className="panel-copy">Curated catalog</p>
              <h2 className="section-title">Products</h2>
            </div>
            {!isSignedIn && (
              <Link to="/login" className="btn btn-ghost" style={{ fontSize: "0.88rem" }}>Sign in to shop →</Link>
            )}
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              <div className="stack" style={{ placeItems: "center" }}>
                <p className="empty-title">No products found</p>
                <p className="empty-copy">Try a wider search or clear the filters.</p>
                <button className="btn btn-ghost" onClick={() => { setSearch(""); setCategory(""); setMaxPrice(10000); }}>Reset filters</button>
              </div>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => {
                const inCart = cartItems.some(i => i.product_id === product.id);
                const inWishlist = wishlist.includes(product.id);
                const justAdded = cartFeedback === product.id;
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    inCart={inCart}
                    inWishlist={inWishlist}
                    justAdded={justAdded}
                    onAddToCart={handleAddToCart}
                    onToggleWishlist={toggleWishlist}
                  />
                );
              })}
            </div>
          )}
        </main>
      </section>
    </div>
  );
};
