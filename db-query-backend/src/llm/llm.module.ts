import { Module } from '@nestjs/common';
import { LLMService } from './llm.service';

@Module({
  providers: [LLMService],
  exports: [LLMService], // 👈 REQUIRED
})
export class LLMModule {}
