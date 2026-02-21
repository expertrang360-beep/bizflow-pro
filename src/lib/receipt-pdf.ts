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
  note?: string;
  businessName?: string;
}

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] }); // 80mm thermal width
  const w = 80;
  const margin = 4;
  const contentW = w - margin * 2;
  let y = 6;

  const businessName = data.businessName || "BizKit Store";

  // Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(businessName, w / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("SALES RECEIPT", w / 2, y, { align: "center" });
  y += 4;

  // Dashed line
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, w - margin, y);
  y += 3;

  // Sale info
  doc.setFontSize(7);
  doc.text(`Receipt #: ${data.saleId.slice(0, 8).toUpperCase()}`, margin, y);
  y += 3.5;
  doc.text(`Date: ${data.date}`, margin, y);
  y += 3.5;
  doc.text(`Payment: ${data.paymentType.toUpperCase()}`, margin, y);
  y += 3.5;
  if (data.customerName) {
    doc.text(`Customer: ${data.customerName}`, margin, y);
    y += 3.5;
  }

  // Dashed line
  doc.line(margin, y, w - margin, y);
  y += 3;

  // Column headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Item", margin, y);
  doc.text("Qty", margin + 38, y, { align: "center" });
  doc.text("Price", margin + 52, y, { align: "right" });
  doc.text("Total", w - margin, y, { align: "right" });
  y += 3;
  doc.line(margin, y, w - margin, y);
  y += 3;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  for (const item of data.items) {
    const name = item.product_name.length > 18 ? item.product_name.slice(0, 18) + "…" : item.product_name;
    doc.text(name, margin, y);
    doc.text(String(item.qty), margin + 38, y, { align: "center" });
    doc.text(formatNaira(item.price), margin + 52, y, { align: "right" });
    doc.text(formatNaira(item.total), w - margin, y, { align: "right" });
    y += 3.5;
  }

  // Dashed line
  y += 1;
  doc.line(margin, y, w - margin, y);
  y += 3;

  // Totals
  doc.setFontSize(7);
  const addTotalRow = (label: string, amount: number, bold = false) => {
    if (bold) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    doc.text(label, margin, y);
    doc.text(formatNaira(amount), w - margin, y, { align: "right" });
    y += 3.5;
  };

  addTotalRow("Subtotal", data.subtotal);
  if (data.discount > 0) addTotalRow("Discount", -data.discount);
  if (data.tax > 0) addTotalRow("Tax", data.tax);

  doc.line(margin, y, w - margin, y);
  y += 3;
  doc.setFontSize(9);
  addTotalRow("TOTAL", data.total, true);

  doc.setFontSize(7);
  addTotalRow("Amount Paid", data.amountPaid);
  if (data.total - data.amountPaid > 0) {
    addTotalRow("Balance Due", data.total - data.amountPaid);
  }

  // Note
  if (data.note) {
    y += 2;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.text(`Note: ${data.note}`, margin, y, { maxWidth: contentW });
    y += 4;
  }

  // Footer
  y += 3;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, w - margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Thank you for your patronage!", w / 2, y, { align: "center" });
  y += 3.5;
  doc.text("Powered by BizKit", w / 2, y, { align: "center" });

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
    // Fallback: open in new tab
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
