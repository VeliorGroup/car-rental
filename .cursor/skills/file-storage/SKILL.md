---
name: file-storage
description: Gestione file e storage MinIO in Car Rental. Usa quando lavori con upload file, foto veicoli, documenti PDF, firme digitali, o quando devi implementare presigned URLs.
---

# File Storage — Car Rental

## StorageService

Servizio in `apps/api/src/common/services/storage.service.ts`.

```typescript
// Metodi disponibili
uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string>
uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string>
uploadResizedImage(buffer: Buffer, key: string, width: number, height: number): Promise<string>
getPresignedUrl(key: string, expirySeconds?: number): Promise<string>
deleteFile(key: string): Promise<void>
fileExists(key: string): Promise<boolean>
```

## Upload file

```typescript
// Iniettare StorageService
constructor(private readonly storage: StorageService) {}

// Upload buffer
const key = `tenants/${tenantId}/vehicles/${vehicleId}/photo-${Date.now()}.jpg`;
await this.storage.uploadBuffer(imageBuffer, key, 'image/jpeg');

// Upload con resize (per immagini profilo/veicoli)
const key = `tenants/${tenantId}/vehicles/${vehicleId}/thumb.jpg`;
await this.storage.uploadResizedImage(imageBuffer, key, 800, 600);
```

## Struttura chiavi MinIO

Convenzione naming per le chiavi:

```
tenants/{tenantId}/vehicles/{vehicleId}/photo.jpg
tenants/{tenantId}/documents/{bookingId}/contract.pdf
tenants/{tenantId}/customers/{customerId}/license-front.jpg
tenants/{tenantId}/customers/{customerId}/license-back.jpg
tenants/{tenantId}/customers/{customerId}/id-card-front.jpg
```

## Presigned URLs

```typescript
// URL temporaneo per download (default: 1 ora)
const url = await this.storage.getPresignedUrl(fileKey);

// URL con scadenza custom (secondi)
const url = await this.storage.getPresignedUrl(fileKey, 3600);
```

## Upload frontend (UploadModule)

```typescript
// POST /upload/image — upload immagine veicolo/profilo
// POST /upload/document — upload documento
// Risposta: { key: string, url: string }
```

Con `@uppy/react` nel frontend:
```typescript
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
```

## PDF generation

`PdfService` genera PDF con Puppeteer e li carica su MinIO:

```typescript
const pdfBuffer = await this.pdf.generateContract(booking);
const key = `tenants/${tenantId}/contracts/${bookingId}.pdf`;
await this.storage.uploadBuffer(pdfBuffer, key, 'application/pdf');
const url = await this.storage.getPresignedUrl(key);
```

## Eliminazione file

```typescript
// SEMPRE chiamare deleteFile, non un metodo diverso
await this.storage.deleteFile(fileKey);
```
