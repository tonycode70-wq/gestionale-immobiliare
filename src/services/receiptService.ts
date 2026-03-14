import { db } from "../../utils/localStorageDB.js";

type Scope = "global" | "property";

type ReceiptContext = {
  paymentId: string;
  year: number;
  month: number;
  number: string;
  propertyId: string;
  propertyLabel: string;
  propertyAddress: string;
  tenantId: string;
  tenantLabel: string;
  locatoreLabel: string;
  locatoreAddress: string;
  canoneBase: number;
  speseCondominiali: number;
  importoTotale: number;
  bollo: boolean;
  date: string;
  periodLabel: string;
};

const CDN = {
  jspdf: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  jszip: "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getAll(): any[] {
  return db.getAll();
}

function findTenantLabel(t: any) {
  if (!t) return "";
  if (t.tipo_soggetto === "persona_fisica") return `${t.nome || ""} ${t.cognome || ""}`.trim();
  return t.ragione_sociale || "";
}

function propertyAddress(p: any) {
  const parts = [];
  if (p?.indirizzo_via) parts.push(`${p.indirizzo_via} ${p.indirizzo_civico || ""}`.trim());
  if (p?.cap || p?.citta || p?.provincia) parts.push(`${p.cap || ""} ${p.citta || ""} ${p.provincia ? `(${p.provincia})` : ""}`.trim());
  return parts.filter(Boolean).join(" • ");
}

function lcGet(key: string, def: string) {
  try {
    const v = localStorage.getItem(key);
    return v ?? def;
  } catch {
    return def;
  }
}

function lcSet(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {}
}

export function nextReceiptNumber(year: number, scope: Scope, propertyId?: string) {
  const base = scope === "property" && propertyId ? `rcpt_counter_prop_${propertyId}_${year}` : `rcpt_counter_global_${year}`;
  const current = Number(lcGet(base, "0"));
  const next = current + 1;
  lcSet(base, String(next));
  return pad2(next);
}

function ensureLib<T = any>(test: () => any, url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const ok = test();
      if (ok) {
        resolve(ok);
        return;
      }
    } catch {}
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.onload = () => {
      try {
        const lib = test();
        resolve(lib);
      } catch (e) {
        reject(e);
      }
    };
    s.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(s);
  });
}

async function loadPDFLibs(): Promise<{ jsPDF: any; JSZip: any }> {
  const jspdf = await ensureLib<any>(() => (window as any).jspdf, CDN.jspdf);
  const JSZip = await ensureLib<any>(() => (window as any).JSZip, CDN.jszip);
  return { jsPDF: jspdf.jsPDF, JSZip };
}

export function getReceiptContextForPayment(paymentId: string, scope: Scope = "global"): ReceiptContext {
  const all = getAll();
  const pay = all.find(x => (x as any).__table === "payments" && (x as any).id === paymentId) as any;
  if (!pay) throw new Error("Pagamento non trovato");
  const lease = all.find(x => (x as any).__table === "leases" && (x as any).id === pay.lease_id) as any;
  if (!lease) throw new Error("Contratto non trovato");
  const unit = all.find(x => (x as any).__table === "units" && (x as any).id === lease.unit_id) as any;
  if (!unit) throw new Error("Unità non trovata");
  const prop = all.find(x => (x as any).__table === "properties" && (x as any).id === unit.property_id) as any;
  const parties = all.filter(x => (x as any).__table === "lease_parties" && (x as any).lease_id === lease.id) as any[];
  const tenants = all.filter(x => (x as any).__table === "tenants") as any[];
  const mainParty = parties.find(p => p.ruolo === "intestatario");
  const tenant = tenants.find(t => t.id === mainParty?.tenant_id);
  
  // Locatore info from Property
  const locatoreLabel = prop?.proprietario_nome || "Sabrina Cinzia Mozzo";
  const locatoreAddress = prop?.proprietario_indirizzo || "Desenzano del Garda, via P.O. Marcolini 136";

  const canoneBase = Number(pay.importo_canone_pagato ?? lease.canone_mensile ?? 0) || 0;
  const speseCondominiali = Number(pay.importo_spese_pagato ?? lease.spese_condominiali_mensili_previste ?? 0) || 0;
  const importoTotale = Math.round((canoneBase + speseCondominiali) * 100) / 100;
  
  // Bollo only if canone > 77.47
  const bollo = canoneBase > 77.47;
  
  const year = Number(pay.competenza_anno);
  const month = Number(pay.competenza_mese);
  const n = nextReceiptNumber(year, scope, prop?.id);
  const number = scope === "property" && prop ? `${n}/${year} - ${prop?.nome_complesso || ""}` : `${n}/${year}`;
  const propertyLabel = prop?.nome_complesso || "Immobile";
  const pAddr = prop ? propertyAddress(prop) : "";
  const tenantLabel = findTenantLabel(tenant);
  const date = pay.data_pagamento || new Date().toISOString().slice(0, 10);
  const periodLabel = new Date(year, month - 1, 1).toLocaleString("it-IT", { month: "long", year: "numeric" });
  return {
    paymentId,
    year,
    month,
    number,
    propertyId: prop?.id || "",
    propertyLabel,
    propertyAddress: pAddr,
    tenantId: tenant?.id || "",
    tenantLabel,
    locatoreLabel,
    locatoreAddress,
    canoneBase,
    speseCondominiali,
    importoTotale,
    bollo,
    date,
    periodLabel,
  };
}

function drawReceiptPart(doc: any, ctx: ReceiptContext, yOffset: number, label: string) {
  let y = yOffset + 15;
  
  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(ctx.locatoreLabel.toUpperCase(), 15, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Ricevuta N. ${ctx.number}`, 195, y, { align: "right" });
  
  y += 6;
  doc.setFontSize(10);
  doc.text(ctx.locatoreAddress, 15, y);
  
  y += 8;
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  
  // Body
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Conduttore: ", 15, y);
  doc.setFont("helvetica", "normal");
  doc.text(ctx.tenantLabel, 40, y);
  
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Immobile: ${ctx.propertyAddress || ctx.propertyLabel}`, 15, y);
  
  // Gray Box
  y += 8;
  const boxTop = y;
  const boxHeight = 35;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(15, boxTop, 180, boxHeight, 3, 3, "F");
  
  y += 10;
  doc.setFontSize(11);
  doc.text(`Periodo: ${ctx.periodLabel}`, 25, y);
  y += 8;
  doc.text(`Importo totale: ${ctx.importoTotale.toFixed(2).replace(".", ",")} €`, 25, y);
  y += 8;
  doc.text(`Scorporo: Canone ${ctx.canoneBase.toFixed(2).replace(".", ",")} € • Spese ${ctx.speseCondominiali.toFixed(2).replace(".", ",")} €`, 25, y);
  
  // Footer - position relative to box bottom
  y = boxTop + boxHeight + 8;
  if (ctx.bollo) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`* Marca da bollo da € 2,00 assolta sull'originale`, 15, y);
    y += 8;
  } else {
    y += 4;
  }
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Luogo e data: ________________________`, 15, y);
  doc.text(`Firma del locatore: ________________________`, 110, y);

  if (label) {
    doc.setFontSize(8);
    doc.text(label, 195, yOffset + 5, { align: "right" });
  }
}

function drawReceipt(doc: any, ctx: ReceiptContext) {
  // Originale (Top)
  drawReceiptPart(doc, ctx, 0, "COPIA ORIGINALE");
  
  // Cut line
  const mid = 148.5;
  doc.setLineDashPattern([2, 2], 0);
  doc.setLineWidth(0.2);
  doc.line(0, mid, 210, mid);
  doc.setFontSize(8);
  doc.text("--- TAGLIO ---", 105, mid + 1, { align: "center" });
  doc.setLineDashPattern([], 0);
  
  // Simplified Copy (Bottom)
  let y = mid + 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Ricevuta - ${ctx.periodLabel} (copia)`, 15, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryText = `${ctx.tenantLabel} • Totale ${ctx.importoTotale.toFixed(2).replace(".", ",")} € • Canone ${ctx.canoneBase.toFixed(2).replace(".", ",")} € • Spese ${ctx.speseCondominiali.toFixed(2).replace(".", ",")} €`;
  doc.text(summaryText, 15, y);
}

export async function generateReceiptPDFForPayment(paymentId: string, scope: Scope = "global"): Promise<Blob> {
  const { jsPDF } = await loadPDFLibs();
  const ctx = getReceiptContextForPayment(paymentId, scope);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawReceipt(doc, ctx);
  const pdf = doc.output("blob");
  return pdf;
}

export async function generateCombinedPDFForPayments(paymentIds: string[], scope: Scope = "global"): Promise<Blob> {
  const { jsPDF } = await loadPDFLibs();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  paymentIds.forEach((id, idx) => {
    const ctx = getReceiptContextForPayment(id, scope);
    if (idx > 0) doc.addPage();
    drawReceipt(doc, ctx);
  });
  return doc.output("blob");
}

export async function generateZipForPayments(paymentIds: string[], scope: Scope = "global"): Promise<Blob> {
  const { jsPDF, JSZip } = await loadPDFLibs();
  const zip = new JSZip();
  for (const id of paymentIds) {
    const ctx = getReceiptContextForPayment(id, scope);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    drawReceipt(doc, ctx);
    const blob = doc.output("blob");
    const arrayBuffer = await blob.arrayBuffer();
    const safeTenant = (ctx.tenantLabel || "conduttore").replace(/[\\/:*?"<>|]+/g, "_");
    const safeProp = (ctx.propertyLabel || "immobile").replace(/[\\/:*?"<>|]+/g, "_");
    const fname = `Ricevuta_${ctx.number}_${safeProp}_${safeTenant}.pdf`;
    zip.file(fname, arrayBuffer);
  }
  const out = await zip.generateAsync({ type: "blob" });
  return out;
}

export function downloadBlob(filename: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

