import { useParams, useNavigate } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import api from "../lib/api";
import { Navbar } from "../components/Navbar";
import { Tag, Heart, MessageSquare, Star, Loader2, Check, BadgeCheck } from "lucide-react";

interface Review {
  id: number;
  rating: number;
  text: string;
  created_at: string;
  users?: {
    name: string;
    avatar_url: string;
  }
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading } = useProduct(Number(id));
  const { isSignedIn, user } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  
  const addToCart = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const wishlistItems = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const inCart = cartItems.some(i => product && i.product_id === product.id);

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (id) {
      api.get(`/api/reviews/product/${id}`).then((res) => setReviews(res.data)).catch(() => {});
    }
  }, [id]);

  if (loading) return (
    <div className="empty-state page-section">
      <div className="stack" style={{ placeItems: "center" }}>
        <Loader2 className="spin" size={48} color="var(--accent)" />
        <p className="empty-title" style={{ fontSize: "1.4rem", marginTop: 24 }}>Loading product…</p>
      </div>
    </div>
  );

  if (!product) return (
    <div className="empty-state page-section">
      <div className="stack" style={{ placeItems: "center" }}>
        <p className="empty-title">Product not found</p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>← Back to Shop</button>
      </div>
    </div>
  );

  const handleAddToCart = () => {
    if (!isSignedIn) { navigate("/login"); return; }
    if (!product || product.stock <= 0) return;
    const finalQty = Math.min(quantity, product.stock);
    addToCart({ 
      id: Date.now(), 
      product_id: product.id, 
      quantity: finalQty, 
      title: product.title, 
      price: product.price, 
      image_url: product.image_url 
    }, user?.id);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleSubmitReview = async () => {
    if (!isSignedIn) { navigate("/login"); return; }
    if (!reviewText) return;
    setSubmittingReview(true);
    try {
      const response = await api.post(`/api/reviews/?user_id=${user?.id}`, {
        order_id: 0, 
        product_id: product.id,
        rating: reviewRating,
        text: reviewText
      });
      
      if (response.data.error) {
        alert(`Error: ${response.data.error}`);
        return;
      }

      setReviewText("");
      setReviewRating(5);
      setReviewSubmitted(true);
      
      // Real-time re-fetch
      const res = await api.get(`/api/reviews/product/${product.id}`);
      setReviews(res.data);
    } catch (err) {
      console.error("Review submission failed", err);
      alert("Network Error: Could not reach the server.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", minHeight: "100vh" }}>
      <Navbar />
      
      <main className="page-section" style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 80 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 48 }}>
          {/* Product Image - High-Density Style */}
          <div style={{ position: "sticky", top: 100, alignSelf: "start" }}>
            <div style={{ 
              borderRadius: 24, 
              overflow: "hidden", 
              background: "#f8fafc", 
              boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
              border: "1px solid #f1f5f9"
            }}>
              <img 
                src={product.image_url} 
                alt={product.title} 
                style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&size=800&background=e0e7ff&color=6366f1&bold=true`; }}
              />
            </div>
          </div>

          {/* Product Details - Efficient Layout */}
          <div className="stack" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 6 }}>
              <div style={{ display: "flex", gap: 5 }}>
                <span style={{ height: 24, padding: "0 10px", borderRadius: 8, background: "#f1f5f9", color: "#64748b", fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{product.category}</span>
                {product.is_sale && <span style={{ height: 24, padding: "0 10px", borderRadius: 8, background: "#fef2f2", color: "#ef4444", fontWeight: 700, fontSize: "0.65rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Tag size={10} /> FLASH SALE</span>}
              </div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#1e293b", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{product.title}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                 <div style={{ display: "flex", color: "#f59e0b" }}>
                   {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                 </div>
                 <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "0.8rem" }}>{reviews.length} Verified Reviews</span>
              </div>
            </div>

            <p style={{ fontSize: "1rem", color: "#64748b", lineHeight: 1.5 }}>
              {product.description || "Experience the pinnacle of craftsmanship. This curated essential combines innovative design with premium materials for a truly exceptional daily companion."}
            </p>

            <div style={{ padding: 28, background: "#fff", borderRadius: 28, boxShadow: "0 10px 40px rgba(0,0,0,0.04)", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.03em" }}>₹{(product.price || 0).toLocaleString()}</span>
                <span style={{ fontSize: "1.1rem", color: "#cbd5e1", textDecoration: "line-through", fontWeight: 600 }}>₹{((product.price || 0) * 1.2).toLocaleString()}</span>
              </div>

              <div className="stack" style={{ gap: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", padding: "4px", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: "1.4rem", color: "#64748b", display: "grid", placeItems: "center", padding: 0 }}>
                      <span style={{ lineHeight: 0, marginTop: -4 }}>-</span>
                    </button>
                    <span style={{ minWidth: 40, textAlign: "center", fontWeight: 700, fontSize: "1.1rem", color: "#1e293b" }}>{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(product.stock || 0, quantity + 1))} style={{ width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: "1.4rem", color: "#64748b", display: "grid", placeItems: "center", padding: 0 }}>
                      <span style={{ lineHeight: 0, marginTop: -2 }}>+</span>
                    </button>
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: (product.stock || 0) < 5 ? "#ef4444" : "#10b981" }}>
                    {(product.stock || 0)} Units Available
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={handleAddToCart}
                    disabled={(product.stock || 0) <= 0}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "18px", borderRadius: 20, fontSize: "1.1rem", fontWeight: 800, border: "none", boxShadow: "0 10px 25px rgba(99, 102, 241, 0.25)" }}
                  >
                    {added ? "Success!" : (inCart ? "Update Bag" : "Add to Bag")}
                  </button>
                  <button
                    onClick={() => { if (!isSignedIn) { navigate("/login"); return; } toggleWishlist(product.id, user?.id); }}
                    style={{ 
                      width: 60, height: 60, borderRadius: 20, border: "1px solid #f1f5f9", 
                      background: wishlistItems.includes(product.id) ? "#fef2f2" : "#fff",
                      color: wishlistItems.includes(product.id) ? "#ef4444" : "#cbd5e1",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                    }}
                  >
                    <Heart size={26} fill={wishlistItems.includes(product.id) ? "#ef4444" : "none"} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section - Ultra-Compact Style */}
        <section style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #f1f5f9", paddingBottom: 48, maxWidth: 800 }}>
          <div style={{ marginBottom: 32 }}>
             {/* Rating Analytics Header */}
             <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
               <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>{reviews.length} Community Reviews</h2>
               {reviews.length > 0 && (
                 <>
                   <div style={{ width: 1, height: 16, background: "#e2e8f0" }} />
                   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                        <span style={{ fontWeight: 900, color: "#1e293b", fontSize: "1.1rem" }}>
                          {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
                        </span>
                      </div>
                      <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 700 }}>/ 5.0 AVG</span>
                   </div>
                 </>
               )}
             </div>
             
             {/* Write Review Area */}
             {!reviewSubmitted ? (
               <div style={{ display: "flex", gap: 16 }}>
                 <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "1rem", flexShrink: 0, overflow: "hidden" }}>
                    {user?.imageUrl ? <img src={user.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (user?.firstName?.[0] || "U")}
                 </div>
                 <div style={{ flex: 1 }}>
                   <div style={{ borderBottom: "1px solid #f1f5f9", transition: "all 0.3s", paddingBottom: 8 }}>
                     <textarea
                       placeholder="Add a public review..."
                       value={reviewText}
                       onChange={(e) => setReviewText(e.target.value)}
                       style={{ 
                         width: "100%", background: "transparent", border: "none", outline: "none", 
                         fontSize: "0.9rem", color: "#1e293b", resize: "none", minHeight: 36, fontFamily: "inherit", lineHeight: 1.5
                       }}
                       onFocus={(e) => (e.currentTarget.parentElement!.style.borderBottom = "1px solid #1e293b")}
                       onBlur={(e) => (e.currentTarget.parentElement!.style.borderBottom = "1px solid #f1f5f9")}
                     />
                   </div>
                   
                   <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                         {[1,2,3,4,5].map(num => (
                           <button key={num} onClick={() => setReviewRating(num)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2 }}>
                             <Star size={16} fill={reviewRating >= num ? "#f59e0b" : "none"} color={reviewRating >= num ? "#f59e0b" : "#e2e8f0"} />
                           </button>
                         ))}
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => setReviewText("")} style={{ background: "transparent", border: "none", color: "#94a3b8", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>Cancel</button>
                        <button 
                          onClick={handleSubmitReview}
                          disabled={!reviewText || submittingReview}
                          style={{ 
                            background: reviewText ? "#1e293b" : "#f8fafc", 
                            color: reviewText ? "#fff" : "#cbd5e1", 
                            padding: "8px 20px", borderRadius: 12, border: "none", fontWeight: 800, fontSize: "0.85rem", cursor: reviewText ? "pointer" : "default"
                          }}
                        >
                          {submittingReview ? <Loader2 size={16} className="spin" /> : "Review"}
                        </button>
                      </div>
                   </div>
                 </div>
               </div>
             ) : (
               <div style={{ background: "#f0fdf4", padding: "12px 20px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}>
                 <Check size={16} color="#10b981" />
                 <span style={{ color: "#065f46", fontWeight: 700, fontSize: "0.9rem" }}>Review published.</span>
                 <button onClick={() => setReviewSubmitted(false)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#059669", fontWeight: 800, cursor: "pointer", fontSize: "0.85rem" }}>Post Another</button>
               </div>
             )}

             <div style={{ height: 1, background: "#f1f5f9", margin: "24px 0" }} />

             {/* Comments List */}
             <div className="stack" style={{ gap: 32 }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ display: "flex", gap: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f8fafc", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 800, fontSize: "0.85rem", flexShrink: 0 }}>
                      {r.users?.avatar_url ? <img src={r.users.avatar_url} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : r.users?.name?.[0] || "U"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#1e293b" }}>@{r.users?.name?.replace(/\s+/g, '').toLowerCase() || "user"}</span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{new Date(r.created_at).toLocaleDateString()}</span>
                        <BadgeCheck size={14} color="#10b981" fill="#f0fdf4" style={{ marginLeft: 4 }} />
                        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} fill={i < r.rating ? "#f59e0b" : "none"} color={i < r.rating ? "#f59e0b" : "#f1f5f9"} />
                          ))}
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: "#475569", lineHeight: 1.5 }}>{r.text}</p>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "#cbd5e1" }}>
                    <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <p style={{ fontWeight: 700 }}>Be the first to review.</p>
                  </div>
                )}
             </div>
          </div>
        </section>
      </main>
    </div>
  );
}
