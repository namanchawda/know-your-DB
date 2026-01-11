import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionManagerService } from './connection-manager.service';

@Module({
  controllers: [ConnectionsController],
  providers: [ConnectionManagerService],
  exports: [ConnectionManagerService], // 👈 REQUIRED
})
export class ConnectionsModule {}

