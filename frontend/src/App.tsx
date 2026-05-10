import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { ClerkProvider, useUser } from "@clerk/clerk-react";
import { Home } from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import { Login } from "./pages/Login";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Orders } from "./pages/Orders";
import { Admin } from "./pages/Admin";
import { OrderSuccess } from "./pages/OrderSuccess";
import { Wishlist } from "./pages/Wishlist";
import { useUserStore } from "./store/userStore";
import { useCartStore } from "./store/cartStore";
import { useWishlistStore } from "./store/wishlistStore";
import { supabase } from "./lib/supabase";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return null;
  return isSignedIn ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { profile, loading: profileLoading } = useUserStore();
  
  if (!clerkLoaded || (isSignedIn && profileLoading && !profile)) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const isAdmin = profile?.role === "admin";
  return isSignedIn && isAdmin ? <>{children}</> : <Navigate to="/" />;
}





function AppRoutes() {
  const { user, isSignedIn, isLoaded } = useUser();
  const syncProfile = useUserStore((state) => state.syncProfile);
  const fetchProfile = useUserStore((state) => state.fetchProfile);
  const fetchAddress = useUserStore((state) => state.fetchAddress);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);
  const lastSyncedId = useRef<string | null>(null);

  // Global Real-time Subscription for Profile & Address
  useEffect(() => {
    if (!user?.id) return;
    
    const uid = user.id;
    const channel = supabase
      .channel(`global_user_sync_${uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users',
        filter: `id=eq.${uid}` 
      }, () => {
        fetchProfile(uid);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'addresses',
        filter: `user_id=eq.${uid}` 
      }, () => {
        fetchAddress(uid);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchProfile, fetchAddress]);

  useEffect(() => {
    if (isLoaded && isSignedIn && user && lastSyncedId.current !== user.id) {
      lastSyncedId.current = user.id;
      syncProfile({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || user.firstName || user.username || "Verified User",
        avatar_url: user.imageUrl,
        phone: user.primaryPhoneNumber?.phoneNumber
      }).then(() => {
        fetchCart(user.id);
        fetchWishlist(user.id);
        fetchAddress(user.id);
      }).catch(err => {
        console.error("SYNC: Failed", err);
        lastSyncedId.current = null;
      });
    }
  }, [isLoaded, isSignedIn, user, syncProfile, fetchCart, fetchWishlist, fetchAddress]);

  return (
    <div className="app-shell">
      <div className="night-light-filter" />
      <div className="shell-glow" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route
          path="/order-success/:id"
          element={
            <ProtectedRoute>
              <OrderSuccess />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <Router>
        <AppRoutes />
      </Router>
    </ClerkProvider>
  );
}
