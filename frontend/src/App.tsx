import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return null;
  return isSignedIn ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  const isAdmin = user?.publicMetadata?.role === "admin" || user?.emailAddresses.some(e => e.emailAddress === "abrmkprm@gmail.com");
  return isSignedIn && isAdmin ? <>{children}</> : <Navigate to="/" />;
}

import { useEffect } from "react";
import api from "./lib/api";

function UserSync() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    const sync = async () => {
      if (isSignedIn && user) {
        try {
          await api.post("/api/users/sync", {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || user.username || user.primaryEmailAddress?.emailAddress?.split("@")[0],
            avatar_url: user.imageUrl,
          });
        } catch (err) {
          console.error("User sync failed:", err);
        }
      }
    };
    sync();
  }, [isSignedIn, user]);

  return null;
}

function AppRoutes() {
  return (
    <div className="app-shell">
      <UserSync />
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
