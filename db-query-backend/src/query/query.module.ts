import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { ConnectionsModule } from '../connections/connections.module'; // adjust path

@Module({
  imports: [ConnectionsModule],
  controllers: [QueryController],
  providers: [QueryService]
})
export class QueryModule {}
