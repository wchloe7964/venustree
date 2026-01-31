"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Copy,
  Check,
  Terminal,
  Wallet,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Unlock,
  ShieldCheck,
  MessageSquare,
  LogOut,
} from "lucide-react";

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [txHash, setTxHash] = useState("");
  const [payDetails, setPayDetails] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 1. Fetch Payment Config & Clean local state on mount
  useEffect(() => {
    const fetchPay = async () => {
      const { data } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "payment_gateways")
        .single();
      if (data) setPayDetails(data.value);
    };
    fetchPay();
  }, [supabase]);

  // 2. SMART GATEWAY: Check if user already exists/paid
  const checkIdentityStatus = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setStatusMsg("IDENTITY_FIELDS_REQUIRED");
      return;
    }

    setLoading(true);
    setStatusMsg("");

    try {
      // Check profiles table for existing record
      const { data, error } = await supabase
        .from("profiles")
        .select("approved, tx_hash")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (data) {
        // User is known. Skip to Step 3.
        setTxHash(data.tx_hash || "TX_LOGGED");
        setIsApproved(data.approved);
        setStep(3);
      } else {
        // New ID. Move to payment.
        setStep(2);
      }
    } catch (err) {
      setStatusMsg("UPLINK_ERROR: RETRYING...");
    } finally {
      setLoading(false);
    }
  };

  // 3. Live polling for Step 3
  useEffect(() => {
    if (step !== 3 || isApproved) return;

    const checkStatus = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("approved")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (data?.approved) {
        setIsApproved(true);
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [step, isApproved, email, supabase]);

  const copyToClipboard = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg("");

    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: { data: { tx_hash: txHash } },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        checkIdentityStatus();
      } else {
        setStatusMsg(`DENIED: ${error.message.toUpperCase()}`);
        setLoading(false);
      }
    } else {
      setLoading(false);
      setStep(3);
    }
  };

  const resetForm = () => {
    setStep(1);
    setEmail("");
    setPassword("");
    setTxHash("");
    setStatusMsg("");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00ff41]/80 font-mono flex items-center justify-center p-6 selection:bg-[#00ff41] selection:text-black">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100;400;800&family=Michroma&display=swap");
        .hacker-font {
          font-family: "JetBrains Mono", monospace;
        }
        .header-font {
          font-family: "Michroma", sans-serif;
        }
      `}</style>

      <div className="w-full max-w-sm space-y-10">
        <header className="space-y-2">
          <h1 className="header-font text-white text-3xl font-bold tracking-tighter uppercase italic">
            VENUS<span className="text-[#00ff41]">TREE</span>
          </h1>
          <div className="flex items-center gap-2">
            <ShieldAlert size={12} className="text-[#00ff41] animate-pulse" />
            <p className="text-[9px] text-[#00ff41]/60 font-bold uppercase tracking-[0.4em]">
              {isApproved
                ? "Identity_Verified"
                : step === 3
                  ? "Awaiting_Admin"
                  : step === 2
                    ? "Payment_Required"
                    : "Node_Registration"}
            </p>
          </div>
        </header>

        {step === 1 && (
          <form
            onSubmit={checkIdentityStatus}
            className="space-y-4 animate-in fade-in duration-500">
            <div className="space-y-1">
              <label className="text-[8px] text-zinc-600 uppercase font-black ml-1 tracking-widest">
                Proposed_Identity
              </label>
              <input
                type="email"
                placeholder="REQUEST_EMAIL"
                required
                className="w-full bg-black/40 border border-zinc-900 p-4 text-[#00ff41] outline-none text-xs hacker-font focus:border-[#00ff41]/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] text-zinc-600 uppercase font-black ml-1 tracking-widest">
                Access_Key
              </label>
              <input
                type="password"
                placeholder="REQUEST_PASSWORD"
                required
                className="w-full bg-black/40 border border-zinc-900 p-4 text-[#00ff41] outline-none text-xs hacker-font focus:border-[#00ff41]/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-black p-4 hover:bg-[#00ff41] transition-all uppercase text-[10px] header-font flex items-center justify-center gap-2">
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "INITIATE_HANDSHAKE"
              )}{" "}
              <ChevronRight size={14} />
            </button>
            {statusMsg && (
              <p className="text-[8px] text-red-500 text-center uppercase font-bold hacker-font">
                {statusMsg}
              </p>
            )}
            <Link
              href="/login"
              className="block text-center text-[9px] text-zinc-600 hover:text-white uppercase tracking-widest mt-4">
              Return_to_Login
            </Link>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="border border-[#00ff41]/20 bg-[#00ff41]/5 p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[#00ff41]/10 pb-2">
                <span className="header-font text-white text-[10px] uppercase">
                  Entry_Fee:
                </span>
                <span className="text-[#00ff41] font-black text-xl tabular-nums">
                  ${payDetails?.price}
                </span>
              </div>
              <div className="space-y-3">
                {["usdt_trc20", "btc", "eth"].map(
                  (coin) =>
                    payDetails?.[coin] && (
                      <div
                        key={coin}
                        onClick={() => copyToClipboard(payDetails[coin], coin)}
                        className="bg-black/60 p-3 border border-zinc-900 group relative cursor-pointer hover:border-[#00ff41]/40 transition-all">
                        <div className="flex justify-between items-center mb-1 text-[7px] text-zinc-600 font-black uppercase tracking-widest">
                          <span>{coin.replace("_", " ")} Network</span>
                          {copied === coin ? (
                            <Check size={10} className="text-[#00ff41]" />
                          ) : (
                            <Copy size={10} />
                          )}
                        </div>
                        <span className="text-[9px] text-[#00ff41] break-all hacker-font block">
                          {payDetails[coin]}
                        </span>
                        {copied === coin && (
                          <div className="absolute inset-0 bg-[#00ff41] text-black text-[9px] flex items-center justify-center font-black header-font">
                            COPIED
                          </div>
                        )}
                      </div>
                    ),
                )}
              </div>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <input
                placeholder="TRANSACTION_HASH_PROOF"
                required
                className="w-full bg-black border border-zinc-900 p-4 text-[#00ff41] text-xs outline-none hacker-font focus:border-[#00ff41]/40"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading || !txHash}
                className="w-full bg-[#00ff41] text-black font-black p-4 hover:bg-white transition-all uppercase text-[10px] header-font">
                {loading ? "LINKING_PROOF..." : "SUBMIT_PAYMENT_PROOF"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-[9px] text-zinc-700 uppercase hover:text-white transition-all flex items-center justify-center gap-2">
                <ArrowLeft size={10} /> Edit_Identity_Details
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div
            className={`border p-10 text-center space-y-6 animate-in zoom-in duration-1000 ${isApproved ? "border-[#00ff41] bg-[#00ff41]/10" : "border-[#00ff41]/20"}`}>
            {isApproved ? (
              <>
                <ShieldCheck
                  className="mx-auto text-[#00ff41] animate-bounce"
                  size={40}
                />
                <h2 className="header-font text-white text-sm uppercase">
                  Access_Authorized
                </h2>
                <p className="text-[9px] text-zinc-400 uppercase tracking-widest leading-loose">
                  The SuperUser has verified your node. Your identity is now
                  live.
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full bg-[#00ff41] text-black font-black p-4 mt-4 text-[10px] header-font hover:bg-white transition-all uppercase">
                  Launch_Terminal
                </button>
              </>
            ) : (
              <>
                <Loader2
                  className="mx-auto text-[#00ff41] animate-spin"
                  size={40}
                />
                <h2 className="header-font text-white text-sm uppercase italic">
                  Pending_Verification
                </h2>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest leading-loose">
                  Hash Logged. Awaiting manual confirmation for:{" "}
                  <span className="text-white">{email}</span>
                </p>

                <div className="grid grid-cols-1 gap-2 pt-4">
                  <a
                    href="https://t.me/bjose7964"
                    target="_blank"
                    className="flex items-center justify-center gap-2 bg-[#00ff41]/5 border border-[#00ff41]/20 p-3 text-[9px] text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-all font-black">
                    <MessageSquare size={14} /> CONTACT ADMIN
                  </a>
                  <button
                    onClick={resetForm}
                    className="flex items-center justify-center gap-2 border border-zinc-900 p-3 text-[9px] text-zinc-600 hover:text-white transition-all uppercase font-bold">
                    <LogOut size={12} /> Switch_Identity
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
