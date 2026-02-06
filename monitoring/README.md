# 📊 Monitoring Setup - FleetPulse Platform

Questa directory contiene la configurazione per il monitoring dell'applicazione.

## 🚀 Quick Start

### 1. Avvia i servizi di monitoring

```bash
# Crea file .env per Grafana password (opzionale)
echo "GRAFANA_PASSWORD=your-secure-password" > .env.monitoring

# Avvia Prometheus, Grafana, Alertmanager
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Accedi ai servizi

- **Grafana**: http://localhost:3002
  - Username: `admin`
  - Password: `admin` (o quella in `.env.monitoring`)
  
- **Prometheus**: http://localhost:9090

- **Alertmanager**: http://localhost:9093

### 3. Configura l'API per esporre metriche

L'API deve esporre le metriche su `/api/v1/metrics`. Questo endpoint è già configurato nel `MetricsService`.

### 4. Importa dashboard Grafana

1. Accedi a Grafana
2. Vai su "Dashboards" > "Import"
3. Usa gli ID delle dashboard consigliate:
   - **Node Exporter Full**: 1860
   - **Prometheus Stats**: 2
   - **API Metrics**: Crea custom usando le metriche esposte

## 📁 Struttura Directory

```
monitoring/
├── prometheus.yml          # Configurazione Prometheus
├── alerts.yml              # Regole di alerting
├── alertmanager.yml        # Configurazione Alertmanager
├── grafana/
│   └── provisioning/
│       ├── datasources/    # Data source Prometheus
│       └── dashboards/     # Dashboard provisioning
└── README.md               # Questo file
```

## 🔧 Configurazione

### Prometheus

Modifica `prometheus.yml` per aggiungere nuovi target o modificare gli intervalli di scraping.

### Alertmanager

Modifica `alertmanager.yml` per configurare:
- Webhook (Slack, Discord, etc.)
- Email notifications
- Routing degli alert

### Grafana

Le dashboard possono essere create manualmente o importate da:
- [Grafana Dashboard Library](https://grafana.com/grafana/dashboards/)

## 📊 Metriche Disponibili

L'API espone le seguenti metriche:

- `api_requests_total` - Totale richieste API
- `api_request_duration_seconds` - Durata richieste
- `active_bookings_total` - Prenotazioni attive
- `available_vehicles_total` - Veicoli disponibili
- `pending_maintenances_total` - Manutenzioni in attesa
- `held_cautions_total` - Cauzioni trattenute

## 🚨 Alerting

Gli alert sono configurati in `alerts.yml` e includono:

- **High Error Rate**: Error rate > 5%
- **Slow API Response**: Response time > 2s (p95)
- **Low Available Vehicles**: < 5 veicoli disponibili
- **High CPU/Memory Usage**: > 80% CPU o > 85% Memory
- **Low Disk Space**: < 15% spazio disponibile

## 🔐 Sicurezza

⚠️ **IMPORTANTE**: In produzione:

1. Cambia la password di default di Grafana
2. Configura autenticazione per Prometheus
3. Proteggi gli endpoint di monitoring con reverse proxy
4. Usa HTTPS per tutti i servizi
5. Limita l'accesso alle porte di monitoring

## 📚 Risorse

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
