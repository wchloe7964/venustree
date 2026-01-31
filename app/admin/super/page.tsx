"use client";
import { useEffect, useState, useCallback } from "react";

import { createBrowserClient } from "@supabase/ssr";
import {
  getPendingUsers,
  approveUser,
  declineUser,
  getGlobalLoot,
  logout,
  updateAdminCredentials,
  toggleNodeLock,
  broadcastSystemMessage,
  sendTargetedMessage,
} from "../actions";

// 2. Icon Imports (From the lucide-react library)
import {
  LayoutDashboard,
  Search,
  LogOut,
  Settings2,
  Save,
  Trash2,
  Radio,
  Terminal as TerminalIcon,
  Wallet,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Lock,
  Unlock,
  Megaphone,
  ShieldAlert,
  MessageSquare,
  XCircle,
} from "lucide-react";
import Link from "next/link";

type ViewState = "requests" | "active" | "loot" | "payment" | "broadcast";

export default function SuperAdmin() {
  const [pending, setPending] = useState<any[]>([]);
  const [activeAdmins, setActiveAdmins] = useState<any[]>([]);
  const [globalLoot, setGlobalLoot] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(new Date());

  const [view, setView] = useState<ViewState>("requests");

  // Broadcast State
  const [bcMessage, setBcMessage] = useState("");
  const [bcType, setBcType] = useState<"INFO" | "ALERT" | "MAINTENANCE">(
    "INFO",
  );

  const [txStatuses, setTxStatuses] = useState<
    Record<string, { status: string; verified: boolean; loading: boolean }>
  >({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [payConfig, setPayConfig] = useState({
    btc: "",
    usdt_trc20: "",
    eth: "",
    price: "100",
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Sync internal clock for live monitoring
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Persistence: View Tab State
  useEffect(() => {
    const savedView = localStorage.getItem("super_admin_view") as ViewState;
    if (savedView) setView(savedView);
  }, []);

  const handleTabChange = (newView: ViewState) => {
    setView(newView);
    localStorage.setItem("super_admin_view", newView);
  };

  const verifyHash = async (hash: string) => {
    if (!hash) return;
    setTxStatuses((prev) => ({
      ...prev,
      [hash]: { status: "SCANNING", verified: false, loading: true },
    }));

    try {
      let statusText = "NOT_FOUND";
      let isVerified = false;

      if (hash.startsWith("0x")) {
        const res = await fetch(
          `https://eth.blockscout.com/api/v2/transactions/${hash}`,
        );
        const data = await res.json();
        if (data.status === "ok") {
          statusText = "CONFIRMED";
          isVerified = true;
        } else {
          statusText = "FAILED/PENDING";
        }
      } else if (hash.length >= 64) {
        const res = await fetch(`https://mempool.space/api/tx/${hash}/status`);
        const data = await res.json();
        if (data.confirmed) {
          statusText = "CONFIRMED";
          isVerified = true;
        } else {
          statusText = "UNCONFIRMED";
        }
      }

      setTxStatuses((prev) => ({
        ...prev,
        [hash]: { status: statusText, verified: isVerified, loading: false },
      }));
    } catch (err) {
      setTxStatuses((prev) => ({
        ...prev,
        [hash]: { status: "API_OFFLINE", verified: false, loading: false },
      }));
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [loot] = await Promise.all([getGlobalLoot()]);

      const { data: config } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "payment_gateways")
        .single();

      if (config) setPayConfig(config.value);

      // Fetch ALL profiles using the admin client logic via Supabase client
      // Note: Super Admin email is excluded from the 'Active Nodes' list
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Node Management Handlers
  const handleToggleLock = async (userId: string, currentStatus: boolean) => {
    const res = await toggleNodeLock(userId, !currentStatus);
    if (res.success) loadData();
  };

  const handleDirectMessage = async (userId: string) => {
    const msg = prompt("ENTER_DIRECT_SIGNAL_MESSAGE:");
    if (msg !== null && msg.trim() !== "") {
      const res = await sendTargetedMessage(userId, msg, "ALERT");
      if (res.success) loadData();
    }
  };

  const handleClearMessage = async (userId: string) => {
    const res = await sendTargetedMessage(userId, "", "INFO");
    if (res.success) loadData();
  };

  const handleSendBroadcast = async () => {
    if (!bcMessage) return;
    const res = await broadcastSystemMessage(bcMessage, bcType);
    if (res.success) {
      alert("BROADCAST_TRANSMITTED_SUCCESSFULLY");
      setBcMessage("");
    }
  };

  const handleClearBroadcast = async () => {
    const res = await broadcastSystemMessage("", "INFO");
    if (res.success) {
      alert("BROADCAST_CLEARED");
    }
  };

  const savePaymentConfig = async () => {
    const { error } = await supabase
      .from("system_config")
      .upsert(
        { key: "payment_gateways", value: payConfig },
        { onConflict: "key" },
      );
    if (error) alert(error.message);
    else alert("GATEWAY_PROTOCOL_UPDATED");
  };

  const handleApprove = async (id: string) => {
    const res = await approveUser(id);
    if (res.success) {
      loadData();
    } else {
      alert("APPROVAL_FAILED: " + (res.error || "UNKNOWN_ERROR"));
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirm("VOID IDENTITY?")) {
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
    }
  };

  const isOnline = (lastActive: string | null) => {
    if (!lastActive) return false;
    return new Date(lastActive).getTime() > now.getTime() - 2 * 60 * 1000;
  };

  const filteredAdmins = activeAdmins.filter(
    (admin) =>
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.tenant_id?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredLoot = globalLoot.filter(
    (item) =>
      item.tenant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(item.data)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  if (loading)
    return (
      <div className="bg-[#050505] min-h-screen flex items-center justify-center text-[#00ff41] font-mono text-[10px] tracking-[0.5em] uppercase animate-pulse italic">
        Syncing_Master_Node...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41]/60 font-mono p-4 md:p-12 selection:bg-[#00ff41] selection:text-black relative overflow-x-hidden">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100;400;800&family=Michroma&display=swap");
        .hacker-font {
          font-family: "JetBrains Mono", monospace;
        }
        .header-font {
          font-family: "Michroma", sans-serif;
        }
      `}</style>

      <div className="max-w-5xl mx-auto relative z-10">
        <header className="mb-12 border-b border-[#00ff41]/10 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex-1">
            <h1 className="header-font text-white text-2xl font-bold tracking-tighter uppercase italic flex items-center gap-3">
              VENUS<span className="text-[#00ff41]">TREE</span>
              <span className="text-[10px] bg-[#00ff41]/10 px-2 py-1 text-[#00ff41] font-black not-italic tracking-widest border border-[#00ff41]/20">
                ROOT_CONTROL
              </span>
            </h1>
            <p className="text-[9px] text-zinc-600 mt-3 uppercase tracking-[0.4em] font-bold flex items-center gap-2">
              <Radio size={10} className="text-[#00ff41]/40" />
              Auth_User:{" "}
              <span className="text-white">wchloe7964@gmail.com</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { id: "requests", label: `ENTRY_REQ (${pending.length})` },
              { id: "active", label: `NODES (${activeAdmins.length})` },
              { id: "broadcast", label: "BROADCAST" },
              { id: "loot", label: "GLOBAL_STREAM" },
              { id: "payment", label: "SET_PAY" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as ViewState)}
                className={`px-4 py-2 text-[9px] font-black tracking-widest transition-all rounded-sm border ${
                  view === tab.id
                    ? "bg-[#00ff41] text-black border-[#00ff41]"
                    : "border-zinc-900 text-zinc-600 hover:border-[#00ff41]/40"
                }`}>
                {tab.label}
              </button>
            ))}
            <div className="flex gap-2 ml-auto">
              <Link
                href="/admin"
                className="p-2 border border-zinc-900 text-zinc-600 hover:text-[#00ff41] transition-all">
                <LayoutDashboard size={16} />
              </Link>
              <button
                onClick={() => logout()}
                className="p-2 border border-zinc-900 text-red-900 hover:bg-red-900 hover:text-white transition-all">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Global Search Interface */}
        {(view === "active" || view === "loot") && (
          <div className="relative group mb-8">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-[#00ff41]"
              size={14}
            />
            <input
              type="text"
              placeholder={`FILTER_BY_TENANT_OR_${view === "active" ? "EMAIL" : "DATA"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-zinc-900 p-4 pl-12 text-[10px] text-[#00ff41] focus:outline-none focus:border-[#00ff41]/40 uppercase tracking-[0.3em] hacker-font"
            />
          </div>
        )}

        {/* VIEW: BROADCAST */}
        {view === "broadcast" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="border border-[#00ff41]/20 bg-black/60 p-8 space-y-6 shadow-[0_0_30px_rgba(0,255,65,0.05)]">
              <div className="flex justify-between items-center border-b border-[#00ff41]/10 pb-4">
                <div className="flex items-center gap-3">
                  <Megaphone className="text-[#00ff41]" size={18} />
                  <h2 className="header-font text-white text-sm uppercase italic">
                    Global_Broadcast_Uplink
                  </h2>
                </div>
                <button
                  onClick={handleClearBroadcast}
                  className="text-[8px] text-red-500 font-bold border border-red-500/20 px-2 py-1 hover:bg-red-500 hover:text-white transition-all">
                  WIPE_CURRENT_SIGNAL
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["INFO", "MAINTENANCE", "ALERT"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setBcType(t as any)}
                    className={`p-3 text-[9px] font-black border transition-all ${bcType === t ? "bg-[#00ff41] text-black border-[#00ff41]" : "border-zinc-900 text-zinc-600 hover:border-zinc-700"}`}>
                    {t}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full h-32 bg-black border border-zinc-900 p-4 text-xs text-[#00ff41] hacker-font outline-none focus:border-[#00ff41]/40 resize-none placeholder:text-zinc-800"
                placeholder="ENTER_ENCRYPTED_SIGNAL..."
                value={bcMessage}
                onChange={(e) => setBcMessage(e.target.value)}
              />
              <button
                onClick={handleSendBroadcast}
                className="w-full bg-white text-black font-black p-4 text-[10px] header-font hover:bg-[#00ff41] transition-all flex items-center justify-center gap-2">
                PUBLISH_TO_ALL_NODES <ShieldAlert size={14} />
              </button>
            </div>
          </div>
        )}

        {/* VIEW: PAYMENT CONFIG */}
        {view === "payment" && (
          <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="border border-[#00ff41]/20 bg-black/60 p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-[#00ff41]/10 pb-4">
                <Wallet className="text-[#00ff41]" size={18} />
                <h2 className="header-font text-white text-sm uppercase">
                  Gateway_Config
                </h2>
              </div>
              {Object.keys(payConfig).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-[8px] uppercase text-zinc-500 font-black">
                    {key.replace("_", " ")}
                  </label>
                  <input
                    className="w-full bg-black border border-zinc-900 p-3 text-xs text-[#00ff41] hacker-font outline-none focus:border-[#00ff41]/40"
                    value={payConfig[key as keyof typeof payConfig]}
                    onChange={(e) =>
                      setPayConfig({ ...payConfig, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
              <button
                onClick={savePaymentConfig}
                className="w-full bg-[#00ff41] text-black font-black p-4 text-[10px] header-font hover:bg-white transition-all">
                UPDATE_SYSTEM_PAYWALL
              </button>
            </div>
          </div>
        )}

        {/* VIEW: REQUESTS */}
        {view === "requests" && (
          <div className="grid gap-3">
            {pending.length === 0 ? (
              <div className="py-32 border border-zinc-900 bg-black/40 rounded-sm flex flex-col items-center gap-4 text-zinc-800 text-[10px] uppercase tracking-[0.8em] font-black">
                <TerminalIcon size={30} className="opacity-10" />{" "}
                No_Pending_Access_Requests
              </div>
            ) : (
              pending.map((user) => {
                const txInfo = txStatuses[user.tx_hash] || {
                  status: "UNVERIFIED",
                  verified: false,
                  loading: false,
                };
                return (
                  <div
                    key={user.id}
                    className={`border p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all group ${txInfo.verified ? "border-[#00ff41]/40 bg-[#00ff41]/5" : "border-zinc-900 bg-black/40"}`}>
                    <div className="w-full space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-bold hacker-font">
                          {user.email}
                        </p>
                        {txInfo.verified && (
                          <CheckCircle2 size={14} className="text-[#00ff41]" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.tx_hash ? (
                          <>
                            <a
                              href={`https://mempool.space/tx/${user.tx_hash}`}
                              target="_blank"
                              className="flex items-center gap-2 text-[8px] bg-zinc-900 px-3 py-1.5 border border-zinc-800 text-[#00ff41] hover:bg-zinc-800 transition-all font-bold uppercase">
                              <ExternalLink size={10} /> Hash:{" "}
                              {user.tx_hash.substring(0, 12)}...
                            </a>
                            <button
                              onClick={() => verifyHash(user.tx_hash)}
                              disabled={txInfo.loading}
                              className={`text-[8px] px-3 py-1.5 font-black border transition-all flex items-center gap-2 ${txInfo.verified ? "bg-[#00ff41] text-black border-[#00ff41]" : "border-zinc-800 text-zinc-500 hover:text-white"}`}>
                              {txInfo.loading && (
                                <Loader2 size={10} className="animate-spin" />
                              )}{" "}
                              {txInfo.status}
                            </button>
                          </>
                        ) : (
                          <span className="text-[9px] text-red-500/50 uppercase font-bold italic flex items-center gap-1">
                            <AlertCircle size={10} /> Unpaid_Identity
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => handleRevoke(user.id)}
                        className="p-3 border border-zinc-900 text-zinc-700 hover:text-red-500 hover:border-red-500/20 transition-all">
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => handleApprove(user.id)}
                        className={`flex-1 px-8 py-3 text-[10px] font-black transition-all uppercase header-font ${txInfo.verified ? "bg-[#00ff41] text-black hover:bg-white" : "bg-white text-black hover:bg-[#00ff41]"}`}>
                        {txInfo.verified ? "CONFIRM_ACCESS" : "Authorize"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW: ACTIVE NODES */}
        {view === "active" && (
          <div className="grid gap-4">
            {filteredAdmins.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-zinc-900 text-zinc-800 text-[10px] uppercase font-bold tracking-widest">
                Zero_Active_Nodes_In_Network
              </div>
            ) : (
              filteredAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className={`border p-6 flex flex-col gap-4 transition-all ${admin.is_locked ? "border-red-900/40 bg-red-900/5" : "border-zinc-900 bg-black/40 hover:border-[#00ff41]/20 group"}`}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 w-full">
                      {editingId === admin.id ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            className="bg-black border border-[#00ff41]/40 p-3 text-xs text-[#00ff41] flex-1 outline-none hacker-font"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                          />
                          <input
                            className="bg-black border border-[#00ff41]/40 p-3 text-xs text-[#00ff41] flex-1 outline-none hacker-font"
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="NEW_PASS"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-5">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${isOnline(admin.last_active) ? "bg-[#00ff41] animate-pulse shadow-[0_0_10px_#00ff41]" : "bg-zinc-800"}`}
                          />
                          <div>
                            <p className="text-white text-sm font-bold hacker-font">
                              {admin.email}{" "}
                              {admin.is_locked && (
                                <span className="text-red-500 text-[10px] ml-2 font-black tracking-tighter">
                                  [SUBSCRIPTION_EXPIRED]
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-[9px] uppercase tracking-widest">
                              <p className="text-zinc-500">
                                Tenant:{" "}
                                <span className="text-[#00ff41]">
                                  {admin.tenant_id}
                                </span>
                              </p>
                              <span className="text-zinc-800">|</span>
                              <p className="text-zinc-600 flex items-center gap-1">
                                <Clock size={10} />{" "}
                                {admin.last_active
                                  ? new Date(
                                      admin.last_active,
                                    ).toLocaleTimeString()
                                  : "OFFLINE"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      {editingId === admin.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleUpdate(admin.id)}
                            className="p-3 text-[#00ff41] border border-[#00ff41]/20 bg-[#00ff41]/5">
                            <Save size={18} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-3 text-red-500 border border-red-500/20">
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleDirectMessage(admin.id)}
                            className="p-3 border border-zinc-900 text-zinc-600 hover:text-[#00ff41] transition-all"
                            title="Send Private Signal">
                            <MessageSquare size={16} />
                          </button>
                          <button
                            onClick={() =>
                              handleToggleLock(admin.id, admin.is_locked)
                            }
                            className={`p-3 border transition-all ${admin.is_locked ? "bg-red-900 text-white border-red-900" : "border-zinc-900 text-zinc-600 hover:text-red-500"}`}
                            title={
                              admin.is_locked ? "Unlock Node" : "Lock Node"
                            }>
                            {admin.is_locked ? (
                              <Lock size={16} />
                            ) : (
                              <Unlock size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(admin.id);
                              setEditEmail(admin.email);
                            }}
                            className="p-3 text-zinc-600 hover:text-white border border-zinc-900">
                            <Settings2 size={16} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleRevoke(admin.id)}
                        className="p-3 text-zinc-800 hover:text-red-500 border border-zinc-900">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {admin.system_message && (
                    <div className="bg-black/60 border border-[#00ff41]/10 p-3 flex justify-between items-center animate-in fade-in slide-in-from-left-2">
                      <div className="flex items-center gap-3">
                        <Radio
                          size={12}
                          className="text-[#00ff41] animate-pulse"
                        />
                        <span className="text-[10px] text-[#00ff41]/70 hacker-font italic uppercase">
                          Active_Signal: "{admin.system_message}"
                        </span>
                      </div>
                      <button
                        onClick={() => handleClearMessage(admin.id)}
                        className="text-red-500/50 hover:text-red-500 p-1 transition-colors">
                        <XCircle size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW: GLOBAL LOOT */}
        {view === "loot" && (
          <div className="border border-zinc-900 bg-black/40 rounded-sm overflow-x-auto">
            <table className="w-full text-left text-[10px] min-w-[700px] hacker-font">
              <thead className="border-b border-[#00ff41]/10 text-zinc-600 uppercase tracking-widest bg-[#00ff41]/5">
                <tr>
                  <th className="px-6 py-4 font-black">Origin_Tenant</th>
                  <th className="px-6 py-4 font-black">Target_UID</th>
                  <th className="px-6 py-4 text-right font-black">
                    Capture_Sequence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00ff41]/5">
                {filteredLoot.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-20 text-center text-zinc-800 italic uppercase">
                      Stream_Empty_Waiting_For_Capture...
                    </td>
                  </tr>
                ) : (
                  filteredLoot.map((item, i) => (
                    <tr
                      key={i}
                      className="hover:bg-[#00ff41]/5 transition-colors group">
                      <td className="px-6 py-5 text-[#00ff41] font-bold italic tracking-wider">
                        {item.tenant || "MASTER_UPLINK"}
                      </td>
                      <td className="px-6 py-5 text-white font-bold opacity-80">
                        {item.data
                          ?.find((s: string) => s.includes("ds_user_id"))
                          ?.split("=")[1] || "VOID_ID"}
                      </td>
                      <td className="px-6 py-5 text-zinc-700 text-right font-bold tabular-nums">
                        {item.timestamp}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
