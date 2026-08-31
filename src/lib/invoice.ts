import { PLATFORM_COMMISSION_RATE, CONTACT_EMAIL, CONTACT_ADDRESS_LINES } from "./constants";
import { formatCurrency as formatCurrencyShared } from "./currency";

// Generates a clean, self-contained PDF entirely client-side — no server
// round trip, no stored file. Used from both the business dashboard (for a
// completed payment) and the publisher dashboard (as a payout statement for
// the same underlying payment). Two calls into the same builder so the two
// documents always agree on figures, they just present the money split
// from opposite sides of it.

const INK = "#1A1712";
const INK_SOFT = "#6B6250";
const GREEN = "#1F7A4D";
const PAGE_WIDTH = 210;
const MARGIN = 20;

interface InvoicePartyLine {
  heading: string;
  lines: string[];
}

export interface InvoiceInput {
  /** e.g. "MB-A1B2C3D4" */
  invoiceNumber: string;
  /** Human display date, e.g. "6 August 2026" */
  issueDate: string;
  statusLabel: string;
  billTo: InvoicePartyLine;
  from: InvoicePartyLine;
  description: string;
  channelLabel: string;
  grossAmount: number;
  /** When set, breaks the total down into platform commission + net payout — used for the publisher's copy. */
  showCommissionSplit: boolean;
  /** File name without extension. */
  fileName: string;
}

function rand(n: number): string {
  return formatCurrencyShared(n, { cents: true });
}

export async function buildAndDownloadInvoice(input: InvoiceInput) {
  // Loaded on demand — jsPDF (and its optional image-export dependencies)
  // is only needed by the handful of users who actually click "Download
  // Invoice", so it shouldn't sit in the bundle everyone downloads on
  // first load.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 22;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(INK);
  doc.text("CHATSCHED", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK_SOFT);
  y += 6;
  doc.text("Turn any page into a billboard.", MARGIN, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(INK);
  doc.text(input.showCommissionSplit ? "PAYOUT STATEMENT" : "INVOICE", PAGE_WIDTH - MARGIN, 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK_SOFT);
  doc.text(`No. ${input.invoiceNumber}`, PAGE_WIDTH - MARGIN, 28, { align: "right" });
  doc.text(input.issueDate, PAGE_WIDTH - MARGIN, 33, { align: "right" });

  y = 42;
  doc.setDrawColor(INK);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  // Bill to / From
  y += 10;
  const colWidth = (PAGE_WIDTH - MARGIN * 2) / 2;
  [{ x: MARGIN, party: input.from }, { x: MARGIN + colWidth, party: input.billTo }].forEach(({ x, party }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(INK_SOFT);
    doc.text(party.heading.toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(INK);
    let ly = y + 6;
    party.lines.forEach((line) => {
      doc.text(line, x, ly);
      ly += 5.2;
    });
  });

  y += 34;
  doc.setFillColor(245, 240, 227);
  doc.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(INK);
  doc.text("DESCRIPTION", MARGIN + 3, y + 6);
  doc.text("CHANNEL", MARGIN + 105, y + 6);
  doc.text("AMOUNT", PAGE_WIDTH - MARGIN - 3, y + 6, { align: "right" });

  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(INK);
  const descLines = doc.splitTextToSize(input.description, 80);
  doc.text(descLines, MARGIN + 3, y);
  doc.text(input.channelLabel, MARGIN + 105, y);
  doc.text(rand(input.grossAmount), PAGE_WIDTH - MARGIN - 3, y, { align: "right" });

  y += Math.max(descLines.length * 5, 10) + 6;
  doc.setDrawColor(220, 213, 195);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 10;
  if (input.showCommissionSplit) {
    const commission = input.grossAmount * PLATFORM_COMMISSION_RATE;
    const net = input.grossAmount - commission;
    const commissionPct = Math.round(PLATFORM_COMMISSION_RATE * 100);

    doc.setFontSize(9.5);
    doc.setTextColor(INK_SOFT);
    doc.text("Campaign value", PAGE_WIDTH - MARGIN - 55, y);
    doc.text(rand(input.grossAmount), PAGE_WIDTH - MARGIN - 3, y, { align: "right" });
    y += 6.5;
    doc.text(`Platform commission (${commissionPct}%)`, PAGE_WIDTH - MARGIN - 55, y);
    doc.text(`-${rand(commission)}`, PAGE_WIDTH - MARGIN - 3, y, { align: "right" });
    y += 4;
    doc.setDrawColor(INK);
    doc.line(PAGE_WIDTH - MARGIN - 55, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(GREEN);
    doc.text("Your payout", PAGE_WIDTH - MARGIN - 55, y);
    doc.text(rand(net), PAGE_WIDTH - MARGIN - 3, y, { align: "right" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(INK);
    doc.text("Total paid", PAGE_WIDTH - MARGIN - 55, y);
    doc.text(rand(input.grossAmount), PAGE_WIDTH - MARGIN - 3, y, { align: "right" });
  }

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(INK_SOFT);
  doc.text("STATUS", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GREEN);
  doc.text(input.statusLabel, MARGIN, y + 5.5);

  // Footer
  const footerY = 275;
  doc.setDrawColor(220, 213, 195);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY - 8, PAGE_WIDTH - MARGIN, footerY - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(INK_SOFT);
  doc.text(`ChatSched · ${CONTACT_ADDRESS_LINES.join(", ")}`, MARGIN, footerY);
  doc.text(CONTACT_EMAIL, MARGIN, footerY + 4.5);
  doc.text("This is a system-generated document and is valid without a signature.", PAGE_WIDTH - MARGIN, footerY, { align: "right" });

  doc.save(`${input.fileName}.pdf`);
}
