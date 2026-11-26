import React, { useEffect, useId, useRef, useState } from "react";
import { Copy, Check, Upload, Trash2, ShieldCheck, Loader2, Camera } from "lucide-react";
import { compressImageFile } from "../utils/imageCompressor";

export const EASYPAISA_ACCOUNT = {
  title: "Ghulam Murtaza",
  number: "03277004471",
};

interface EasypaisaPaymentBoxProps {
  receiptUrl: string | null;
  onReceiptChange: (dataUrl: string | null) => void;
  amount: number;
  accountTitle?: string;
  accountNumber?: string;
}

export default function EasypaisaPaymentBox({
  receiptUrl,
  onReceiptChange,
  amount,
  accountTitle,
  accountNumber,
}: EasypaisaPaymentBoxProps) {
  const account = {
    title: accountTitle || EASYPAISA_ACCOUNT.title,
    number: accountNumber || EASYPAISA_ACCOUNT.number,
  };
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Unique input id: the food and grocery checkouts each render a box,
  // and a hardcoded shared id would be duplicated if both ever mount.
  const receiptInputId = useId();

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopyNumber = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(account.number);
      } else {
        const ta = document.createElement("textarea");
        ta.value = account.number;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid screenshot or photo of your Easypaisa receipt.");
      // Reset so picking the same invalid file again still fires onChange.
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Receipt photo is too large (max 10 MB). Please take a smaller photo or screenshot.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      // Compress receipt cleanly to ~35–75KB JPEG so Firestore never rejects payload size
      const compressed = await compressImageFile(file, 760, 1080, 0.68);
      onReceiptChange(compressed);
    } catch {
      setUploadError("Could not process receipt image. Please try another photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mt-2.5 rounded-2xl bg-emerald-950/35 border border-emerald-500/35 p-3.5 space-y-3 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Easypaisa Transfer Details
          </span>
          <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
            Transfer <strong className="text-white font-mono">Rs. {amount}</strong> to the account below and upload your screenshot/receipt.
          </p>
        </div>
      </div>

      {/* Account Box + Copy Button */}
      <div className="bg-zinc-950/90 border border-emerald-500/25 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">
            Account Title
          </span>
          <span className="block text-xs font-extrabold text-white truncate">
            {account.title}
          </span>
          <span className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 mt-1.5">
            Easypaisa Number
          </span>
          <span className="block text-sm font-black font-mono tracking-wider text-emerald-400">
            {account.number}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyNumber}
          aria-label="Copy Easypaisa number"
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-400 ${
            copied
              ? "bg-emerald-500 text-white"
              : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      {/* Receipt Upload */}
      <div className="space-y-2">
        <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-zinc-300">
          Upload Payment Receipt (Required) *
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
          id={receiptInputId}
          aria-label="Upload Easypaisa payment receipt"
        />

        {receiptUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-zinc-950 p-2 flex items-center gap-3">
            <img
              src={receiptUrl}
              alt="Easypaisa payment receipt preview"
              className="w-16 h-16 rounded-lg object-cover border border-zinc-800 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-400">
                <Check className="w-3.5 h-3.5" /> Receipt Attached
              </span>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                Your order will be placed with status <strong className="text-amber-300">Payment verification pending</strong> until confirmed by admin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onReceiptChange(null)}
              aria-label="Remove receipt"
              className="min-h-[40px] min-w-[40px] rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 flex items-center justify-center transition-all duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-rose-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload screenshot or take photo of Easypaisa receipt"
            className="w-full min-h-[48px] px-4 py-3 rounded-xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-zinc-950/70 hover:bg-zinc-900 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-180 active:scale-[0.97] active:brightness-110 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compressing receipt...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <Upload className="w-4 h-4" />
                <span>Upload Screenshot / Take Photo of Receipt</span>
              </>
            )}
          </button>
          {uploading && (
            <div role="progressbar" aria-label="Compressing receipt" className="micro-progress h-1.5 rounded-full bg-emerald-500/25" />
          )}
          </>
        )}

        {uploadError && (
          <p role="alert" className="text-[11px] font-bold text-rose-400">{uploadError}</p>
        )}
      </div>
    </div>
  );
}
