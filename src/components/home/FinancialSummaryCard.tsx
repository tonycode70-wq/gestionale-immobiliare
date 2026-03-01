import { TrendingUp, TrendingDown, Calendar, AlertCircle, Euro } from 'lucide-react';
import { formatCurrency, formatDate, getDaysRemaining } from '@/lib/propertyUtils';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface FinancialSummaryCardProps {
  year: number;
  nettoReale: number;
  incassoMensePrevisto: number;
  incassoMeseEffettivo: number;
  prossimaScadenza?: { titolo: string; data: string };
  lordoMensile: number;
  meseCorrenteRegistrato: boolean;
  monthsStatus?: Array<'paid' | 'missing' | 'future'>;
  monthlyAmounts?: number[];
  unitsMenu?: Array<{ id: string; nome_interno: string; property_name?: string }>;
  selectedUnitId?: string;
  onSelectUnit?: (unitId: string) => void;
  cedolareMensile?: number;
  imuMensile?: number;
  speseMensili?: number;
  proiezioneNettoAnnua?: number;
}

export function FinancialSummaryCard({
  year,
  nettoReale,
  incassoMensePrevisto,
  incassoMeseEffettivo,
  prossimaScadenza,
  lordoMensile,
  meseCorrenteRegistrato,
  monthsStatus = [],
  monthlyAmounts = [],
  unitsMenu = [],
  selectedUnitId,
  onSelectUnit,
  cedolareMensile = 0,
  imuMensile = 0,
  speseMensili = 0,
  proiezioneNettoAnnua = 0,
}: FinancialSummaryCardProps) {
  const incassoCompleto = incassoMeseEffettivo >= incassoMensePrevisto;
  const giorni = prossimaScadenza ? getDaysRemaining(prossimaScadenza.data) : null;

  return (
    <div className="financial-card">
      {unitsMenu.length > 0 && onSelectUnit && (
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70">Unità attiva</span>
            <span className="text-xs text-white/50">Esercizio {year}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {unitsMenu.map(u => (
              <button
                key={u.id}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs',
                  selectedUnitId === u.id ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'
                )}
                onClick={() => onSelectUnit(u.id)}
                title={`${u.property_name || ''} • ${u.nome_interno}`}
              >
                {u.nome_interno}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-white/70">Pannello di controllo</span>
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60 uppercase tracking-wider">Netto Reale Mese</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-white/60 text-xs cursor-help">ℹ️</span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Cedolare</span><span>{formatCurrency(cedolareMensile)}</span></div>
                    <div className="flex justify-between"><span>IMU (pro-quota)</span><span>{formatCurrency(imuMensile)}</span></div>
                    <div className="flex justify-between"><span>Spese cond.</span><span>{formatCurrency(speseMensili)}</span></div>
                    <div className="pt-1 border-t mt-1 text-xs text-muted-foreground">Netto = Canone − Cedolare − IMU − Spese</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className={cn(
              'text-xl font-bold',
              nettoReale >= 0 ? 'text-green-300' : 'text-red-300'
            )}>
              {formatCurrency(nettoReale)}
            </span>
          </div>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-xs text-white/60 uppercase tracking-wider">Proiezione Anno</span>
            <span className="text-sm font-semibold text-white">{formatCurrency(proiezioneNettoAnnua)}</span>
          </div>
        </div>

        {monthsStatus.length === 12 && (
          <div className="financial-card-inner">
            <div className="grid grid-cols-12 gap-0.5">
              {monthsStatus.map((st, idx) => {
                const amount = monthlyAmounts[idx] || 0;
                const color = st === 'paid' ? 'bg-green-500 border-green-600' : st === 'missing' ? 'bg-red-500 border-red-600' : 'bg-white/20 border-white/30';
                return (
                  <div
                    key={`m-${idx}`}
                    className={cn('h-4 rounded-[3px] border', color)}
                    title={`Mese ${idx + 1}: ${formatCurrency(amount)} • ${st}`}
                  />
                );
              })}
            </div>
          </div>
        )}

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
