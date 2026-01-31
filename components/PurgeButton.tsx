"use client";
import { Trash2 } from "lucide-react";

export function PurgeButton({ onPurge }: { onPurge: () => void }) {
  const handlePurgeClick = async () => {
    if (confirm("PERMANENTLY WIPE ALL CAPTURED DATA?")) {
      // Trigger the onPurge function passed from the parent (which calls the action)
      onPurge();
    }
  };

  return (
    <button
      onClick={handlePurgeClick}
      className="flex items-center justify-center gap-2 px-4 py-2 border border-zinc-800 text-zinc-600 hover:text-red-500 hover:border-red-900/50 transition-all text-[10px] uppercase font-bold rounded">
      <Trash2 className="w-3 h-3" />
      Wipe_Data
    </button>
  );
}
