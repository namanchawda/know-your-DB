import { Controller, Post, Body } from '@nestjs/common';
import { ConnectionManagerService } from './connection-manager.service';

@Controller('connections')
export class ConnectionsController {
  constructor(
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  @Post('connect')
  async connect(@Body() body: any) {
    console.log('CONNECT PAYLOAD:', body);

    const connectionId =
      await this.connectionManager.createConnection({
        dbType: body.dbType,

        // SQL
        host: body.host,
        port: body.port,
        username: body.username,
        password: body.password,
        database: body.database,
        ssl: body.ssl,
        serviceName: body.serviceName,

        // ✅ MongoDB (THIS WAS MISSING)
        uri: body.uri,
      });

    return { connectionId };
  }
}
