"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ data }: { data: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 transition-all rounded border border-zinc-900 bg-black hover:border-zinc-500 group"
      title="Copy Raw Data">
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-200" />
      )}
    </button>
  );
}
