// Utility functions for PropertyManager App

import { format, differenceInDays, parseISO, isAfter, isBefore, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import type { 
  Payment, 
  Reminder, 
  CadastralUnit, 
  TaxParameter,
  ReminderWithContext 
} from '@/types';

// ============ FORMATTING ============

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: it });
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMMM yyyy', { locale: it });
}

export function formatMonth(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy', { locale: it });
}

export function formatMonthShort(month: number): string {
  const date = new Date(2024, month - 1, 1);
  return format(date, 'MMM', { locale: it });
}

// ============ DATE CALCULATIONS ============

export function getDaysRemaining(dateString: string): number {
  const targetDate = parseISO(dateString);
  const today = new Date();
  return differenceInDays(targetDate, today);
}

export function isOverdue(dateString: string): boolean {
  const targetDate = parseISO(dateString);
  const today = new Date();
  return isBefore(targetDate, today);
}

export function getContractProgress(startDate: string, endDate: string): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const today = new Date();
  
  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(today, start);
  
  if (elapsedDays <= 0) return 0;
  if (elapsedDays >= totalDays) return 100;
  
  return Math.round((elapsedDays / totalDays) * 100);
}

// ============ PAYMENT STATUS ============

export function getPaymentStatusColor(status: Payment['stato_pagamento']): string {
  switch (status) {
    case 'PAGATO':
      return 'bg-success text-success-foreground';
    case 'PARZIALE':
      return 'bg-warning text-warning-foreground';
    case 'IN_RITARDO':
      return 'bg-destructive text-destructive-foreground';
    case 'ATTESO':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function getPaymentStatusLabel(status: Payment['stato_pagamento']): string {
  switch (status) {
    case 'PAGATO':
      return 'Pagato';
    case 'PARZIALE':
      return 'Parziale';
    case 'IN_RITARDO':
      return 'In ritardo';
    case 'ATTESO':
    default:
      return 'Atteso';
  }
}

// ============ REMINDER HELPERS ============

export function getReminderTypeIcon(type: Reminder['tipo']): string {
  switch (type) {
    case 'MANUTENZIONE':
      return '🔧';
    case 'FISCALE':
      return '📋';
    case 'CONTRATTUALE':
      return '📄';
    case 'ASSICURATIVO':
      return '🛡️';
    case 'ALTRO':
    default:
      return '📌';
  }
}

export function getReminderTypeLabel(type: Reminder['tipo']): string {
  switch (type) {
    case 'MANUTENZIONE':
      return 'Manutenzione';
    case 'FISCALE':
      return 'Fiscale';
    case 'CONTRATTUALE':
      return 'Contrattuale';
    case 'ASSICURATIVO':
      return 'Assicurativo';
    case 'ALTRO':
    default:
      return 'Altro';
  }
}

export function enrichReminder(reminder: Reminder, unitName?: string, propertyName?: string): ReminderWithContext {
  const daysRemaining = getDaysRemaining(reminder.data_scadenza);
  return {
    ...reminder,
    unitName,
    propertyName,
    isOverdue: !reminder.completata && daysRemaining < 0,
    daysRemaining,
  };
}

// ============ IMU CALCULATION ============

const CADASTRAL_MULTIPLIERS: Record<string, number> = {
  'A/1': 160, 'A/2': 160, 'A/3': 160, 'A/4': 160, 'A/5': 160,
  'A/6': 160, 'A/7': 160, 'A/8': 160, 'A/9': 160,
  'A/10': 80,
  'B/1': 140, 'B/2': 140, 'B/3': 140, 'B/4': 140,
  'B/5': 140, 'B/6': 140, 'B/7': 140, 'B/8': 140,
  'C/1': 55,
  'C/2': 160, 'C/6': 160, 'C/7': 160,
  'C/3': 140, 'C/4': 140, 'C/5': 140,
  'D/1': 65, 'D/2': 65, 'D/3': 65, 'D/4': 65,
  'D/6': 65, 'D/7': 65, 'D/8': 65, 'D/9': 65, 'D/10': 65,
  'D/5': 80,
};

export function getCadastralMultiplier(categoria: string): number {
  return CADASTRAL_MULTIPLIERS[categoria.toUpperCase()] || 160;
}

export function calculateIMU(
  cadastralUnits: CadastralUnit[],
  taxParams: TaxParameter
): {
  renditaRivalutata: number;
  baseImponibile: number;
  impostaLorda: number;
  impostaAnnua: number;
  rata1: number;
  rata2: number;
} {
  // Sum base imponibile for all cadastral units
  let totalBaseImponibile = 0;
  let totalRenditaRivalutata = 0;

  cadastralUnits.forEach(cu => {
    const renditaRivalutata = cu.rendita_euro * 1.05;
    const moltiplicatore = getCadastralMultiplier(cu.categoria_catastale);
    const baseImponibile = renditaRivalutata * moltiplicatore;
    
    totalRenditaRivalutata += renditaRivalutata;
    totalBaseImponibile += baseImponibile;
  });

  // Calculate tax
  const impostaLorda = totalBaseImponibile * (taxParams.aliquota_per_mille / 1000) * (taxParams.percentuale_possesso / 100);
  const impostaAnnua = Math.max(0, Math.round((impostaLorda - taxParams.detrazioni_euro) * 100) / 100);

  // Split into installments
  const rata1 = Math.round((impostaAnnua / 2) * 100) / 100;
  const rata2 = Math.round((impostaAnnua - rata1) * 100) / 100;

  return {
    renditaRivalutata: Math.round(totalRenditaRivalutata * 100) / 100,
    baseImponibile: Math.round(totalBaseImponibile * 100) / 100,
    impostaLorda: Math.round(impostaLorda * 100) / 100,
    impostaAnnua,
    rata1,
    rata2,
  };
}

// ============ CEDOLARE SECCA CALCULATION ============

export function calculateCedolareSecca(
  canoniIncassati: number,
  aliquota: 'cedolare_21' | 'cedolare_10'
): number {
  const rate = aliquota === 'cedolare_21' ? 0.21 : 0.10;
  return Math.round(canoniIncassati * rate * 100) / 100;
}

// ============ FINANCIAL CALCULATIONS ============

export function calculateNetProfit(
  entrateLorde: number,
  speseTotali: number,
  imposte: number
): number {
  return Math.round((entrateLorde - speseTotali - imposte) * 100) / 100;
}

export function calculateYield(
  canoniAnnui: number,
  valoreImmobile: number,
  spese: number = 0,
  imposte: number = 0
): { lordo: number; netto: number } {
  if (valoreImmobile <= 0) return { lordo: 0, netto: 0 };
  
  const lordo = (canoniAnnui / valoreImmobile) * 100;
  const netto = ((canoniAnnui - spese - imposte) / valoreImmobile) * 100;
  
  return {
    lordo: Math.round(lordo * 100) / 100,
    netto: Math.round(netto * 100) / 100,
  };
}

// ============ UNIT HELPERS ============

export function getUnitTypeLabel(tipo: string): string {
  const labels: Record<string, string> = {
    appartamento: 'Appartamento',
    locale_commerciale: 'Locale Commerciale',
    box: 'Box',
    cantina: 'Cantina',
    posto_auto: 'Posto Auto',
    altro: 'Altro',
  };
  return labels[tipo] || tipo;
}

export function getContractTypeLabel(tipo: string): string {
  const labels: Record<string, string> = {
    '4+4_abitativo': '4+4 Abitativo',
    '3+2_agevolato': '3+2 Agevolato',
    'transitorio': 'Transitorio',
    'commerciale_6+6': 'Commerciale 6+6',
    'uso_foresteria': 'Uso Foresteria',
    'altro': 'Altro',
  };
  return labels[tipo] || tipo;
}

export function getRegimeLabel(regime: string): string {
  const labels: Record<string, string> = {
    'cedolare_21': 'Cedolare 21%',
    'cedolare_10': 'Cedolare 10%',
    'ordinario_irpef': 'IRPEF Ordinario',
  };
  return labels[regime] || regime;
}
