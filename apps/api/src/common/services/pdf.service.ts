import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, degrees } from 'pdf-lib';
import { Booking, Caution, Damage } from '@prisma/client';
import { format } from 'date-fns';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private browser: puppeteer.Browser | null = null;
  private browserAvailable = false;

  async onModuleInit() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.browserAvailable = true;
      this.logger.log('Chrome/Puppeteer initialized successfully');
    } catch (error) {
      this.logger.log('PDF generation disabled - Chrome/Puppeteer not available');
      this.browserAvailable = false;
    }
  }

  private checkBrowserAvailable(): void {
    if (!this.browserAvailable || !this.browser) {
      throw new Error('PDF generation is not available. Chrome/Puppeteer is not installed.');
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generateContract(booking: any): Promise<Buffer> {
    this.checkBrowserAvailable();
    const page = await this.browser!.newPage();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          .title { font-weight: bold; font-size: 18px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rental Agreement</h1>
          <p>Contract #${booking.id}</p>
        </div>
        
        <div class="section">
          <div class="title">Customer Details</div>
          <p>Name: ${booking.customer.firstName} ${booking.customer.lastName}</p>
          <p>Email: ${booking.customer.email}</p>
          <p>License: ${booking.customer.licenseNumber}</p>
        </div>

        <div class="section">
          <div class="title">Vehicle Details</div>
          <p>Vehicle: ${booking.vehicle.brand} ${booking.vehicle.model}</p>
          <p>License Plate: ${booking.vehicle.licensePlate}</p>
        </div>

        <div class="section">
          <div class="title">Rental Period</div>
          <p>Start: ${format(new Date(booking.startDate), 'dd/MM/yyyy HH:mm')}</p>
          <p>End: ${format(new Date(booking.endDate), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        <div class="section">
          <div class="title">Financials</div>
          <table>
            <tr><th>Item</th><th>Amount</th></tr>
            <tr><td>Total Amount</td><td>€${Number(booking.totalAmount).toFixed(2)}</td></tr>
            <tr><td>Caution Amount</td><td>€${Number(booking.cautionAmount).toFixed(2)}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="title">Signatures</div>
          <br><br><br>
          <div style="display: flex; justify-content: space-between;">
            <div>Customer Signature</div>
            <div>Company Representative</div>
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4' });
    await page.close();
    return Buffer.from(pdf);
  }

  async generateCheckoutReport(booking: any, data: any): Promise<Buffer> {
    this.checkBrowserAvailable();
    const page = await this.browser!.newPage();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { text-align: center; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Vehicle Checkout Report</h1>
          <p>Booking #${booking.id}</p>
        </div>

        <div class="grid">
          <div>
            <h3>Vehicle Status</h3>
            <p>KM Out: ${data.km}</p>
            <p>Fuel Level: ${data.fuelLevel}%</p>
          </div>
          <div>
            <h3>Notes</h3>
            <p>${data.notes || 'No notes'}</p>
          </div>
        </div>

        <div style="margin-top: 50px;">
          <h3>Signature</h3>
          ${data.signature ? `<img src="${data.signature}" width="200" />` : '<p>Signed digitally</p>'}
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4' });
    await page.close();
    return Buffer.from(pdf);
  }

  async generateWorkOrder(maintenance: any): Promise<Buffer> {
    this.checkBrowserAvailable();
    const page = await this.browser!.newPage();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Maintenance Work Order</h1>
          <p>Order #${maintenance.id}</p>
        </div>

        <div>
          <h3>Vehicle</h3>
          <p>${maintenance.vehicle.brand} ${maintenance.vehicle.model} (${maintenance.vehicle.licensePlate})</p>
        </div>

        <div>
          <h3>Service Details</h3>
          <p>Type: ${maintenance.type}</p>
          <p>Description: ${maintenance.description}</p>
          <p>Cost: €${maintenance.cost}</p>
          <p>Date: ${format(new Date(maintenance.date), 'dd/MM/yyyy')}</p>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4' });
    await page.close();
    return Buffer.from(pdf);
  }

  async generateCautionChargePDF(caution: any, amount: number, reason: string): Promise<Buffer> {
    this.checkBrowserAvailable();
    const page = await this.browser!.newPage();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Caution Charge Receipt</h1>
          <p>Caution #${caution.id}</p>
        </div>

        <div>
          <h3>Details</h3>
          <p>Amount Charged: €${amount.toFixed(2)}</p>
          <p>Reason: ${reason}</p>
          <p>Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        <div>
          <h3>Booking Reference</h3>
          <p>Booking ID: ${caution.bookingId}</p>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4' });
    await page.close();
    return Buffer.from(pdf);
  }

  async generateCautionReleasePDF(caution: any, reason: string): Promise<Buffer> {
    this.checkBrowserAvailable();
    const page = await this.browser!.newPage();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Caution Release Receipt</h1>
          <p>Caution #${caution.id}</p>
        </div>

        <div>
          <h3>Details</h3>
          <p>Amount Released: €${Number(caution.amount).toFixed(2)}</p>
          <p>Reason: ${reason || 'Standard release'}</p>
          <p>Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        <div>
          <h3>Booking Reference</h3>
          <p>Booking ID: ${caution.bookingId}</p>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4' });
    await page.close();
    return Buffer.from(pdf);
  }

  async addWatermark(pdfBuffer: Buffer, text: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    pages.forEach(page => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 2 - 50,
        y: height / 2,
        size: 50,
        opacity: 0.2,
        rotate: degrees(45),
      });
    });

    const modifiedPdfBytes = await pdfDoc.save();
    return Buffer.from(modifiedPdfBytes);
  }
}