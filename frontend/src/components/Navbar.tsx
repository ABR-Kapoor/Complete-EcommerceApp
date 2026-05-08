import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useCartStore } from "../store/cartStore";
import { useUserStore } from "../store/userStore";
import { useEffect, useState } from "react";
import ProfileModal from "./ProfileModal";
import { ShoppingCart, Package, Zap } from "lucide-react";



interface NavbarProps {
  adminMode?: boolean;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
}

export const Navbar = ({ adminMode, activeTab, onTabChange }: NavbarProps) => {
  const { user, isSignedIn } = useUser();
  const { profile, fetchProfile, loading: profileLoading } = useUserStore();
  const cartItems = useCartStore((state) => state.items);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Consider it admin if the profile says so AND we aren't currently loading a stale state
  const isAdmin = profile?.role === "admin" && !profileLoading;

  useEffect(() => {
    if (user?.id) fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      
      <header className="topbar">
        <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <div className="brand-mark">A</div>
          <div className="brand-copy">
            <span className="brand-name">ABR Ecommerce</span>
            <span className="brand-tag">Premium shopping, crafted for you</span>
          </div>
        </div>

        <nav className="nav-links">
          {adminMode ? (
            <>
              {(["dashboard", "products", "orders", "users"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onTabChange?.(t)}
                  className={`nav-link ${activeTab === t ? "active" : ""}`}
                  style={{ textTransform: "capitalize" }}
                >
                  {t}
                </button>
              ))}
              <div className="nav-divider" />
              <button 
                className="btn-login" 
                onClick={() => navigate("/")}
                style={{ background: "#f1f5f9", color: "#64748b" }}
              >
                Exit Admin
              </button>
            </>
          ) : (
            <>
              <Link className={`nav-link ${isActive("/") ? "active" : ""}`} to="/">Shop</Link>
              <Link className={`nav-link ${isActive("/wishlist") ? "active" : ""}`} to="/wishlist">Favorites</Link>
              
              {isAdmin && (
                <Link className={`nav-link admin-pill ${isActive("/admin") ? "active" : ""}`} to="/admin">
                  <Zap size={16} fill="currentColor" /> Admin
                </Link>
              )}

              <div className="nav-divider" />

              <Link className={`nav-link-icon ${isActive("/cart") ? "active" : ""}`} to="/cart">
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShoppingCart size={20} />
                  <span className="nav-label">Cart</span>
                  {cartCount > 0 && (
                    <span className="cart-badge">{cartCount}</span>
                  )}
                </div>
              </Link>

              <Link className={`nav-link-icon ${isActive("/orders") ? "active" : ""}`} to="/orders">
                <Package size={20} />
                <span className="nav-label">Orders</span>
              </Link>

              {!isSignedIn ? (
                <Link className="btn-login" to="/login">Sign In</Link>
              ) : (
                <button
                  className="nav-avatar-btn"
                  onClick={() => setShowProfile(true)}
                  title="Manage Profile"
                >
                  {user?.imageUrl
                    ? <img className="avatar-img" src={user.imageUrl} alt={profile?.name || user?.firstName || "User"} />
                    : <div className="avatar-initials">{(profile?.name || user?.firstName || "U")[0]}</div>
                  }
                  <span className="avatar-name">{profile?.name || user?.firstName || "User"}</span>
                </button>
              )}
            </>
          )}
        </nav>
      </header>
    </>
  );
};
