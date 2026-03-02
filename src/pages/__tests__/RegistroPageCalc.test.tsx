import { describe, it, expect } from "vitest";
import { calculateMonthlyNet, round2 } from "@/lib/utils";

describe("RegistroPage monthly net calculations", () => {
  it("round2 handles basic rounding", () => {
    expect(round2(48.888)).toBe(48.89);
    expect(round2(48.884)).toBe(48.88);
  });

  it("computes nettoMese for Feb with breakdown and no straordinarie", () => {
    const incassatoTotaleMese = 500;
    const affittoIncassatoMese = 440;
    const speseIncassateMese = 60;
    const imuAnnua = 586.56;
    const imuMensile = round2(imuAnnua / 12); // 48.88
    const speseStraordMese = 0;

    const nettoMese = calculateMonthlyNet({
      incassatoTotaleMese,
      speseIncassateMese,
      speseStraordMese,
      imuMensile,
    });

    expect(affittoIncassatoMese).toBe(440);
    expect(nettoMese).toBe(391.12);
  });

  it("computes nettoMese for Jan with straordinarie", () => {
    const incassatoTotaleMese = 500;
    const speseIncassateMese = 60;
    const imuAnnua = 586.56;
    const imuMensile = round2(imuAnnua / 12); // 48.88
    const speseStraordMese = 38;

    const nettoMese = calculateMonthlyNet({
      incassatoTotaleMese,
      speseIncassateMese,
      speseStraordMese,
      imuMensile,
    });

    expect(nettoMese).toBe(353.12);
  });
}
