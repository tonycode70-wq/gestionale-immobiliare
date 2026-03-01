// Italian Tax Calculations: IMU and Cedolare Secca
// Specifically configured for second homes (seconde case)

import { differenceInMonths, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

// ============ TYPES ============

export interface CadastralData {
  categoria_catastale: string;
  rendita_euro: number;
}

export interface IMUConfig {
  anno: number;
  comune: string;
  aliquota_per_mille: number; // Desenzano del Garda default: 10.6‰
  percentuale_possesso: number; // 0-100
  mesi_possesso: number; // 1-12
  is_prima_casa: boolean;
  detrazioni_euro: number;
  riduzione_canone_concordato?: boolean;
}

export interface IMUResult {
  renditaRivalutata: number;
  baseImponibile: number;
  impostaLorda: number;
  impostaAnnua: number;
  mesiEffettivi: number;
  acconto: number; // 16 giugno
  saldo: number;   // 16 dicembre
  scadenzaAcconto: string;
  scadenzaSaldo: string;
}

export interface CedolareConfig {
  anno: number;
  regime: 'cedolare_21' | 'cedolare_10';
  dataInizioContratto: string;
  dataFineContratto: string;
  canoneAnnuo: number;
  isPrimoAnno: boolean;
}

export interface CedolareRata {
  tipo: 'acconto_primo' | 'acconto_secondo' | 'saldo';
  scadenza: string;
  importo: number;
  descrizione: string;
}

export interface CedolareResult {
  aliquota: number;
  baseImponibile: number;
  impostaTotale: number;
  mesiEffettivi: number;
  rate: CedolareRata[];
  annoSuccessivo: {
    acconto1: number;
    acconto2: number;
    saldo: number;
  } | null;
}

// ============ IMU CALCULATIONS ============

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

// Default IMU rates for common municipalities
export const COMUNI_ALIQUOTE: Record<string, number> = {
  'desenzano del garda': 10.6,
  'milano': 10.6,
  'roma': 10.6,
  'brescia': 10.6,
  'verona': 10.6,
};

export function getCadastralMultiplier(categoria: string): number {
  return CADASTRAL_MULTIPLIERS[categoria.toUpperCase()] || 160;
}

export function calculateIMU(
  cadastralData: CadastralData[],
  config: IMUConfig
): IMUResult {
  // 1. Calculate total base imponibile
  let totalRenditaRivalutata = 0;
  let totalBaseImponibile = 0;

  cadastralData.forEach(cu => {
    const renditaRivalutata = cu.rendita_euro * 1.05; // Rivalutazione 5%
    const moltiplicatore = getCadastralMultiplier(cu.categoria_catastale);
    const baseImponibile = renditaRivalutata * moltiplicatore;
    
    totalRenditaRivalutata += renditaRivalutata;
    totalBaseImponibile += baseImponibile;
  });

  // 2. Calculate gross tax with ownership percentage
  const impostaLorda = totalBaseImponibile * (config.aliquota_per_mille / 1000) * (config.percentuale_possesso / 100);

  // 3. Apply months of ownership (for partial year ownership)
  const mesiEffettivi = Math.min(12, Math.max(1, config.mesi_possesso));
  const impostaProRata = impostaLorda * (mesiEffettivi / 12);

  // 4. Apply deductions (only for prima casa, which shouldn't apply for seconde case)
  let impostaAnnua = config.is_prima_casa 
    ? Math.max(0, impostaProRata - config.detrazioni_euro)
    : impostaProRata;

  // 4b. Reduction for canone concordato (-25%)
  if (config.riduzione_canone_concordato) {
    impostaAnnua = impostaAnnua * 0.75;
  }

  // 5. Round to 2 decimals
  const impostaArrotondata = Math.round(impostaAnnua * 100) / 100;

  // 6. Split into installments
  const acconto = Math.round((impostaArrotondata / 2) * 100) / 100;
  const saldo = Math.round((impostaArrotondata - acconto) * 100) / 100;

  return {
    renditaRivalutata: Math.round(totalRenditaRivalutata * 100) / 100,
    baseImponibile: Math.round(totalBaseImponibile * 100) / 100,
    impostaLorda: Math.round(impostaLorda * 100) / 100,
    impostaAnnua: impostaArrotondata,
    mesiEffettivi,
    acconto,
    saldo,
    scadenzaAcconto: `${config.anno}-06-16`,
    scadenzaSaldo: `${config.anno}-12-16`,
  };
}

// ============ CEDOLARE SECCA CALCULATIONS ============

export function calculateMesiEffettivi(
  anno: number,
  dataInizio: string,
  dataFine: string
): number {
  const inizioAnno = new Date(anno, 0, 1);
  const fineAnno = new Date(anno, 11, 31);
  
  const contratto_inizio = parseISO(dataInizio);
  const contratto_fine = parseISO(dataFine);
  
  // Contract must overlap with the year
  if (contratto_fine < inizioAnno || contratto_inizio > fineAnno) {
    return 0;
  }

  // Calculate effective start and end within the year
  const effectiveStart = contratto_inizio > inizioAnno ? contratto_inizio : inizioAnno;
  const effectiveEnd = contratto_fine < fineAnno ? contratto_fine : fineAnno;

  // Count full months
  let mesi = 0;
  let currentDate = startOfMonth(effectiveStart);
  const endMonth = endOfMonth(effectiveEnd);

  while (currentDate <= endMonth) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    // Check if more than 15 days of the month are covered
    const overlapStart = effectiveStart > monthStart ? effectiveStart : monthStart;
    const overlapEnd = effectiveEnd < monthEnd ? effectiveEnd : monthEnd;
    
    const daysInOverlap = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (daysInOverlap >= 15) {
      mesi++;
    }
    
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  return Math.min(12, mesi);
}

export function calculateCedolareSecca(config: CedolareConfig): CedolareResult {
  const aliquota = config.regime === 'cedolare_21' ? 0.21 : 0.10;
  
  // Derive contract year number
  const startYear = parseISO(config.dataInizioContratto).getFullYear();
  const annoContratto = Math.max(1, config.anno - startYear + 1);

  // Calculate effective months for the current year
  const mesiEffettivi = calculateMesiEffettivi(
    config.anno,
    config.dataInizioContratto,
    config.dataFineContratto
  );
  // Calculate effective months for previous year (for second-year single payment and saldo)
  const mesiEffPrev = calculateMesiEffettivi(
    config.anno - 1,
    config.dataInizioContratto,
    config.dataFineContratto
  );

  // Pro-rata base imponibile for current and previous year
  const baseImponibile = (config.canoneAnnuo / 12) * mesiEffettivi;
  const baseImponibilePrev = (config.canoneAnnuo / 12) * mesiEffPrev;
  const impostaAnnoCorrente = Math.round(baseImponibile * aliquota * 100) / 100;
  const impostaAnnoPrecedente = Math.round(baseImponibilePrev * aliquota * 100) / 100;

  const rate: CedolareRata[] = [];

  // Year 1: nessun versamento; cedolare del primo anno si paga nel secondo anno (rata unica 30 novembre)
  if (annoContratto === 1 || config.isPrimoAnno) {
    rate.push({
      tipo: 'saldo',
      scadenza: `${config.anno + 1}-11-30`,
      importo: impostaAnnoCorrente,
      descrizione: `Rata unica cedolare secca ${config.anno} (primo anno - ${mesiEffettivi} mesi)`,
    });

    return {
      aliquota: aliquota * 100,
      baseImponibile: Math.round(baseImponibile * 100) / 100,
      impostaTotale: impostaAnnoCorrente,
      mesiEffettivi,
      rate,
      annoSuccessivo: null,
    };
  }

  // Year 2: Versamento in rata unica entro il 30 novembre pari al 100% della cedolare del primo anno
  if (annoContratto === 2) {
    rate.push({
      tipo: 'saldo',
      scadenza: `${config.anno}-11-30`,
      importo: impostaAnnoPrecedente,
      descrizione: `Rata unica cedolare secca ${config.anno - 1}`,
    });

    return {
      aliquota: aliquota * 100,
      baseImponibile: Math.round(baseImponibile * 100) / 100,
      impostaTotale: impostaAnnoCorrente,
      mesiEffettivi,
      rate,
      annoSuccessivo: {
        acconto1: Math.round(impostaAnnoCorrente * 0.40 * 100) / 100,
        acconto2: Math.round(impostaAnnoCorrente * 0.60 * 100) / 100,
        saldo: impostaAnnoPrecedente, // per completezza informativa
      },
    };
  }

  // Year 3+:
  // - Giugno (anno N): 40% cedolare anno corrente + saldo anno precedente (entro 30 giugno anno N)
  // - Novembre (anno N): 60% cedolare anno corrente
  const acconto1 = Math.round(impostaAnnoCorrente * 0.40 * 100) / 100;
  const acconto2 = Math.round(impostaAnnoCorrente * 0.60 * 100) / 100;
  const saldoAnnoPrec = impostaAnnoPrecedente;

  rate.push({
    tipo: 'acconto_primo',
    scadenza: `${config.anno}-06-30`,
    importo: acconto1,
    descrizione: `1° Acconto cedolare secca ${config.anno} (40% dell'anno corrente)`,
  });

  rate.push({
    tipo: 'saldo',
    scadenza: `${config.anno}-06-30`,
    importo: saldoAnnoPrec,
    descrizione: `Saldo cedolare secca ${config.anno - 1}`,
  });

  rate.push({
    tipo: 'acconto_secondo',
    scadenza: `${config.anno}-11-30`,
    importo: acconto2,
    descrizione: `2° Acconto cedolare secca ${config.anno} (60% dell'anno corrente)`,
  });

  return {
    aliquota: aliquota * 100,
    baseImponibile: Math.round(baseImponibile * 100) / 100,
    impostaTotale: impostaAnnoCorrente,
    mesiEffettivi,
    rate,
    annoSuccessivo: {
      acconto1,
      acconto2,
      saldo: saldoAnnoPrec,
    },
  };
}

// ============ MONTHLY BREAKDOWN ============

export interface MonthlyTaxBreakdown {
  mese: number;
  anno: number;
  imu: number;
  cedolare: number;
  totale: number;
  scadenze: Array<{
    tipo: string;
    importo: number;
    descrizione: string;
  }>;
}

export function getMonthlyTaxBreakdown(
  anno: number,
  imuResult: IMUResult | null,
  cedolareResult: CedolareResult | null
): MonthlyTaxBreakdown[] {
  const months: MonthlyTaxBreakdown[] = [];

  for (let mese = 1; mese <= 12; mese++) {
    const scadenze: Array<{ tipo: string; importo: number; descrizione: string }> = [];
    let imuMese = 0;
    let cedolareMese = 0;

    // IMU deadlines
    if (imuResult) {
      if (mese === 6) {
        scadenze.push({
          tipo: 'IMU Acconto',
          importo: imuResult.acconto,
          descrizione: `Acconto IMU ${anno} - scadenza 16/06`,
        });
        imuMese = imuResult.acconto;
      }
      if (mese === 12) {
        scadenze.push({
          tipo: 'IMU Saldo',
          importo: imuResult.saldo,
          descrizione: `Saldo IMU ${anno} - scadenza 16/12`,
        });
        imuMese = imuResult.saldo;
      }
    }

    // Cedolare secca deadlines
    if (cedolareResult) {
      cedolareResult.rate.forEach(rata => {
        const rataDate = parseISO(rata.scadenza);
        if (rataDate.getFullYear() === anno && rataDate.getMonth() + 1 === mese) {
          scadenze.push({
            tipo: rata.tipo === 'saldo' ? 'Cedolare Saldo' : 'Cedolare Acconto',
            importo: rata.importo,
            descrizione: rata.descrizione,
          });
          cedolareMese += rata.importo;
        }
      });
    }

    months.push({
      mese,
      anno,
      imu: imuMese,
      cedolare: cedolareMese,
      totale: imuMese + cedolareMese,
      scadenze,
    });
  }

  return months;
}
