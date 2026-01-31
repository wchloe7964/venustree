"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Lock, Terminal, Activity } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "pending_approval") {
      setErrorMessage("ACCESS_DENIED: ACCOUNT_AWAITING_MANUAL_VALIDATION");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message.toUpperCase());
      setLoading(false);
    } else {
      if (data.user?.email === "wchloe7964@gmail.com") {
        router.push("/admin/super");
      } else {
        router.push("/admin");
      }
    }
  };

  return (
    <div className="w-full max-w-sm space-y-10 relative z-10">
      <div className="space-y-2">
        <h1 className="header-font text-white text-3xl font-bold tracking-tighter uppercase italic">
          VENUS<span className="text-[#00ff41]">TREE</span>
        </h1>
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-[#00ff41]" />
          <p className="text-[9px] text-[#00ff41]/60 font-bold uppercase tracking-[0.4em]">
            Authentication_Required
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <ShieldAlert className="text-red-500 shrink-0" size={16} />
          <p className="text-[10px] text-red-500 font-bold leading-relaxed tracking-tight hacker-font">
            {errorMessage}
          </p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest ml-1">
            Identity_Email
          </label>
          <input
            type="email"
            placeholder="USER@VENUSTREE.CORE"
            required
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/40 border border-zinc-900 p-4 text-[#00ff41] focus:outline-none focus:border-[#00ff41]/50 transition-all text-xs hacker-font"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest ml-1">
            Access_Key
          </label>
          <input
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/40 border border-zinc-900 p-4 text-[#00ff41] focus:outline-none focus:border-[#00ff41]/50 transition-all text-xs hacker-font"
          />
        </div>

        <button
          disabled={loading}
          className="w-full bg-[#00ff41] text-black font-bold p-4 hover:bg-white transition-all uppercase text-[10px] tracking-widest disabled:opacity-50 flex items-center justify-center gap-3 header-font">
          {loading ? (
            <span className="animate-pulse">Validating_Credentials...</span>
          ) : (
            <>
              <Lock size={12} /> Establish_Handshake
            </>
          )}
        </button>
      </form>

      <div className="flex justify-between items-center pt-4 border-t border-zinc-900">
        <Link
          href="/register"
          className="text-zinc-600 hover:text-[#00ff41] text-[9px] uppercase font-bold tracking-widest transition-colors">
          [ Request_Access ]
        </Link>
        <span className="text-[8px] text-zinc-800 uppercase font-bold tracking-tighter">
          Encryption: AES-256-GCM
        </span>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono p-6 relative overflow-hidden">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100;400;800&family=Michroma&display=swap");
        .hacker-font {
          font-family: "JetBrains Mono", monospace;
        }
        .header-font {
          font-family: "Michroma", sans-serif;
        }
      `}</style>

      {/* Background Decor */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none">
        <div className="absolute top-0 left-0 text-[15vw] font-black leading-none header-font">
          AUTH
        </div>
        <div className="absolute bottom-0 right-0 text-[15vw] font-black leading-none header-font uppercase italic">
          Secure
        </div>
      </div>

      {/* Decorative Sidebar (Out of Bounds) */}
      <div className="fixed right-6 top-1/2 -rotate-90 origin-right flex items-center gap-4 text-zinc-900 select-none pointer-events-none">
        <Activity size={12} />
        <span className="text-[9px] uppercase tracking-[1em] font-bold">
          Node_Connection_Active
        </span>
      </div>

      <Suspense
        fallback={
          <div className="text-[#00ff41] text-[10px] uppercase tracking-[0.5em] animate-pulse hacker-font">
            Loading_Secure_Terminal...
          </div>
        }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
