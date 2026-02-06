import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptionService {
  constructor(private readonly configService: ConfigService) {}

  async encrypt(text: string): Promise<string> {
    // Placeholder implementation
    return Buffer.from(text).toString('base64');
  }

  async decrypt(text: string): Promise<string> {
    // Placeholder implementation
    return Buffer.from(text, 'base64').toString('ascii');
  }
}