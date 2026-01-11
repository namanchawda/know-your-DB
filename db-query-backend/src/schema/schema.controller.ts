import { Controller, Get, Query } from '@nestjs/common';
import { SchemaService } from './schema.service';

@Controller('schema')
export class SchemaController {
  constructor(private readonly service: SchemaService) {}

  @Get('tables')
  getTables(@Query('connectionId') connectionId: string) {
    if (!connectionId) {
      throw new Error('connectionId is required');
    }
    return this.service.getTables(connectionId);
  }

  @Get('columns')
  getColumns(
    @Query('connectionId') connectionId: string,
    @Query('table') table: string,
  ) {
    if (!connectionId || !table) {
      throw new Error('connectionId and table are required');
    }
    return this.service.getColumns(connectionId, table);
  }
}
