import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConnectionManagerService } from '../connections/connection-manager.service';

@Injectable()
export class QueryService {
  constructor(private connectionManager: ConnectionManagerService) {}

  private async getDataSource(connectionId: string): Promise<DataSource> {
    // Get the pre-created DataSource from ConnectionManager
    const managedConnection = await this.connectionManager.getConnection(connectionId); // adjust method name
    if (!managedConnection || managedConnection.kind !== 'sql') {
      throw new BadRequestException('SQL connection not found');
    }

    const dataSource = managedConnection.ds;
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    return dataSource;
  }

  private validateQuery(sql: string) {
    const forbidden = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate'];

    const lowered = sql.toLowerCase();
    for (const word of forbidden) {
      if (lowered.includes(word)) {
        throw new BadRequestException('Only READ-ONLY queries are allowed');
      }
    }

    if (!lowered.trim().startsWith('select')) {
      throw new BadRequestException('Only SELECT queries are allowed');
    }
  }

  async executeQuery(sql: string, connectionId: string) {
    const dataSource = await this.getDataSource(connectionId);
    this.validateQuery(sql);

    const result = await dataSource.query(sql);
    return {
      rows: result,
      count: result.length,
    };
  }
}
