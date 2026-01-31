"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Lock } from "lucide-react";

// 1. Separate the logic into a child component
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
      setErrorMessage(
        "ACCESS_DENIED: YOUR ACCOUNT IS AWAITING MANUAL APPROVAL.",
      );
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
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="text-white text-xl font-bold tracking-tighter uppercase">
          Procheckerly <span className="text-zinc-700">/ Auth</span>
        </h1>
        <p className="text-[10px] text-blue-900 font-bold uppercase tracking-[0.3em] mt-2 italic">
          Secure Entry Point
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded flex items-start gap-3 animate-in fade-in zoom-in duration-300">
          <ShieldAlert className="text-red-500 shrink-0" size={16} />
          <p className="text-[10px] text-red-500 font-bold leading-relaxed tracking-tight">
            {errorMessage}
          </p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="EMAIL"
          required
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent border border-zinc-900 p-4 text-white focus:outline-none focus:border-blue-900 transition-all text-sm"
        />
        <input
          type="password"
          placeholder="ACCESS_KEY"
          required
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border border-zinc-900 p-4 text-white focus:outline-none focus:border-blue-900 transition-all text-sm"
        />
        <button
          disabled={loading}
          className="w-full bg-white text-black font-bold p-4 hover:bg-zinc-200 transition-all uppercase text-xs tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? (
            "Logging in..."
          ) : (
            <>
              <Lock size={12} /> Login
            </>
          )}
        </button>
      </form>

      <div className="text-center">
        <Link
          href="/register"
          className="text-zinc-600 hover:text-zinc-400 text-[10px] uppercase font-bold tracking-widest transition-colors">
          Request Access
        </Link>
      </div>
    </div>
  );
}

// 2. Main Page Export with Suspense Boundary
export default function Login() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono p-6">
      <Suspense
        fallback={
          <div className="text-zinc-800 text-[10px] uppercase tracking-widest animate-pulse">
            Initializing_Secure_Protocol...
          </div>
        }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
