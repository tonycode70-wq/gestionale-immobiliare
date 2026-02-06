import { Check, Euro, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, getPaymentStatusColor, getPaymentStatusLabel } from '@/lib/propertyUtils';
import { StatusBadge } from '@/components/common';
import type { Payment, Lease, Tenant } from '@/types';

interface TodayPaymentsProps {
  payments: Array<{
    payment: Payment;
    lease: Lease;
    tenant?: Tenant;
    unitName: string;
  }>;
  onMarkPaid?: (paymentId: string) => void;
}

export function TodayPayments({ payments, onMarkPaid }: TodayPaymentsProps) {
  const pendingPayments = payments.filter(p => 
    p.payment.stato_pagamento === 'ATTESO' || p.payment.stato_pagamento === 'IN_RITARDO'
  );

  if (pendingPayments.length === 0) {
    return (
      <div className="mobile-card text-center py-6">
        <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-2">
          <Check className="h-6 w-6 text-success" />
        </div>
        <p className="text-sm text-muted-foreground">Tutti gli incassi di oggi sono registrati</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Euro className="h-4 w-4" />
        Incassi oggi
      </h3>

      {pendingPayments.map(({ payment, lease, tenant, unitName }) => (
        <div key={payment.id} className="mobile-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-foreground">{unitName}</h4>
              <p className="text-sm text-muted-foreground">
                {tenant?.tipo_soggetto === 'persona_fisica' 
                  ? `${tenant?.nome} ${tenant?.cognome}`
                  : tenant?.ragione_sociale || 'Conduttore'}
              </p>
            </div>
            <StatusBadge 
              status={payment.stato_pagamento === 'IN_RITARDO' ? 'error' : 'warning'}
            >
              {getPaymentStatusLabel(payment.stato_pagamento)}
            </StatusBadge>
          </div>

          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">Importo previsto</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(payment.importo_totale_previsto)}
            </span>
          </div>

          {onMarkPaid && (
            <Button
              onClick={() => onMarkPaid(payment.id)}
              className="w-full btn-mobile bg-success hover:bg-success/90"
            >
              <Check className="h-4 w-4 mr-2" />
              Segna come pagato oggi
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
