import React, { useRef, useEffect, useState } from "react";
import { X, Printer, Send, Download, Copy, Check, Share2, Sparkles } from "lucide-react";

interface OrderReceiptModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  senderRole?: "admin" | "rider" | "user";
}

/**
 * Safely formats order timestamp / date / createdAt to a clean date & time string
 */
export function formatOrderDateTime(rawDate: any): string {
  try {
    if (!rawDate) {
      return new Date().toLocaleString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    let d: Date;
    if (typeof rawDate?.toDate === "function") {
      d = rawDate.toDate();
    } else if (rawDate?.seconds !== undefined && typeof rawDate.seconds === "number") {
      d = new Date(rawDate.seconds * 1000);
    } else if (typeof rawDate === "number") {
      d = new Date(rawDate);
    } else if (typeof rawDate === "string") {
      d = new Date(rawDate);
    } else if (rawDate instanceof Date) {
      d = rawDate;
    } else {
      d = new Date();
    }

    if (isNaN(d.getTime())) {
      d = new Date();
    }

    return d.toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (err) {
    return new Date().toLocaleString("en-PK");
  }
}

/**
 * Normalizes phone numbers to Pakistani international format (923XXXXXXXXX)
 */
export function formatWhatsAppPhone(phoneStr: string | undefined): string {
  if (!phoneStr) return "";
  const digits = phoneStr.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return "92" + digits.substring(1);
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return "92" + digits;
  }
  if (!digits.startsWith("92") && digits.length >= 10) {
    return "92" + digits;
  }
  return digits;
}

export default function OrderReceiptModal({ order, isOpen, onClose, senderRole = "admin" }: OrderReceiptModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [copyImageSuccess, setCopyImageSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && order && canvasRef.current) {
      drawReceiptCanvas(canvasRef.current, order);
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const orderIdShort = order.id ? `dadu-${order.id.substring(0, 8)}` : "dadu-00000";
  const customerName = order.userName || order.name || "Valued Customer";
  const customerPhone = order.userPhone || order.phone || "";
  const customerAddress = order.userAddress || order.address || "Dadu Address";
  const waFormattedPhone = formatWhatsAppPhone(customerPhone);
  const items = order.items || [];
  const createdAtFormatted = formatOrderDateTime(order.createdAt || order.date || order.timestamp || order.updatedAt);

  // Format WhatsApp Text Message
  const buildWhatsAppText = () => {
    const itemsListText = items
      .map(
        (it: any, i: number) =>
          `• *${it.quantity}x ${it.name}* - Rs. ${Number(it.price || 0) * Number(it.quantity || 1)}${
            it.selectedSize ? ` (${it.selectedSize})` : ""
          }${it.selectedFlavor ? ` (${it.selectedFlavor})` : ""}`
      )
      .join("\n");

    return `🧾 *DADU FOOD & GROCERY RECEIPT* 🛍️
━━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* #${orderIdShort}
📅 *Date:* ${createdAtFormatted}
👤 *Customer:* ${customerName}
📞 *Phone:* ${customerPhone}
📍 *Address:* ${customerAddress}
${order.riderName ? `🛵 *Rider:* ${order.riderName}\n` : ""}${order.riderPhone ? `📱 *Rider Contact:* ${order.riderPhone}\n` : ""}
🛒 *ORDER ITEMS:*
-------------------------------------
${itemsListText}

-------------------------------------
💵 *Items Subtotal:* Rs. ${order.totalPrice || 0}
🛵 *Delivery Fee:* Rs. ${order.deliveryFee || 0}
💰 *GRAND TOTAL:* *Rs. ${order.grandTotal || 0}*
💳 *Payment:* ${order.paymentMethod === "COD" || order.paymentMethod === "cod" ? "Cash On Delivery (COD)" : order.paymentMethod || "COD"}
━━━━━━━━━━━━━━━━━━━━━
JazakAllah for ordering with Dadu Food! 🙏
For help or inquiries, contact us on WhatsApp.`;
  };

  const handleOpenWhatsAppChat = () => {
    if (!waFormattedPhone) {
      alert("Customer phone number is invalid or missing.");
      return;
    }
    window.open(`https://wa.me/${waFormattedPhone}`, "_blank");
  };

  const handleSendWhatsAppText = () => {
    if (!waFormattedPhone) {
      alert("Customer phone number is invalid or missing.");
      return;
    }
    const text = buildWhatsAppText();
    const url = `https://wa.me/${waFormattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleCopyText = () => {
    const text = buildWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadReceiptImage = () => {
    if (!canvasRef.current) return;
    setIsDownloadingImage(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Receipt_${orderIdShort}_${customerName.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download receipt image:", err);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handlePrintPaper = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = items
      .map(
        (item: any) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
        <span>${item.quantity}x ${item.name}</span>
        <span>Rs. ${item.price * item.quantity}</span>
      </div>
    `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt - ${orderIdShort}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 15px; max-width: 280px; margin: 0 auto; color: #000; background: #fff; }
            h2 { text-align: center; margin: 0 0 4px 0; font-size: 18px; text-transform: uppercase; }
            .subtitle { text-align: center; font-size: 11px; margin-bottom: 10px; font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .row { display: flex; justify-content: space-between; font-size: 11px; }
          </style>
        </head>
        <body>
          <h2>DADU FOOD</h2>
          <div class="subtitle">Fast Food & Grocery Express</div>
          <div class="divider"></div>
          <div style="font-size: 11px;"><strong>Receipt #:</strong> ${orderIdShort}</div>
          <div style="font-size: 11px;"><strong>Date:</strong> ${createdAtFormatted}</div>
          <div style="font-size: 11px;"><strong>Customer:</strong> ${customerName}</div>
          <div style="font-size: 11px;"><strong>Phone:</strong> ${customerPhone}</div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="row"><span>Subtotal:</span><span>Rs. ${order.totalPrice || 0}</span></div>
          <div class="row"><span>Delivery:</span><span>Rs. ${order.deliveryFee || 0}</span></div>
          <div class="row bold" style="font-size: 13px; margin-top: 4px;"><span>GRAND TOTAL:</span><span>Rs. ${order.grandTotal || 0}</span></div>
          <div class="divider"></div>
          <div style="font-size: 11px; margin-top: 5px;"><strong>Address:</strong><br/>${customerAddress}</div>
          ${order.riderName ? `<div style="font-size: 11px; margin-top: 4px;"><strong>Rider:</strong> ${order.riderName}</div>` : ""}
          <div class="divider"></div>
          <div class="text-center" style="font-size: 11px; margin-top: 15px;">
            Thank you for ordering with Dadu Food!
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#D70F64] to-[#b00c50] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-tight leading-tight">
                Order Receipt & WhatsApp
              </h3>
              <span className="text-[10px] text-pink-100 font-medium block">
                ID: #{orderIdShort} • Customer: {customerName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick WhatsApp Action Banner */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5 text-center sm:text-left">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 dark:text-emerald-400 block">
                Direct WhatsApp Customer Chat
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-emerald-100">
                Open WhatsApp chat for <span className="text-emerald-600 dark:text-emerald-300 font-extrabold">{customerPhone}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleOpenWhatsAppChat}
                className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Share2 className="w-4 h-4 fill-white" />
                Open WhatsApp Chat
              </button>
            </div>
          </div>

          {/* Canvas Receipt Image Preview */}
          <div className="bg-slate-100 dark:bg-zinc-950 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-2">
              📸 Official Digital Receipt Image
            </span>
            <div className="max-w-full overflow-x-auto shadow-xl rounded-xl border border-slate-300 dark:border-zinc-800 bg-white">
              <canvas ref={canvasRef} className="max-w-full h-auto block" />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleDownloadReceiptImage}
            disabled={isDownloadingImage}
            className="flex-1 bg-slate-800 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-black py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Download Picture (.PNG)
          </button>

          <button
            onClick={handleOpenWhatsAppChat}
            className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-black py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
          >
            <Share2 className="w-4 h-4 fill-white" />
            Open WhatsApp Chat
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Draws a clean, professional thermal-style receipt onto Canvas
 */
function drawReceiptCanvas(canvas: HTMLCanvasElement, order: any) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const items = order.items || [];
  const width = 480;
  const itemLineHeight = 28;
  const headerHeight = 160;
  const customerInfoHeight = 130;
  const summaryHeight = 150;
  const calculatedHeight = Math.max(580, headerHeight + customerInfoHeight + items.length * itemLineHeight + summaryHeight + 80);

  canvas.width = width;
  canvas.height = calculatedHeight;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, calculatedHeight);

  // Top Pink Accent Header
  ctx.fillStyle = "#D70F64";
  ctx.fillRect(0, 0, width, 50);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DADU FOOD & GROCERY", width / 2, 32);

  // Subheader
  let y = 80;
  ctx.fillStyle = "#0f172a";
  ctx.font = "black 20px monospace";
  ctx.fillText("OFFICIAL ORDER RECEIPT", width / 2, y);

  y += 22;
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Fast Food, Sweets & Grocery Delivery - Dadu", width / 2, y);

  // Dashed Line
  y += 20;
  drawDashedLine(ctx, 20, y, width - 20, y);

  // Customer & Order Info
  y += 20;
  ctx.textAlign = "left";
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#0f172a";

  const orderIdShort = order.id ? `dadu-${order.id.substring(0, 8)}` : "dadu-00000";
  const createdAtFormatted = formatOrderDateTime(order.createdAt || order.date || order.timestamp || order.updatedAt);

  ctx.fillText(`Receipt ID : #${orderIdShort}`, 25, y);
  y += 18;
  ctx.fillText(`Date & Time: ${createdAtFormatted}`, 25, y);
  y += 18;
  ctx.fillText(`Customer   : ${order.userName || order.name || "Customer"}`, 25, y);
  y += 18;
  ctx.fillText(`Phone      : ${order.userPhone || order.phone || "N/A"}`, 25, y);
  y += 18;
  ctx.fillText(`Address    : ${order.userAddress || order.address || "Dadu"}`, 25, y);

  if (order.riderName) {
    y += 18;
    ctx.fillText(`Rider      : ${order.riderName} (${order.riderPhone || ''})`, 25, y);
  }

  // Dashed Line
  y += 20;
  drawDashedLine(ctx, 20, y, width - 20, y);

  // Table Headers
  y += 22;
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#D70F64";
  ctx.fillText("QTY  ITEM NAME", 25, y);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", width - 25, y);

  y += 12;
  drawDashedLine(ctx, 20, y, width - 20, y);

  // Table Rows
  ctx.font = "12px monospace";
  ctx.fillStyle = "#1e293b";

  items.forEach((item: any) => {
    y += 24;
    ctx.textAlign = "left";
    const qtyStr = `${item.quantity || 1}x`.padEnd(5, " ");
    let nameStr = item.name || "Item";
    if (nameStr.length > 28) nameStr = nameStr.substring(0, 26) + "..";
    ctx.fillText(`${qtyStr}${nameStr}`, 25, y);

    ctx.textAlign = "right";
    const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
    ctx.fillText(`Rs. ${itemTotal}`, width - 25, y);
  });

  // Dashed Line
  y += 20;
  drawDashedLine(ctx, 20, y, width - 20, y);

  // Totals Summary
  y += 22;
  ctx.font = "12px monospace";
  ctx.fillStyle = "#475569";
  ctx.textAlign = "left";
  ctx.fillText("Items Subtotal:", 25, y);
  ctx.textAlign = "right";
  ctx.fillText(`Rs. ${order.totalPrice || 0}`, width - 25, y);

  y += 20;
  ctx.textAlign = "left";
  ctx.fillText("Delivery Charge:", 25, y);
  ctx.textAlign = "right";
  ctx.fillText(`Rs. ${order.deliveryFee || 0}`, width - 25, y);

  y += 24;
  ctx.fillStyle = "#D70F64";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.fillText("GRAND TOTAL:", 25, y);
  ctx.textAlign = "right";
  ctx.fillText(`Rs. ${order.grandTotal || 0}`, width - 25, y);

  // Footer
  y += 30;
  drawDashedLine(ctx, 20, y, width - 20, y);

  y += 25;
  ctx.textAlign = "center";
  ctx.font = "bold 11px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Thank you for ordering with Dadu Food & Grocery!", width / 2, y);
  y += 16;
  ctx.font = "9px sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Helpline / Support: +92 327 7004471", width / 2, y);
}

function drawDashedLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}
