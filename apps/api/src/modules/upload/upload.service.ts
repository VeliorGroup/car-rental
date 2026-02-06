import { Injectable } from '@nestjs/common';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class UploadService {
    constructor(private readonly storageService: StorageService) { }

    async uploadFile(tenantId: string, file: Express.Multer.File) {
        const key = await this.storageService.uploadFile(file, `uploads/${tenantId}`);
        const url = await this.storageService.getPresignedUrl(key);
        return { key, url };
    }
}
