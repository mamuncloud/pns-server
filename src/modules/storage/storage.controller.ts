import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFiles, 
  UploadedFile,
  BadRequestException,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { StorageService } from './storage.service';

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @Roles('MANAGER')
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
  @Roles('MANAGER')
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
