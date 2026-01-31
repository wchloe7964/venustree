"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Lock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function OutOfBoundsLanding() {
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [isBypassing, setIsBypassing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Only capture alphanumeric characters
      if (key.length === 1 && /[a-z0-9]/.test(key)) {
        const newInput = (input + key).slice(-5); // Keep last 5 chars for "admin"
        setInput(newInput);

        if (newInput === "admin") {
          setIsBypassing(true);
          setTimeout(() => {
            router.push("/admin");
          }, 1500);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-[#ff0000] font-mono selection:bg-red-600 selection:text-black overflow-hidden relative flex flex-col items-center justify-center">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100;400;800&family=Michroma&display=swap");
        .hacker-font {
          font-family: "JetBrains Mono", monospace;
        }
        .header-font {
          font-family: "Michroma", sans-serif;
        }

        .glitch-text {
          text-shadow:
            2px 0 #ff0000,
            -2px 0 #0000ff;
          animation: glitch 0.5s infinite;
        }

        @keyframes glitch {
          0% {
            transform: translate(0);
          }
          20% {
            transform: translate(-2px, 2px);
          }
          40% {
            transform: translate(-2px, -2px);
          }
          60% {
            transform: translate(2px, 2px);
          }
          80% {
            transform: translate(2px, -2px);
          }
          100% {
            transform: translate(0);
          }
        }

        .bg-grid-large {
          background-image:
            linear-gradient(to right, #ff000005 1px, transparent 1px),
            linear-gradient(to bottom, #ff000005 1px, transparent 1px);
          background-size: 80px 80px;
        }
      `}</style>

      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 bg-grid-large pointer-events-none" />
      <div className="fixed -top-20 -left-20 text-[25vw] font-black opacity-[0.03] select-none pointer-events-none leading-none header-font uppercase">
        403
      </div>
      <div className="fixed -bottom-40 -right-20 text-[25vw] font-black opacity-[0.03] select-none pointer-events-none leading-none header-font uppercase">
        VOID
      </div>

      <AnimatePresence>
        {!isBypassing ? (
          <motion.main
            key="denied"
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            className="relative z-10 text-center space-y-8 px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 blur-3xl opacity-20 animate-pulse" />
                <Lock size={64} className="relative z-10 text-red-600 mb-4" />
              </div>

              <h1 className="header-font text-4xl md:text-7xl font-black text-white leading-none glitch-text uppercase tracking-tighter">
                ACCESS_DENIED
              </h1>

              <div className="h-px w-64 bg-red-600/30 mx-auto" />

              <div className="space-y-2">
                <p className="hacker-font text-xs md:text-sm tracking-[0.4em] text-red-600/60 font-bold uppercase">
                  Unauthorized entry detected.
                </p>
                <p className="hacker-font text-xs md:text-sm tracking-[0.2em] text-zinc-500 uppercase">
                  Contact system admin to request authorization.
                </p>
              </div>
            </motion.div>
          </motion.main>
        ) : (
          <motion.div
            key="bypassing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-50 flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-white animate-spin" />
            <h2 className="header-font text-white text-xl tracking-[0.5em] animate-pulse">
              BYPASSING_RESTRICTIONS...
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OUT OF BOUNDS SIDEBARS */}
      <div className="absolute -left-32 top-1/2 -rotate-90 opacity-20 hidden lg:block pointer-events-none">
        <div className="flex items-center gap-4 text-[10px] tracking-[1em] uppercase font-bold text-red-600">
          <ShieldAlert size={14} /> SECURITY_BREACH_PROTOCOL_ACTIVE
        </div>
      </div>

      <div className="fixed top-8 left-8 right-8 flex justify-between pointer-events-none opacity-30">
        <div className="flex flex-col gap-1 hacker-font text-[9px] text-zinc-600">
          <span>IP_LOGGED: 192.168.1.228</span>
          <span>TRACE_ID: {input.padEnd(5, "_")}</span>
        </div>
        <div className="flex flex-col items-end gap-1 hacker-font text-[9px] text-zinc-600">
          <span
            className={`${isBypassing ? "text-emerald-500" : "text-red-600"} animate-pulse uppercase`}>
            {isBypassing ? "Handshake_Success" : "Alarm: Critical"}
          </span>
          <span>STATUS: ESTABLISHED</span>
        </div>
      </div>

      <footer className="fixed bottom-12 w-full text-center z-10 px-6 opacity-40">
        <div className="text-[10px] hacker-font text-zinc-800 uppercase tracking-widest leading-loose">
          Terminal ID:{" "}
          {Math.random().toString(36).substring(2, 10).toUpperCase()} <br />
          &copy; 2026 VENUSTREE // RESTRICTED AREA
        </div>
      </footer>
    </div>
  );
}
