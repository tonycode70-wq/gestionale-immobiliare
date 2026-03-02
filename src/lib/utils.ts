import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

export function calculateMonthlyNet(params: {
  incassatoTotaleMese: number;
  speseIncassateMese: number;
  speseStraordMese: number;
  imuMensile: number;
}): number {
  const { incassatoTotaleMese, speseIncassateMese, speseStraordMese, imuMensile } = params;
  return round2(incassatoTotaleMese - speseIncassateMese - speseStraordMese - imuMensile);
}
