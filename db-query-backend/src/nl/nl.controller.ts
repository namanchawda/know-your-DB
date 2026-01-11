import {
  Controller,
  Post,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { NLService } from './nl.service';

type LLMMode = 'local' | 'cloud' | 'auto';

@Controller('nl')
export class NLController {
  constructor(private readonly service: NLService) {}

  @Post('query')
  handle(
    @Query('connectionId') connectionId: string,
    @Body('question') question: string,
    @Body('dbType') dbType: string,
    @Body('mode') mode: LLMMode = 'auto',
  ) {
    if (!connectionId || !question || !dbType) {
      throw new BadRequestException('Missing required fields');
    }

    if (!['local', 'cloud', 'auto'].includes(mode)) {
      throw new BadRequestException(
        'Invalid mode. Use local | cloud | auto',
      );
    }

    return this.service.handle(
      connectionId,
      question,
      dbType,
      mode,
    );
  }
}
