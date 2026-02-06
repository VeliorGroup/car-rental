/**
 * Contract PDF Generator
 * Generates rental contracts with company logo, booking details, and terms
 * Based on professional car rental contract template
 */

export interface ContractData {
  // Company Info
  company: {
    name: string
    logoUrl?: string
    address?: string
    city?: string
    country?: string
    phone?: string
    vatNumber?: string
    email?: string
    contractTerms?: string
  }
  
  // Booking Info
  booking: {
    reference: string
    pickupDate: string
    pickupTime?: string
    returnDate: string
    returnTime?: string
    pickupLocation?: string
    returnLocation?: string
    totalPrice: number
    dailyPrice: number
    days: number
    deposit?: number
    extras?: { name: string; price: number }[]
  }
  
  // Vehicle Info
  vehicle: {
    brand: string
    model: string
    year: number
    licensePlate: string
    category?: string
    fuelType?: string
    transmission?: string
    currentKm?: number
    fuelLevel?: string
  }
  
  // Customer Info
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address?: string
    city?: string
    country?: string
    licenseNumber?: string
    passportNumber?: string
    licenseExpiry?: string
    dateOfBirth?: string
  }
  
  // Contract Date
  contractDate: string
}

export function generateContractHTML(data: ContractData): string {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '00:00'
    }
  }

  const logoHTML = data.company.logoUrl 
    ? `<img src="${data.company.logoUrl}" alt="${data.company.name}" class="logo" />`
    : `<div class="company-name">${data.company.name}</div>`

  const dailyPrice = Number(data.booking.dailyPrice || 0)
  const totalPrice = Number(data.booking.totalPrice || 0)
  const deposit = Number(data.booking.deposit || 0)

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contratto di Noleggio - ${data.booking.reference}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      padding: 15px;
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    
    /* Header */
    .header {
      text-align: center;
      border: 3px solid #000;
      border-radius: 20px;
      padding: 15px;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
    }
    .logo {
      max-height: 60px;
      max-width: 180px;
      object-fit: contain;
    }
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 16px;
      font-weight: bold;
      color: #666;
      margin: 5px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .contact-info {
      font-size: 12px;
      color: #c00;
      font-weight: bold;
      margin-top: 5px;
    }
    .police-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 20px;
      font-size: 11px;
      color: #666;
    }
    
    /* Main table */
    .contract-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    .contract-table td {
      border: 1px solid #000;
      padding: 6px 8px;
      vertical-align: top;
    }
    .contract-table .label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      display: block;
      margin-bottom: 2px;
    }
    .contract-table .value {
      font-size: 12px;
      font-weight: bold;
      color: #000;
      min-height: 18px;
    }
    .contract-table .col-33 {
      width: 33.33%;
    }
    .contract-table .col-50 {
      width: 50%;
    }
    .contract-table .highlight {
      background-color: #fffde7;
    }
    
    /* Terms section */
    .terms {
      border: 1px solid #000;
      padding: 10px;
      margin: 10px 0;
      font-size: 9px;
      line-height: 1.5;
    }
    .terms h4 {
      font-size: 10px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .terms ul {
      margin-left: 15px;
    }
    .terms li {
      margin-bottom: 3px;
    }
    .warning {
      color: #c00;
      font-weight: bold;
      text-decoration: underline;
    }
    
    /* Signatures */
    .signatures {
      display: flex;
      border: 1px solid #000;
      margin: 10px 0;
    }
    .sig-box {
      flex: 1;
      padding: 10px;
      text-align: center;
      border-right: 1px solid #000;
    }
    .sig-box:last-child {
      border-right: none;
    }
    .sig-label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .sig-line {
      height: 50px;
      border-bottom: 1px solid #000;
      margin-bottom: 5px;
    }
    .sig-name {
      font-size: 11px;
      font-weight: bold;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      font-size: 10px;
      margin-top: 15px;
      padding: 10px;
      border: 2px solid #c00;
      background: #fff8f8;
      color: #c00;
      font-weight: bold;
    }
    
    /* Fuel gauge */
    .fuel-gauge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      margin-top: 5px;
    }
    .fuel-icon {
      width: 40px;
      height: 25px;
      border: 2px solid #000;
      border-radius: 5px;
      position: relative;
      overflow: hidden;
    }
    .fuel-level {
      height: 100%;
      background: #4caf50;
    }
    
    @media print {
      body {
        padding: 10px;
        font-size: 10px;
      }
      .header {
        border-width: 2px;
      }
    }
  </style>
</head>
<body>
  <!-- Header with Logo -->
  <div class="header">
    ${logoHTML}
    <div class="subtitle">🚗 Noleggio Auto / Car Rental</div>
    <div class="police-row">
      <span>POLICE 112</span>
      <span>AUTORIZZAZIONE / AUTHORISATION</span>
    </div>
    ${data.company.phone ? `<div class="contact-info">Contatto/Contact: ${data.company.phone}</div>` : ''}
  </div>

  <!-- Customer Info Table -->
  <table class="contract-table">
    <tr>
      <td class="col-33">
        <span class="label">Cognome / Last Name</span>
        <span class="value">${data.customer.lastName}</span>
      </td>
      <td class="col-33">
        <span class="label">Nome / First Name</span>
        <span class="value">${data.customer.firstName}</span>
      </td>
      <td class="col-33">
        <span class="label">Data di Nascita / Date of Birth</span>
        <span class="value">${data.customer.dateOfBirth ? formatDate(data.customer.dateOfBirth) : '___/___/______'}</span>
      </td>
    </tr>
    <tr>
      <td class="col-33">
        <span class="label">Numero Contatto / Contact Number</span>
        <span class="value">${data.customer.phone}</span>
      </td>
      <td class="col-33">
        <span class="label">Email</span>
        <span class="value">${data.customer.email}</span>
      </td>
      <td class="col-33">
        <span class="label">Indirizzo / Address</span>
        <span class="value">${data.customer.address || ''}${data.customer.city ? ', ' + data.customer.city : ''}</span>
      </td>
    </tr>
    <tr>
      <td class="col-33">
        <span class="label">Numero Patente / Licence Number</span>
        <span class="value">${data.customer.licenseNumber || '_______________'}</span>
      </td>
      <td class="col-33">
        <span class="label">Numero Passaporto / Passport Number</span>
        <span class="value">${data.customer.passportNumber || '_______________'}</span>
      </td>
      <td class="col-33">
        <span class="label">Scadenza Patente / Licence Expiry</span>
        <span class="value">${data.customer.licenseExpiry ? formatDate(data.customer.licenseExpiry) : '___/___/______'}</span>
      </td>
    </tr>
  </table>

  <!-- Vehicle & Rental Info Table -->
  <table class="contract-table">
    <tr>
      <td class="col-33">
        <span class="label">Veicolo / Vehicle</span>
        <span class="value">${data.vehicle.brand} ${data.vehicle.model}</span>
      </td>
      <td class="col-33">
        <span class="label">Targa / Licence Plate</span>
        <span class="value">${data.vehicle.licensePlate}</span>
      </td>
      <td class="col-33">
        <span class="label">Proprietà / Ownership</span>
        <span class="value">${data.company.name}</span>
      </td>
    </tr>
    <tr>
      <td class="col-33 highlight">
        <span class="label">Data e Ora Ritiro / Pickup Date & Time</span>
        <span class="value">
          DATA: ${formatDate(data.booking.pickupDate)}<br/>
          ORA: ${data.booking.pickupTime || formatTime(data.booking.pickupDate)}
        </span>
      </td>
      <td class="col-33 highlight">
        <span class="label">Data e Ora Riconsegna / Return Date & Time</span>
        <span class="value">
          DATA: ${formatDate(data.booking.returnDate)}<br/>
          ORA: ${data.booking.returnTime || formatTime(data.booking.returnDate)}
        </span>
      </td>
      <td class="col-33 highlight">
        <span class="label">Giorni Totali / Total Rented Days</span>
        <span class="value" style="font-size: 20px; text-align: center; display: block;">${data.booking.days}</span>
      </td>
    </tr>
    <tr>
      <td class="col-33">
        <span class="label">P.IVA / VAT Number</span>
        <span class="value">${data.company.vatNumber || '_______________'}</span>
      </td>
      <td class="col-33 highlight">
        <span class="label">Importo Pagato / Paid Amount</span>
        <span class="value" style="font-size: 14px;">€${totalPrice.toFixed(2)}</span>
      </td>
      <td class="col-33">
        <span class="label">Garanzia / Insurance Deposit</span>
        <span class="value">€${deposit.toFixed(2)}</span>
      </td>
    </tr>
    <tr>
      <td colspan="2">
        <span class="label">Luogo Ritiro / Pickup Location</span>
        <span class="value">${data.booking.pickupLocation || data.company.address || '_______________'}</span>
      </td>
      <td>
        <span class="label">Riferimento / Reference</span>
        <span class="value">${data.booking.reference}</span>
      </td>
    </tr>
  </table>

  <!-- Terms & Conditions -->
  <div class="terms">
    <h4>❖ TERMINI E CONDIZIONI / TERMS AND CONDITIONS</h4>
    <ul>
      ${data.company.contractTerms 
        ? data.company.contractTerms.split('\n').filter((line: string) => line.trim()).map((term: string) => `<li>${term.trim()}</li>`).join('')
        : `
          <li>La copertura COLLISION DAMAGE (CDW) e FULL DAMAGE (FDW/SCDW) <span class="warning">NON</span> copre danni a: parti inferiori del veicolo, specchietti, pneumatici, interni.</li>
          <li>CDW and FULL DAMAGE (FDW/SCDW) coverage does <span class="warning">NOT</span> cover damages to: underside of vehicle, mirrors, tires, interior.</li>
          <li>Il conducente deve essere in possesso di patente valida da almeno 1 anno.</li>
          <li>Il veicolo deve essere restituito con lo stesso livello di carburante.</li>
          <li>È vietato fumare nel veicolo. Penale: €100.</li>
          <li>Il deposito verrà restituito entro 7 giorni dalla riconsegna, previa verifica.</li>
          <li>In caso di ritardo nella riconsegna verrà applicato un supplemento giornaliero.</li>
          <li>Dichiarazione incidenti obbligatoria. Rapporto polizia obbligatorio!</li>
        `
      }
    </ul>
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-label">Cliente / Driver</div>
      <div class="sig-line"></div>
      <div class="sig-name">${data.customer.firstName} ${data.customer.lastName}</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Firma / Signature</div>
      <div class="sig-line"></div>
      <div class="sig-name">________________</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Amministratore / Administrator</div>
      <div class="sig-line"></div>
      <div class="sig-name">${data.company.name}</div>
    </div>
  </div>

  <!-- Fuel Level -->
  <div style="text-align: center; margin: 10px 0;">
    <span class="fuel-gauge">
      <span>Livello Carburante / Fuel Level:</span>
      <span class="fuel-icon">
        <span class="fuel-level" style="width: ${data.vehicle.fuelLevel || '100'}%;"></span>
      </span>
      <span>${data.vehicle.fuelLevel || '100'}%</span>
      <span style="margin-left: 20px;">Km: ${data.vehicle.currentKm ? data.vehicle.currentKm.toLocaleString() : '______'}</span>
    </span>
  </div>

  <!-- Footer -->
  <div class="footer">
    QUESTA AUTORIZZAZIONE È VALIDA IN ITALIA E ALL'ESTERO!<br/>
    THIS AUTHORISATION IS VALID WITHIN AND OUT OF ITALIAN TERRITORIES!
  </div>

  <div style="text-align: center; font-size: 9px; color: #999; margin-top: 10px;">
    Documento generato il ${new Date().toLocaleString('it-IT')} | ${data.company.name} - ${data.company.address || ''} ${data.company.city || ''}
  </div>
</body>
</html>
`
}

export function printContract(data: ContractData): void {
  const html = generateContractHTML(data)
  
  // Try to open a new window
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  
  if (!printWindow) {
    alert('Il popup è stato bloccato. Abilita i popup per questa pagina per stampare il contratto.')
    const newWindow = window.open('', '_self')
    if (newWindow) {
      newWindow.document.write(html)
      newWindow.document.close()
    }
    return
  }
  
  printWindow.document.write(html)
  printWindow.document.close()
  
  const tryPrint = () => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch (e) {
      console.error('Print error:', e)
    }
  }
  
  if (printWindow.document.readyState === 'complete') {
    setTimeout(tryPrint, 100)
  } else {
    printWindow.onload = () => setTimeout(tryPrint, 100)
    setTimeout(tryPrint, 1000)
  }
}

export function downloadContractAsPDF(data: ContractData): void {
  printContract(data)
}

export function downloadContractAsHTML(data: ContractData): void {
  const html = generateContractHTML(data)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contratto-${data.booking.reference}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
