import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const user = data.session.user;
          setUser({
            id: user.id,
            email: user.email || "",
            phone: user.phone || "",
            name: user.user_metadata?.name || "User",
            avatar_url: user.user_metadata?.avatar_url,
            role: user.user_metadata?.role || "user",
          });
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          const user = session.user;
          setUser({
            id: user.id,
            email: user.email || "",
            phone: user.phone || "",
            name: user.user_metadata?.name || "User",
            avatar_url: user.user_metadata?.avatar_url,
            role: user.user_metadata?.role || "user",
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [setUser]);

  return { loading };
};
