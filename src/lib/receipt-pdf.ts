import jsPDF from "jspdf";
import { formatNaira } from "@/lib/bizkit";

interface ReceiptItem {
  product_name: string;
  qty: number;
  price: number;
  discount: number;
  total: number;
}

export interface ReceiptData {
  saleId: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  paymentType: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  cashier?: string;
}

/* ───────────────────────────── A5 receipt ───────────────────────────── */

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const W = doc.internal.pageSize.getWidth();   // 148
  const H = doc.internal.pageSize.getHeight();  // 210
  const M = 12;
  const right = W - M;
  const balance = +(data.total - data.amountPaid).toFixed(2);

  /* ── Header band ── */
  doc.setFillColor(20, 20, 50); // #141432
  doc.rect(0, 0, W, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.businessName || "BizKit Store", M, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let metaY = 19;
  if (data.businessAddress) { doc.text(data.businessAddress, M, metaY); metaY += 4; }
  if (data.businessPhone)   { doc.text(`Tel: ${data.businessPhone}`, M, metaY); }

  // Title block (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RECEIPT", right, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`#${data.saleId.slice(0, 8).toUpperCase()}`, right, 19, { align: "right" });
  doc.text(data.date, right, 23, { align: "right" });

  doc.setTextColor(0, 0, 0);

  /* ── Status pill ── */
  let y = 40;
  const isPaid = balance <= 0;
  const pillColor: [number, number, number] = isPaid ? [16, 130, 90] : [200, 60, 50];
  const pillLabel = isPaid ? "PAID" : "BALANCE DUE";
  doc.setFillColor(...pillColor);
  doc.roundedRect(M, y - 4, 26, 6, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(pillLabel, M + 13, y, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // Payment method on the right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(95, 95, 110);
  doc.text(`Payment · ${data.paymentType.toUpperCase()}`, right, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  /* ── Bill-to / Cashier strip ── */
  y += 8;
  doc.setDrawColor(225, 228, 235);
  doc.setLineWidth(0.2);
  doc.roundedRect(M, y, W - M * 2, 18, 2, 2, "S");

  doc.setFont("helvetica", "bold"); doc.setFontSize(7);
  doc.setTextColor(120, 120, 135);
  doc.text("BILLED TO", M + 3, y + 5);
  doc.text("CASHIER", M + 70, y + 5);

  doc.setTextColor(20, 20, 35);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text(data.customerName || "Walk-in customer", M + 3, y + 10);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  if (data.customerPhone) doc.text(data.customerPhone, M + 3, y + 14.5);

  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.text(data.cashier || "—", M + 70, y + 10);

  /* ── Items table ── */
  y += 24;
  // table header
  doc.setFillColor(243, 244, 250);
  doc.rect(M, y, W - M * 2, 7, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.setTextColor(80, 80, 100);
  doc.text("ITEM",  M + 3,         y + 4.8);
  doc.text("QTY",   M + 78,        y + 4.8, { align: "center" });
  doc.text("PRICE", right - 26,    y + 4.8, { align: "right" });
  doc.text("TOTAL", right - 3,     y + 4.8, { align: "right" });
  y += 7;

  doc.setTextColor(25, 25, 40);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  data.items.forEach((it, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 251, 254);
      doc.rect(M, y, W - M * 2, 7, "F");
    }
    const name = it.product_name.length > 38 ? it.product_name.slice(0, 38) + "…" : it.product_name;
    doc.text(name, M + 3, y + 4.8);
    doc.text(String(it.qty), M + 78, y + 4.8, { align: "center" });
    doc.text(formatNaira(it.price), right - 26, y + 4.8, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatNaira(it.total), right - 3, y + 4.8, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 7;
  });

  /* ── Totals box ── */
  y += 4;
  const boxX = W - M - 70;
  const boxW = 70;
  let boxY = y;
  const row = (label: string, amount: number, opts: { bold?: boolean; big?: boolean; muted?: boolean } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.big ? 11 : 9);
    if (opts.muted) doc.setTextColor(110, 110, 125); else doc.setTextColor(25, 25, 40);
    doc.text(label, boxX + 2, boxY + 5);
    doc.text(formatNaira(amount), boxX + boxW - 2, boxY + 5, { align: "right" });
    boxY += opts.big ? 8 : 6;
  };

  row("Subtotal", data.subtotal, { muted: true });
  if (data.discount > 0) row("Discount", -data.discount, { muted: true });
  if (data.tax > 0) row("Tax", data.tax, { muted: true });

  // separator
  doc.setDrawColor(225, 228, 235);
  doc.line(boxX, boxY + 1, boxX + boxW, boxY + 1);
  boxY += 3;

  // Total — emphasized band
  doc.setFillColor(20, 20, 50);
  doc.roundedRect(boxX, boxY, boxW, 10, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL", boxX + 2, boxY + 6.5);
  doc.setFontSize(12);
  doc.text(formatNaira(data.total), boxX + boxW - 2, boxY + 6.5, { align: "right" });
  doc.setTextColor(25, 25, 40);
  boxY += 13;

  row("Amount paid", data.amountPaid, { muted: true });
  if (balance > 0) {
    doc.setTextColor(200, 60, 50);
    row("Balance due", balance, { bold: true });
    doc.setTextColor(25, 25, 40);
  }

  /* ── Note ── */
  let footY = Math.max(boxY + 8, y + 4);
  if (data.note) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.setTextColor(110, 110, 125);
    doc.text("NOTE", M, footY);
    doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.setTextColor(25, 25, 40);
    doc.text(data.note, M, footY + 4.5, { maxWidth: W - M * 2 - 75 });
    footY += 12;
  }

  /* ── Footer ── */
  const fY = H - 16;
  doc.setDrawColor(225, 228, 235);
  doc.line(M, fY, W - M, fY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(110, 110, 125);
  doc.text("Thank you for your patronage.", W / 2, fY + 5, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(7);
  doc.text("Powered by BizKit", W / 2, fY + 9.5, { align: "center" });

  return doc;
}

export function downloadReceipt(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
  doc.save(`receipt-${data.saleId.slice(0, 8)}.pdf`);
}

export function shareReceipt(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
  const blob = doc.output("blob");
  const file = new File([blob], `receipt-${data.saleId.slice(0, 8)}.pdf`, { type: "application/pdf" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: "Sales Receipt" });
  } else {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
