import { Module } from '@nestjs/common';
import { RepacksController } from './repacks.controller';
import { RepacksService } from './repacks.service';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RepacksController],
  providers: [RepacksService],
  exports: [RepacksService],
})
export class RepacksModule {}
