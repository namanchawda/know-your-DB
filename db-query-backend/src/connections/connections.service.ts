import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConnectionsService {
  constructor(private config: ConfigService) {}

  async testConnection() {
    const dataSource = new DataSource({
      type: 'postgres',
      host: this.config.get('DB_HOST'),
      port: Number(this.config.get('DB_PORT')),
      username: this.config.get('DB_USER'),
      password: this.config.get('DB_PASSWORD'),
      database: this.config.get('DB_NAME'),
    });

    try {
      await dataSource.initialize();
      await dataSource.destroy();

      return {
        success: true,
        message: 'Database connected successfully using .env',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
