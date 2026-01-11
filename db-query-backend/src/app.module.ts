import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConnectionsModule } from './connections/connections.module';
import { SchemaModule } from './schema/schema.module';
import { QueryModule } from './query/query.module';
import { LLMModule } from './llm/llm.module';
import { NLModule } from './nl/nl.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes env available everywhere
    }),
    ConnectionsModule,
    SchemaModule,
    QueryModule,
    LLMModule,
    NLModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
