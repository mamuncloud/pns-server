import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFiles, 
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { StorageService } from './storage.service';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    }
  }))
  async uploadMultiple(@UploadedFiles() files: any[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    const urls = await this.storageService.uploadFiles(files);
    return {
      message: 'Files uploaded successfully',
      data: urls,
    };
  }

  @Post('upload-single')
  @ApiOperation({ summary: 'Upload single file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    }
  }))
  async uploadSingle(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const url = await this.storageService.uploadFile(file);
    return {
      message: 'File uploaded successfully',
      data: url,
    };
  }
}
