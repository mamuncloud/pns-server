import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly uploadPath = path.join(process.cwd(), 'public', 'uploads');
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('NEXT_PUBLIC_API_URL') || 'http://localhost:3001';
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async uploadFile(file: any): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    const filePath = path.join(this.uploadPath, fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    return `uploads/${fileName}`;
  }

  async uploadFiles(files: any[]): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }
}
