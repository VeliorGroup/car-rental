'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wallet, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight,
  CreditCard, Clock, CheckCircle2, XCircle, Loader2, Info
} from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface WalletSummary {
  pendingBalance: number;
  totalPaidOut: number;
  totalPlatformFees: number;
  totalGrossEarnings: number;
  nextPayout: {
    amount: number;
    scheduledFor: string;
  } | null;
  marketplaceBookings: number;
}

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  scheduledFor: string;
  processedAt: string | null;
  transactionId: string | null;
  createdAt: string;
}

interface Earning {
  id: string;
  date: string;
  vehicle: string;
  customer: string;
  grossAmount: number;
  platformFee: number;
  netEarnings: number;
}

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-yellow-600" />,
  PROCESSING: <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  FAILED: <XCircle className="h-4 w-4 text-red-600" />,
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export default function WalletPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [walletRes, payoutsRes, earningsRes] = await Promise.all([
          api.get('/payouts/wallet'),
          api.get('/payouts?limit=10'),
          api.get('/payouts/earnings'),
        ]);
        setSummary(walletRes.data);
        setPayouts(payoutsRes.data.payouts || []);
        setEarnings(earningsRes.data || []);
      } catch (error) {
        console.error('Failed to load wallet data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" />
            Wallet Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestisci i tuoi guadagni dal marketplace
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Pending Balance */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo disponibile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              €{summary?.pendingBalance?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Pronto per il payout
            </p>
          </CardContent>
        </Card>

        {/* Total Gross */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Guadagni lordi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              €{summary?.totalGrossEarnings?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Da {summary?.marketplaceBookings || 0} prenotazioni
            </p>
          </CardContent>
        </Card>

        {/* Platform Fees */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Commissioni piattaforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              €{summary?.totalPlatformFees?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              15% su ogni prenotazione
            </p>
          </CardContent>
        </Card>

        {/* Total Paid Out */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Totale pagato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              €{summary?.totalPaidOut?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Trasferito sul tuo conto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Payout */}
      {summary?.nextPayout && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="font-semibold">Prossimo payout programmato</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(summary.nextPayout.scheduledFor), 'EEEE d MMMM yyyy', { locale: it })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                €{summary.nextPayout.amount.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-600" />
              Guadagni recenti
            </CardTitle>
            <CardDescription>
              Ultime prenotazioni dal marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earnings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessuna prenotazione marketplace ancora
              </p>
            ) : (
              <div className="space-y-3">
                {earnings.slice(0, 5).map((earning) => (
                  <div
                    key={earning.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{earning.vehicle}</p>
                      <p className="text-sm text-muted-foreground">
                        {earning.customer} • {format(new Date(earning.date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+€{earning.netEarnings.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        -€{earning.platformFee.toFixed(2)} comm.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-blue-600" />
              Storico payout
            </CardTitle>
            <CardDescription>
              I tuoi trasferimenti recenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessun payout ancora effettuato
              </p>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {statusIcons[payout.status]}
                      <div>
                        <p className="font-medium">
                          €{payout.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payout.scheduledFor), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusColors[payout.status]}>
                      {payout.status === 'PENDING' && 'In attesa'}
                      {payout.status === 'PROCESSING' && 'In elaborazione'}
                      {payout.status === 'COMPLETED' && 'Completato'}
                      {payout.status === 'FAILED' && 'Fallito'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission Info */}
      <Card className="bg-muted/50">
        <CardContent className="flex items-start gap-4 py-6">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Come funzionano le commissioni</p>
            <p className="text-muted-foreground">
              Per ogni prenotazione dal marketplace, la piattaforma trattiene il 15% come commissione.
              I payout vengono elaborati settimanalmente. Il saldo minimo per il payout è €50.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
