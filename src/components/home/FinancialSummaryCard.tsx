import { TrendingUp, TrendingDown, Calendar, AlertCircle, Euro } from 'lucide-react';
import { formatCurrency, formatDate, getDaysRemaining } from '@/lib/propertyUtils';
import { cn } from '@/lib/utils';

interface FinancialSummaryCardProps {
  year: number;
  nettoReale: number;
  incassoMensePrevisto: number;
  incassoMeseEffettivo: number;
  prossimaScadenza?: { titolo: string; data: string };
  lordoMensile: number;
  meseCorrenteRegistrato: boolean;
}

export function FinancialSummaryCard({
  year,
  nettoReale,
  incassoMensePrevisto,
  incassoMeseEffettivo,
  prossimaScadenza,
  lordoMensile,
  meseCorrenteRegistrato,
}: FinancialSummaryCardProps) {
  const incassoCompleto = incassoMeseEffettivo >= incassoMensePrevisto;
  const giorni = prossimaScadenza ? getDaysRemaining(prossimaScadenza.data) : null;

  return (
    <div className="financial-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-white/70">Esercizio {year}</span>
        <div className="flex items-center gap-1">
          {nettoReale >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-300" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-300" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Netto Reale */}
        <div className="financial-card-inner">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/60 uppercase tracking-wider">Netto Reale Mese</span>
            <span className={cn(
              'text-xl font-bold',
              nettoReale >= 0 ? 'text-green-300' : 'text-red-300'
            )}>
              {formatCurrency(nettoReale)}
            </span>
          </div>
        </div>

        {/* Incasso Mensile */}
        <div className="financial-card-inner">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-white/60" />
              <span className="text-xs text-white/60 uppercase tracking-wider">Incasso Mensile</span>
            </div>
            <div className="text-right">
              <span className={cn(
                'text-lg font-semibold',
                incassoCompleto ? 'text-green-300' : 'text-yellow-300'
              )}>
                {formatCurrency(incassoMeseEffettivo)}
              </span>
              <span className="text-xs text-white/50 ml-1">
                / {formatCurrency(incassoMensePrevisto)}
              </span>
            </div>
          </div>
        </div>

        {/* Prossima Scadenza */}
        {prossimaScadenza && (
          <div className="financial-card-inner">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/60 uppercase tracking-wider">Prossima Scadenza</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-white">{prossimaScadenza.titolo}</span>
                <span className={cn(
                  'text-xs ml-2',
                  giorni && giorni < 7 ? 'text-yellow-300' : 'text-white/60'
                )}>
                  {giorni && giorni > 0 ? `tra ${giorni} gg` : formatDate(prossimaScadenza.data)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Lordo Mensile */}
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-xs text-white/60 uppercase tracking-wider">Lordo Mensile Totale</span>
          <span className="text-base font-semibold text-white">
            {formatCurrency(lordoMensile)}
          </span>
        </div>
      </div>

      {/* Warning se incasso non registrato */}
      {!meseCorrenteRegistrato && (
        <div className="mt-4 flex items-center gap-2 p-2 bg-yellow-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-300" />
          <span className="text-xs text-yellow-200">
            Incasso mese corrente non completo
          </span>
        </div>
      )}
    </div>
  );
}
