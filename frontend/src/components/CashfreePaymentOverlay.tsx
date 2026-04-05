import React, { useState } from 'react';

interface MockPaymentProps {
  amount: number;
  orderId: string;
  onSuccess: () => void;
  onFailure: () => void;
}

const CashfreePaymentOverlay: React.FC<MockPaymentProps> = ({ amount, orderId, onSuccess, onFailure }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, order_id: orderId })
      });

      if (response.ok) {
        onSuccess();
      } else {
        onFailure();
      }
    } catch (err) {
      console.error(err);
      onFailure();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center space-y-6">
        <h2 className="text-xl font-semibold">Mock Payment</h2>
        <p className="text-gray-600">You are about to simulate a payment of</p>
        <p className="text-4xl font-bold text-gray-900">₹{amount}</p>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  );
};

export default CashfreePaymentOverlay;