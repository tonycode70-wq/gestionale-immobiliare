import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  calculateIMU, 
  calculateCedolareSecca, 
  getMonthlyTaxBreakdown,
  COMUNI_ALIQUOTE,
  type IMUResult,
  type CedolareResult 
} from '@/lib/taxCalculations';
import { formatCurrency, formatMonthShort } from '@/lib/propertyUtils';
import { Calculator, Building, Euro, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { Unit } from '@/hooks/useProperties';
import type { Lease } from '@/hooks/useLeases';
import { useCadastral, type CadastralUnit } from '@/hooks/useCadastral';

const imuSchema = z.object({
  comune: z.string().min(1, 'Inserisci il comune'),
  aliquota_per_mille: z.coerce.number().min(0).max(20),
  percentuale_possesso: z.coerce.number().min(1).max(100),
  mesi_possesso: z.coerce.number().min(1).max(12),
  is_prima_casa: z.boolean(),
});

const cedolareSchema = z.object({
  canone_mensile: z.coerce.number().positive('Inserisci il canone'),
  regime: z.enum(['cedolare_21', 'cedolare_10']),
  data_inizio: z.string().min(1),
  data_fine: z.string().min(1),
  is_primo_anno: z.boolean(),
});

interface TaxCalculatorDialogProps {
  unit?: Unit;
  lease?: Lease | null;
  trigger?: React.ReactNode;
}

export function TaxCalculatorDialog({ unit, lease, trigger }: TaxCalculatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [imuResult, setImuResult] = useState<IMUResult | null>(null);
  const [cedolareResult, setCedolareResult] = useState<CedolareResult | null>(null);
  const currentYear = new Date().getFullYear();

  // Fetch cadastral units for this unit (principale + pertinenze)
  const { cadastralUnits, totaleRendita, isLoading: loadingCadastral } = useCadastral(unit?.id);

  const imuForm = useForm({
    resolver: zodResolver(imuSchema),
    defaultValues: {
      comune: 'desenzano del garda',
      aliquota_per_mille: 10.6, // Desenzano del Garda default
      percentuale_possesso: 100,
      mesi_possesso: 12,
      is_prima_casa: false, // Seconde case
    },
  });

  const cedolareForm = useForm({
    resolver: zodResolver(cedolareSchema),
    defaultValues: {
      canone_mensile: lease?.canone_mensile || 800,
      regime: (lease?.regime_locativo as 'cedolare_21' | 'cedolare_10') || 'cedolare_21',
      data_inizio: lease?.data_inizio || `${currentYear}-01-01`,
      data_fine: lease?.data_fine || `${currentYear}-12-31`,
      is_primo_anno: lease?.primo_anno_locazione ?? true,
    },
  });

  const calculateImuHandler = (data: z.infer<typeof imuSchema>) => {
    // Use cadastral units from database if available, otherwise use empty array
    const cadastralData = cadastralUnits.length > 0
      ? cadastralUnits.map(cu => ({
          categoria_catastale: cu.categoria_catastale,
          rendita_euro: cu.rendita_euro,
        }))
      : [{ categoria_catastale: 'A/2', rendita_euro: 500 }];

    const result = calculateIMU(
      cadastralData,
      {
        anno: currentYear,
        comune: data.comune,
        aliquota_per_mille: data.aliquota_per_mille,
        percentuale_possesso: data.percentuale_possesso,
        mesi_possesso: data.mesi_possesso,
        is_prima_casa: data.is_prima_casa,
        detrazioni_euro: 0,
      }
    );
    setImuResult(result);
  };

  const calculateCedolareHandler = (data: z.infer<typeof cedolareSchema>) => {
    const result = calculateCedolareSecca({
      anno: currentYear,
      regime: data.regime,
      dataInizioContratto: data.data_inizio,
      dataFineContratto: data.data_fine,
      canoneAnnuo: data.canone_mensile * 12,
      isPrimoAnno: data.is_primo_anno,
    });
    setCedolareResult(result);
  };

  const monthlyBreakdown = getMonthlyTaxBreakdown(currentYear, imuResult, cedolareResult);
  const monthsWithTaxes = monthlyBreakdown.filter(m => m.totale > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Calculator className="h-4 w-4 mr-2" />
            Calcolatore Fiscale
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calcolatore IMU e Cedolare Secca
          </DialogTitle>
          <DialogDescription>
            Calcola le imposte per seconde case - Anno {currentYear}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="imu" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="imu">IMU</TabsTrigger>
            <TabsTrigger value="cedolare">Cedolare</TabsTrigger>
            <TabsTrigger value="riepilogo">Riepilogo</TabsTrigger>
          </TabsList>

          {/* IMU TAB */}
          <TabsContent value="imu" className="space-y-4 mt-4">
            {/* Cadastral Units Summary */}
            {cadastralUnits.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">Unità catastali incluse nel calcolo</h4>
                <div className="space-y-1 text-sm">
                  {cadastralUnits.map((cu, idx) => (
                    <div key={cu.id} className="flex justify-between text-muted-foreground">
                      <span>{cu.tipo_unita === 'principale' ? '🏠' : '🅿️'} {cu.categoria_catastale}</span>
                      <span>{formatCurrency(cu.rendita_euro)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-1 border-t mt-1">
                    <span>Totale rendita</span>
                    <span>{formatCurrency(totaleRendita)}</span>
                  </div>
                </div>
              </div>
            )}

            {cadastralUnits.length === 0 && (
              <div className="p-3 bg-warning/10 rounded-lg text-sm text-warning-foreground">
                ⚠️ Nessun dato catastale inserito. Aggiungi i dati catastali nella sezione "Catasto" per un calcolo preciso.
              </div>
            )}

            <Form {...imuForm}>
              <form onSubmit={imuForm.handleSubmit(calculateImuHandler)} className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={imuForm.control}
                    name="comune"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comune</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Desenzano del Garda" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={imuForm.control}
                    name="aliquota_per_mille"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aliquota (‰)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={imuForm.control}
                    name="percentuale_possesso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>% Possesso</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={100} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={imuForm.control}
                    name="mesi_possesso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mesi Possesso</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={12} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={imuForm.control}
                  name="is_prima_casa"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Prima Casa</FormLabel>
                        <p className="text-xs text-muted-foreground">Esente IMU (non applicabile per seconde case)</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcola IMU
                </Button>
              </form>
            </Form>

            {imuResult && (
              <div className="financial-card">
                <h3 className="font-semibold text-white mb-3">Risultato IMU {currentYear}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/80">
                    <span>Rendita rivalutata (5%)</span>
                    <span>{formatCurrency(imuResult.renditaRivalutata)}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Base imponibile</span>
                    <span>{formatCurrency(imuResult.baseImponibile)}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Mesi effettivi</span>
                    <span>{imuResult.mesiEffettivi}/12</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold pt-2 border-t border-white/20">
                    <span>IMU Annua</span>
                    <span>{formatCurrency(imuResult.impostaAnnua)}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Acconto (16/06)</span>
                    <span>{formatCurrency(imuResult.acconto)}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Saldo (16/12)</span>
                    <span>{formatCurrency(imuResult.saldo)}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* CEDOLARE TAB */}
          <TabsContent value="cedolare" className="space-y-4 mt-4">
            <Form {...cedolareForm}>
              <form onSubmit={cedolareForm.handleSubmit(calculateCedolareHandler)} className="space-y-4">
                <FormField
                  control={cedolareForm.control}
                  name="canone_mensile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canone Mensile (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={cedolareForm.control}
                  name="regime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regime Cedolare</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cedolare_21">Cedolare Secca 21%</SelectItem>
                          <SelectItem value="cedolare_10">Cedolare Secca 10% (canone concordato)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={cedolareForm.control}
                    name="data_inizio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Inizio Contratto</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={cedolareForm.control}
                    name="data_fine"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Fine Contratto</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={cedolareForm.control}
                  name="is_primo_anno"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Primo Anno di Locazione</FormLabel>
                        <p className="text-xs text-muted-foreground">Solo saldo l'anno successivo (no acconti)</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcola Cedolare
                </Button>
              </form>
            </Form>

            {cedolareResult && (
              <div className="financial-card">
                <h3 className="font-semibold text-white mb-3">Risultato Cedolare Secca {currentYear}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/80">
                    <span>Aliquota</span>
                    <span>{cedolareResult.aliquota}%</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Mesi effettivi</span>
                    <span>{cedolareResult.mesiEffettivi}/12</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Base imponibile</span>
                    <span>{formatCurrency(cedolareResult.baseImponibile)}</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold pt-2 border-t border-white/20">
                    <span>Imposta Totale</span>
                    <span>{formatCurrency(cedolareResult.impostaTotale)}</span>
                  </div>
                </div>
                
                {cedolareResult.rate.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <h4 className="font-medium text-white mb-2">Rate</h4>
                    <div className="space-y-2">
                      {cedolareResult.rate.map((rata, idx) => (
                        <div key={idx} className="flex justify-between text-white/80 text-sm">
                          <span>{rata.descrizione}</span>
                          <span>{formatCurrency(rata.importo)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* RIEPILOGO TAB */}
          <TabsContent value="riepilogo" className="space-y-4 mt-4">
            {(imuResult || cedolareResult) ? (
              <>
                <div className="mobile-card">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Scadenziario {currentYear}
                  </h3>
                  {monthsWithTaxes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nessuna scadenza fiscale calcolata</p>
                  ) : (
                    <div className="space-y-2">
                      {monthsWithTaxes.map(month => (
                        <div key={month.mese} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium capitalize">
                              {formatMonthShort(month.mese)} {month.anno}
                            </span>
                            <span className="font-semibold text-primary">
                              {formatCurrency(month.totale)}
                            </span>
                          </div>
                          {month.scadenze.map((scadenza, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground flex justify-between">
                              <span>{scadenza.tipo}</span>
                              <span>{formatCurrency(scadenza.importo)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="financial-card">
                  <h3 className="font-semibold text-white mb-3">Totale Imposte {currentYear}</h3>
                  <div className="space-y-2 text-sm">
                    {imuResult && (
                      <div className="flex justify-between text-white/80">
                        <span>IMU</span>
                        <span>{formatCurrency(imuResult.impostaAnnua)}</span>
                      </div>
                    )}
                    {cedolareResult && (
                      <div className="flex justify-between text-white/80">
                        <span>Cedolare Secca</span>
                        <span>{formatCurrency(cedolareResult.impostaTotale)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-bold pt-2 border-t border-white/20 text-lg">
                      <span>TOTALE</span>
                      <span>
                        {formatCurrency((imuResult?.impostaAnnua || 0) + (cedolareResult?.impostaTotale || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mobile-card text-center py-8">
                <Euro className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Calcola IMU e/o Cedolare Secca per vedere il riepilogo</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
