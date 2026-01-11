import { Controller, Post, Body, Query } from '@nestjs/common';
import { QueryService } from './query.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';

@Controller('query')
export class QueryController {
  constructor(private readonly service: QueryService) {}

  @Post('execute')
  execute(@Query('connectionId') connectionId: string, @Body() dto: ExecuteQueryDto) {
    return this.service.executeQuery(dto.query, connectionId);
  }
}
