import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac } from 'crypto';

export interface PayseraOrderRequest {
  amount: number;
  currency: string;
  order_id: string;
  description: string;
  email: string;
  status: '1' | '2'; // 1=hold, 2=immediate charge
  return_url?: string;
  callback_url?: string;
}

export interface PayseraOrderResponse {
  orderid: string;
  status: string;
  url: string; // Payment URL to redirect customer
}

export interface PayseraWebhookPayload {
  orderid: string;
  status: string;
  amount: string;
  currency: string;
  sign: string;
  [key: string]: any;
}

export interface PayseraCaptureRequest {
  orderid: string;
  amount: number;
  final: '0' | '1'; // 0=partial capture, 1=final capture
}

@Injectable()
export class PayseraService {
  private client: AxiosInstance;
  private readonly projectId: string;
  private readonly signPassword: string;

  constructor(private configService: ConfigService) {
    this.projectId = this.configService.get('PAYSERA_PROJECT_ID') ?? '';
    this.signPassword = this.configService.get('PAYSERA_SIGN_PASSWORD') ?? '';
    
    this.client = axios.create({
      baseURL: this.configService.get('PAYSERA_API_URL', 'https://www.paysera.com/pay/v2/'),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a new Paysera order for hold/capture
   */
  async createOrder(request: PayseraOrderRequest): Promise<PayseraOrderResponse> {
    try {
      const payload = {
        ...request,
        projectid: this.projectId,
      };

      const response = await this.client.post<PayseraOrderResponse>('order', payload);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Paysera order creation failed: ${message}`);
    }
  }

  /**
   * Capture a held amount
   */
  async captureOrder(request: PayseraCaptureRequest): Promise<void> {
    try {
      await this.client.post('capture', {
        ...request,
        projectid: this.projectId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Paysera capture failed: ${message}`);
    }
  }

  /**
   * Release a held amount
   */
  async releaseOrder(orderId: string): Promise<void> {
    try {
      await this.client.post('release', {
        orderid: orderId,
        projectid: this.projectId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Paysera release failed: ${message}`);
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const response = await this.client.get(`order/${orderId}`, {
        params: { projectid: this.projectId },
      });
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Paysera get order status failed: ${message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: PayseraWebhookPayload): boolean {
    const { sign, ...data } = payload;
    
    // Create string to sign: concatenate all values except 'sign'
    const stringToSign = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('&');

    const calculatedSign = createHmac('md5', this.signPassword)
      .update(stringToSign)
      .digest('hex');

    return sign === calculatedSign;
  }

  /**
   * Generate signature for API requests
   */
  generateSignature(data: Record<string, any>): string {
    const stringToSign = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('&');

    return createHmac('md5', this.signPassword)
      .update(stringToSign)
      .digest('hex');
  }

  /**
   * Create hold order for caution
   */
  async createHoldOrder(
    amount: number,
    orderId: string,
    email: string,
    description: string,
    callbackUrl: string,
  ): Promise<PayseraOrderResponse> {
    return this.createOrder({
      amount,
      currency: 'EUR',
      order_id: orderId,
      description,
      email,
      status: '1', // Hold
      callback_url: callbackUrl,
    });
  }

  /**
   * Capture held amount (full or partial)
   */
  async captureHeldAmount(orderId: string, amount: number, final: boolean = true): Promise<void> {
    return this.captureOrder({
      orderid: orderId,
      amount,
      final: final ? '1' : '0',
    });
  }

  /**
   * Release held amount
   */
  async releaseHeldAmount(orderId: string): Promise<void> {
    return this.releaseOrder(orderId);
  }
}