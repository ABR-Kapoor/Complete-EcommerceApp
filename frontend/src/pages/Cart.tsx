import { useCartStore } from "../store/cartStore";
import { Link } from "react-router-dom";

export const Cart = () => {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const total = useCartStore((state) => state.total)();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">Product</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Quantity</th>
                <th className="px-6 py-3 text-left">Total</th>
                <th className="px-6 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img src={item.image_url} alt={item.title} className="w-16 h-16 object-cover rounded" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">₹{item.price}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="px-2 py-1 border rounded"
                      >
                        -
                      </button>
                      <span className="px-3">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 border rounded"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold">₹{item.price * item.quantity}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 bg-white rounded shadow p-6">
          <div className="flex justify-between items-center text-xl font-bold mb-6">
            <span>Total:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          <Link
            to="/checkout"
            className="w-full block text-center bg-blue-600 text-white py-3 rounded hover:bg-blue-700 font-bold"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
};
