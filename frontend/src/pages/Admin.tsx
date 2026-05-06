import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

interface Product {
  id: number;
  title: string;
  price: number;
  image_url: string;
}

export const Admin = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState("products");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }

    if (tab === "products") {
      api.get("/api/products").then((res) => setProducts(res.data));
    }
  }, [user, navigate, tab]);

  const handleDeleteProduct = async (id: number) => {
    try {
      await api.delete(`/api/admin/products/${id}`);
      setProducts(products.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-900"
          >
            Back to Shop
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab("products")}
            className={`px-4 py-2 rounded ${
              tab === "products"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`px-4 py-2 rounded ${
              tab === "orders"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border"
            }`}
          >
            Orders
          </button>
        </div>

        {tab === "products" && (
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="p-6 border-b">
              <button
                onClick={() => navigate("/admin/product/new")}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                + Add Product
              </button>
            </div>

            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left">Product</th>
                  <th className="px-6 py-3 text-left">Price</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      {product.title}
                    </td>
                    <td className="px-6 py-4">₹{product.price}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/product/${product.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "orders" && (
          <div className="bg-white rounded shadow p-6">
            <p className="text-gray-600">Orders management coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
};
