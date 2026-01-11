import { Module } from '@nestjs/common';
import { NLController } from './nl.controller';
import { NLService } from './nl.service';
import { SchemaModule } from '../schema/schema.module';
import { ConnectionsModule } from '../connections/connections.module';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    SchemaModule,
    ConnectionsModule,
    LLMModule,
  ],
  controllers: [NLController],
  providers: [NLService],
})
export class NLModule {}
