import React from 'react';
import useSocket from '../hooks/useSocket';

export default function CashoutButton({
  userId,
  currency,
  roundInProgress,
  lastMultiplier
}) {
  const socket = useSocket();

  const handleCashout = () => {
    if (!userId) return alert('Enter your user ID');
    socket.emit('cashout', { userId, currency });
  };

  return (
    <button
      className="px-6 py-2 bg-green-600 text-white disabled:opacity-50 rounded-md border border-accent-800 shadow-xl"
      disabled={!roundInProgress}
      onClick={handleCashout}
    >
      Cash Out {lastMultiplier}x
    </button>
  );
}