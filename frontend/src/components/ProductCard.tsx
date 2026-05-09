import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import type { Product } from "../types/product";
import { Heart, Loader2, Check, Tag } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
  inCart: boolean;
  inWishlist: boolean;
  justAdded?: boolean;
  onAddToCart: (product: Product, userId?: string) => void;
  onToggleWishlist: (productId: number, userId?: string) => void;
}

export const ProductCard = ({ 
  product, 
  inWishlist, 
  justAdded, 
  onAddToCart, 
  onToggleWishlist 
}: ProductCardProps) => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stock <= 0 || loading) return;
    
    setLoading(true);
    await onAddToCart(product, user?.id);
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <article className="product-card" style={{ 
      background: "#fff", 
      padding: "0", 
      borderRadius: "24px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
      border: "1px solid #f1f5f9",
      display: "flex",
      flexDirection: "column",
      transition: "transform 0.2s ease-out",
      cursor: "pointer",
      height: "100%",
      overflow: "hidden" // Ensure image/content doesn't spill over rounded corners
    }}>
      <Link to={`/product/${product.id}`} className="product-media" style={{ 
        height: "280px", 
        width: "100%",
        display: "block",
        position: "relative"
      }}>
        <img
          src={product.image_url}
          alt={product.title}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={e => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.title)}&size=400&background=f8fafc&color=6366f1&bold=true&format=png`;
          }}
        />
        {product.is_sale && (
          <div style={{
            position: "absolute", top: 16, left: 16, background: "#ef4444", color: "#fff",
            padding: "6px 14px", borderRadius: 10, fontSize: "0.75rem", fontWeight: 800,
            display: "flex", alignItems: "center", gap: 6, boxShadow: "0 8px 20px rgba(239, 68, 68, 0.3)",
            zIndex: 10
          }}>
            <Tag size={12} fill="currentColor" /> SALE
          </div>
        )}
      </Link>

      <div className="product-body" style={{ 
        padding: "24px", 
        display: "flex", 
        flexDirection: "column", 
        gap: "14px", 
        flex: 1 
      }}>
        <div style={{ 
          alignSelf: "flex-start", 
          background: "#f0f9ff", 
          color: "#0369a1", 
          padding: "6px 16px",
          borderRadius: "12px",
          fontSize: "0.68rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.02em"
        }}>
          {product.category}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h3 style={{ 
            fontSize: "1.25rem", 
            fontWeight: 800, 
            color: "#1e293b", 
            margin: 0,
            lineHeight: 1.3
          }}>{product.title}</h3>
          
          <p style={{ 
            fontSize: "0.9rem", 
            color: "#64748b", 
            margin: 0, 
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}>
            {product.description || "Premium quality item crafted for everyday use and lasting durability."}
          </p>
        </div>

        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginTop: "auto",
          paddingBottom: "4px"
        }}>
          <span style={{ fontSize: "1.75rem", fontWeight: 900, color: "#0f172a" }}>
            ₹{product.price.toLocaleString()}
          </span>
          <div style={{ 
            fontSize: "0.72rem", 
            fontWeight: 700, 
            color: product.stock <= 0 ? "#ef4444" : "#10b981", 
            background: product.stock <= 0 ? "#fef2f2" : "#f0fdf4", 
            padding: "5px 12px", 
            borderRadius: "8px" 
          }}>
            {product.stock <= 0 ? "Out of stock" : `${product.stock} in stock`}
          </div>
        </div>

        <div className="product-actions" style={{ display: "flex", gap: "10px" }}>
          <button
            className={`btn-add-cart ${product.stock <= 0 ? "disabled" : ""}`}
            style={{ 
              flex: 1, 
              borderRadius: "14px", 
              padding: "16px", 
              fontSize: "0.95rem", 
              fontWeight: 700,
              background: product.stock <= 0 
                ? "#f1f5f9" 
                : (justAdded ? "#10b981" : "linear-gradient(135deg, #6366f1, #06b6d4)"),
              border: "none",
              color: product.stock <= 0 ? "#94a3b8" : "#fff",
              cursor: (product.stock <= 0 || loading) ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: product.stock > 0 ? "0 8px 20px rgba(99, 102, 241, 0.2)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            onClick={handleAddToCart}
            disabled={product.stock <= 0 || loading}
          >
            {loading ? <Loader2 size={18} className="spin" /> : null}
            {product.stock <= 0 ? "Sold Out" : (justAdded ? <><Check size={18} /> Added</> : (loading ? "Adding..." : "Add to Cart"))}
          </button>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              if (!isSignedIn) { navigate("/login"); return; }
              onToggleWishlist(product.id, user?.id);
            }}
            style={{ 
              width: "54px", 
              height: "54px", 
              borderRadius: "14px", 
              border: "1px solid #f1f5f9", 
              background: inWishlist ? "#fef2f2" : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0, // Ensure no padding is causing offset
              cursor: "pointer",
              transition: "all 0.2s ease",
              color: inWishlist ? "#ef4444" : "#cbd5e1",
              flexShrink: 0
            }}
          >
            <Heart 
              size={22} 
              fill={inWishlist ? "#ef4444" : "none"} 
              strokeWidth={2.5} 
              style={{ display: "block" }} // Prevent line-height issues
            />
          </button>
        </div>
      </div>
    </article>
  );
};



