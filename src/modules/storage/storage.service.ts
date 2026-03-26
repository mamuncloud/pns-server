import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly supabase: SupabaseClient;
  private readonly bucketName = 'products';
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
       this.logger.error('SUPABASE_URL or SUPABASE_ANON_KEY is missing in configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadFile(file: any): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      this.logger.error(`Failed to upload file to Supabase: ${error.message}`);
      throw error;
    }

    return data.path;
  }

  async uploadFiles(files: any[]): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }
}
