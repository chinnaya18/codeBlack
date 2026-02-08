export default function AdminPanel() {
  const startRound = (round, duration) => {
    fetch("/admin/start-round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round, duration }),
    });
  };

  return (
    <div className="bg-black text-red-500 p-6 font-mono">
      <h1 className="text-2xl mb-4">ADMIN CONTROL</h1>

      <button onClick={() => startRound(1, 5400000)}>
        Start Round 1 (1.5h)
      </button>

      <button onClick={() => startRound(2, 3600000)}>Start Round 2 (1h)</button>

      <button className="mt-4 text-yellow-400">LOCK SUBMISSIONS</button>
    </div>
  );
}
