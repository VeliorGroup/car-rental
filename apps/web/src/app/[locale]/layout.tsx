import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import '../globals.css';
import { Providers } from '../providers';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from "@/components/theme-provider"
import { ErrorBoundary } from '@/components/error-boundary';
import { AnalyticsProvider } from '@/components/analytics-provider';


const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

// Generate static params for all valid locales
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// SEO Metadata - locale-aware
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const titlesByLocale: Record<string, string> = {
    en: 'FleetPulse - Fleet Management & Car Rental Software',
    it: 'FleetPulse - Software Gestione Flotta & Autonoleggio',
    sq: 'FleetPulse - Software Menaxhimi Flote & Makinash me Qira',
    de: 'FleetPulse - Flottenmanagement & Autovermietung Software',
    fr: 'FleetPulse - Logiciel de Gestion de Flotte & Location',
    es: 'FleetPulse - Software de Gestión de Flotas & Alquiler',
  };

  const descriptionsByLocale: Record<string, string> = {
    en: 'Modern fleet management and car rental platform. Manage vehicles, bookings, customers, and operations all in one place.',
    it: 'Piattaforma moderna per gestione flotta e autonoleggio. Gestisci veicoli, prenotazioni, clienti e operazioni in un unico posto.',
    sq: 'Platformë moderne për menaxhimin e flotës dhe qiranë e makinave. Menaxhoni automjetet, rezervimet, klientët dhe operacionet.',
    de: 'Moderne Flottenmanagement- und Autovermietungsplattform. Verwalten Sie Fahrzeuge, Buchungen, Kunden und Betrieb.',
    fr: 'Plateforme moderne de gestion de flotte et location de voitures. Gérez véhicules, réservations, clients et opérations.',
    es: 'Plataforma moderna de gestión de flotas y alquiler de coches. Gestione vehículos, reservas, clientes y operaciones.',
  };

  const title = titlesByLocale[locale] || titlesByLocale.en;
  const description = descriptionsByLocale[locale] || descriptionsByLocale.en;

  return {
    title: {
      default: title,
      template: '%s | FleetPulse',
    },
    description,
    keywords: [
      'fleet management',
      'car rental',
      'vehicle management',
      'booking system',
      'FleetPulse',
      'autonoleggio',
    ],
    authors: [{ name: 'FleetPulse' }],
    creator: 'FleetPulse',
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL || 'https://app.fleetpulse.io'
    ),
    openGraph: {
      type: 'website',
      locale,
      url: '/',
      siteName: 'FleetPulse',
      title,
      description,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'FleetPulse - Fleet Management Platform',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
      creator: '@fleetpulse',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    icons: {
      icon: '/favicon.ico',
      apple: '/icons/icon-192x192.png',
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="FleetPulse" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FleetPulse" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.className} ${inter.variable} antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              forcedTheme="light"
              disableTransitionOnChange
            >
              <AnalyticsProvider>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </AnalyticsProvider>
              <Toaster />
            </ThemeProvider>
          </Providers>
        </NextIntlClientProvider>
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
