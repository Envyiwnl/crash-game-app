import { useState } from "react";
import axios from "axios";

export default function BetForm({
  roundPending,
  roundNumber,
  userId,
  onUserIdChange,
  currency,
  onCurrencyChange,
}) {
  const [usdAmount, setUsdAmount] = useState(10);

  const placeBet = async () => {
    if (!userId) return alert("Enter your user ID");
    try {
      await axios.post("http://localhost:3000/bet", {
        userId,
        roundNumber,
        usdAmount,
        currency,
      });
      alert(`Bet placed: $${usdAmount} ${currency}`);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-4">
      <input
        className="border p-2 w-36 rounded-md border border-accent-800 shadow-xl"
        placeholder="User ID"
        value={userId}
        onChange={(e) => onUserIdChange(e.target.value)}
      />
      <input
        className="border p-2 w-20 rounded-md border border-accent-800 shadow-xl"
        type="number"
        min="1"
        step="0.01"
        value={usdAmount}
        onChange={(e) => setUsdAmount(parseFloat(e.target.value))}
      />
      <select
        className="border p-2 rounded-md border border-accent-800 shadow-xl"
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
      >
        <option>BTC</option>
        <option>ETH</option>
      </select>
      <button
        className="px-4 py-2 bg-primary-400 text-white rounded-md disabled:opacity-50 shadow-xl"
        disabled={!roundPending}
        onClick={placeBet}
      >
        Place Bet
      </button>
    </div>
  );
}
