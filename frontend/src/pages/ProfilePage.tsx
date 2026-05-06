import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import api from "../lib/api";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const uploadAvatar = async () => {
    if (!avatar || !user) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", avatar);

      const response = await api.post(`/api/admin/upload/avatar/${user.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUser({ ...user, avatar_url: response.data.url });
      setAvatar(null);
      alert("Avatar updated successfully");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <p className="text-gray-600 text-sm">Avatar</p>
          {user.avatar_url && <img src={user.avatar_url} alt="Avatar" className="w-32 h-32 rounded-full my-2" />}
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatar(e.target.files?.[0] || null)}
              className="px-4 py-2 border rounded-lg"
            />
            <button
              onClick={uploadAvatar}
              disabled={!avatar || uploading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        <div>
          <p className="text-gray-600 text-sm">Email</p>
          <p className="font-semibold">{user.email}</p>
        </div>

        <div>
          <p className="text-gray-600 text-sm">Phone</p>
          <p className="font-semibold">{user.phone}</p>
        </div>

        <div>
          <p className="text-gray-600 text-sm">Role</p>
          <p className="font-semibold">{user.role}</p>
        </div>

        {user.role === "admin" && (
          <div className="mt-6 pt-6 border-t">
            <button
              onClick={() => navigate("/admin")}
              className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700"
            >
              Admin Dashboard
            </button>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full mt-6 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
