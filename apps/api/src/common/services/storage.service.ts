import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as https from 'https';
import * as http from 'http';

interface MinioConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private config: MinioConfig;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    
    this.config = {
      endpoint,
      port,
      useSSL,
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    };

    this.bucketName = this.configService.get('STORAGE_BUCKET', 'fleetpulse');
  }

  private getBaseUrl(): string {
    const protocol = this.config.useSSL ? 'https' : 'http';
    const portSuffix = (this.config.useSSL && this.config.port === 443) || 
                       (!this.config.useSSL && this.config.port === 80) 
                       ? '' : `:${this.config.port}`;
    return `${protocol}://${this.config.endpoint}${portSuffix}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    path: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const fileName = `${path}/${uuidv4()}-${file.originalname}`;
    
    await this.putObject(fileName, file.buffer, file.mimetype, metadata);
    
    return fileName;
  }

  async uploadBuffer(
    buffer: Buffer,
    path: string,
    filename: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const fileName = `${path}/${uuidv4()}-${filename}`;
    
    await this.putObject(fileName, buffer, contentType, metadata);
    
    return fileName;
  }

  private async putObject(
    key: string,
    data: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.getBaseUrl()}/${this.bucketName}/${key}`);
      
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Length': data.length.toString(),
        'Authorization': this.getAuthHeader('PUT', `/${this.bucketName}/${key}`),
      };
      
      if (metadata) {
        Object.entries(metadata).forEach(([k, v]) => {
          headers[`x-amz-meta-${k}`] = v;
        });
      }

      const requestModule = this.config.useSSL ? https : http;
      
      const req = requestModule.request(
        {
          hostname: url.hostname,
          port: url.port || (this.config.useSSL ? 443 : 80),
          path: url.pathname,
          method: 'PUT',
          headers,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => reject(new Error(`Storage upload failed: ${res.statusCode} ${body}`)));
          }
        },
      );

      req.on('error', (err) => reject(new Error(`Storage upload failed: ${err.message}`)));
      req.write(data);
      req.end();
    });
  }

  private getAuthHeader(method: string, path: string): string {
    // Simple Basic Auth for MinIO
    const credentials = Buffer.from(`${this.config.accessKey}:${this.config.secretKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async getPresignedUrl(key: string, expiresInSeconds: number = 300): Promise<string> {
    // Generate a simple presigned URL for MinIO
    const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const baseUrl = this.getBaseUrl();
    
    // For MinIO with public bucket policy, return direct URL
    // For private buckets, you'd need proper S3 signature v4
    return `${baseUrl}/${this.bucketName}/${key}`;
  }

  async getPresignedUploadUrl(
    path: string,
    filename: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    const fileName = `${path}/${uuidv4()}-${filename}`;
    const baseUrl = this.getBaseUrl();
    
    return `${baseUrl}/${this.bucketName}/${fileName}`;
  }

  async deleteFile(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.getBaseUrl()}/${this.bucketName}/${key}`);
      
      const requestModule = this.config.useSSL ? https : http;
      
      const req = requestModule.request(
        {
          hostname: url.hostname,
          port: url.port || (this.config.useSSL ? 443 : 80),
          path: url.pathname,
          method: 'DELETE',
          headers: {
            'Authorization': this.getAuthHeader('DELETE', `/${this.bucketName}/${key}`),
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => reject(new Error(`Delete file failed: ${res.statusCode} ${body}`)));
          }
        },
      );

      req.on('error', (err) => reject(new Error(`Delete file failed: ${err.message}`)));
      req.end();
    });
  }

  async fileExists(key: string): Promise<boolean> {
    return new Promise((resolve) => {
      const url = new URL(`${this.getBaseUrl()}/${this.bucketName}/${key}`);
      
      const requestModule = this.config.useSSL ? https : http;
      
      const req = requestModule.request(
        {
          hostname: url.hostname,
          port: url.port || (this.config.useSSL ? 443 : 80),
          path: url.pathname,
          method: 'HEAD',
          headers: {
            'Authorization': this.getAuthHeader('HEAD', `/${this.bucketName}/${key}`),
          },
        },
        (res) => {
          resolve(res.statusCode === 200);
        },
      );

      req.on('error', () => resolve(false));
      req.end();
    });
  }

  async getPresignedUrls(keys: string[], expiresInSeconds: number = 300): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};
    
    const promises = keys.map(async (key) => {
      if (!key) return;
      try {
        urls[key] = await this.getPresignedUrl(key, expiresInSeconds);
      } catch (e) {
        this.logger.error(`Failed to get URL for ${key}`, e);
      }
    });

    await Promise.all(promises);
    return urls;
  }

  async uploadResizedImage(
    file: Express.Multer.File,
    path: string,
    width: number,
    height: number,
    metadata?: Record<string, string>,
  ): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp');
    
    const resizedBuffer = await sharp(file.buffer)
      .resize(width, height, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    return this.uploadBuffer(
      resizedBuffer,
      path,
      file.originalname,
      'image/jpeg',
      metadata,
    );
  }
}
