import { useState, useEffect, useContext } from "react";
import { SocketContext } from "./context/SocketContext";
import BetForm from "./components/BetForm";
import MultiplierChart from "./components/MultiplierChart";
import EventLog from "./components/EventLog";
import CashoutButton from "./components/CashoutButton";

export default function App() {
  const socket = useContext(SocketContext);

  // UI States
  const [userId, setUserId] = useState("");
  const [currency, setCurrency] = useState("BTC");
  const [roundPending, setRoundPending] = useState(false);
  const [roundInProgress, setRoundInProgress] = useState(false);
  const [roundNumber, setRoundNumber] = useState(null);
  const [lastMultiplier, setLastMultiplier] = useState(1);
  const [chartData, setChartData] = useState([]);
  const [crashPoint, setCrashPoint] = useState(null);
  const [showCrashModal, setShowCrashModal] = useState(false);
  const [events, setEvents] = useState([]);

  // helper for event log
  const log = (msg) => setEvents((prev) => [...prev, { ts: Date.now(), msg }]);

  // Socket effects
  useEffect(() => {
    socket.on("round:pending", ({ roundNumber, seedHash, betWindow }) => {
      setRoundNumber(roundNumber);
      setRoundPending(true);
      setRoundInProgress(false);
      setChartData([]);
      setLastMultiplier(1);
      setCrashPoint(null);
      log(`Betting open for ${betWindow}s (hash: ${seedHash})`);
    });

    socket.on("round:start", ({ roundNumber }) => {
      setRoundPending(false);
      setRoundInProgress(true);
      setLastMultiplier(1);
      log(`Round #${roundNumber} started`);
    });

    socket.on("multiplier:update", ({ multiplier }) => {
      setLastMultiplier(multiplier);
      setChartData((prev) => [...prev, { t: Date.now(), x: multiplier }]);
    });

    socket.on("round:crash", ({ crashPoint }) => {
      setCrashPoint(crashPoint);
      setRoundInProgress(false);
      log(`Crashed at ${crashPoint}x`);
      setShowCrashModal(true);
      setTimeout(() => setShowCrashModal(false), 3000);
    });

    socket.on(
      "player:cashout",
      ({ userId: player, payoutCrypto, usdAmount, currency }) => {
        log(
          `User ${player} cashed out ${payoutCrypto}${currency} (~$${usdAmount.toFixed(
            2
          )})`
        );
      }
    );

    return () => {
      socket.removeAllListeners();
    };
  }, [socket]);

  return (
    <div className="w-full min-h-screen bg-primary-800">
      {showCrashModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white px-8 py-6 rounded-lg shadow-xl text-center">
            <p className="text-2xl font-bold text-red-600">
              💥 Crashed at {crashPoint}x!
            </p>
          </div>
        </div>
      )}
      <div className="w-full min-h-[46px] bg-primary-300 p-2">
        <h1
          className="text-2xl font-bold text-left font-nunito text-white filter 
    drop-shadow-[0_0_10px_rgba(255,255,255,0.9)] 
    drop-shadow-[0_0_20px_rgba(0,229,255,0.7)]"
        >
          Crypto Crash 🚀
        </h1>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-2 bg-primary-950 mt-2 mb-4 shadow:xl rounded-lg">
        <BetForm
          roundPending={roundPending}
          roundNumber={roundNumber}
          userId={userId}
          onUserIdChange={setUserId}
          currency={currency}
          onCurrencyChange={setCurrency}
        />

        <div className="flex justify-center">
          <CashoutButton
            userId={userId}
            currency={currency}
            roundInProgress={roundInProgress}
            lastMultiplier={lastMultiplier}
          />
        </div>

        <MultiplierChart data={chartData} crashPoint={crashPoint} />
        <EventLog events={events} />
      </div>
    </div>
  );
}
