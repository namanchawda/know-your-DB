import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { MongoClient, Db } from 'mongodb';

/* -------------------- Supported DB Types -------------------- */
export type SupportedDB =
  | 'PostgreSQL'
  | 'MySQL'
  | 'Oracle'
  | 'MongoDB';

/* -------------------- Internal Connection Type -------------------- */
type ManagedConnection =
  | {
      kind: 'sql';
      ds: DataSource;
    }
  | {
      kind: 'mongo';
      db: Db;
      client: MongoClient;
    };

@Injectable()
export class ConnectionManagerService {
  private connections = new Map<string, ManagedConnection>();

  /* -------------------- CREATE CONNECTION -------------------- */
  async createConnection(config: {
    dbType: SupportedDB;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    ssl?: boolean;
    serviceName?: string;
    uri?: string; // MongoDB only
  }) {
    try {
      /* ======================================================
         MONGODB (CONNECT ONLY – NO NL QUERIES)
         ====================================================== */
      if (config.dbType === 'MongoDB') {
        if (!config.uri) {
          throw new BadRequestException(
            'MongoDB URI is required',
          );
        }

        if (!config.database) {
          throw new BadRequestException(
            'MongoDB database name is required',
          );
        }

        const client = new MongoClient(config.uri);
        await client.connect();

        // IMPORTANT: use explicit database name only
        const db = client.db(config.database);

        const connectionId = randomUUID();
        this.connections.set(connectionId, {
          kind: 'mongo',
          db,
          client,
        });

        return connectionId;
      }

      /* ======================================================
         SQL DATABASES (PRIMARY SUPPORTED PATH)
         ====================================================== */
      if (
        !config.host ||
        !config.username ||
        !config.password ||
        !config.database
      ) {
        throw new BadRequestException(
          'Missing required database connection fields',
        );
      }

      let dataSource: DataSource;

      switch (config.dbType) {
        /* ---------- PostgreSQL / Supabase ---------- */
        case 'PostgreSQL':
          dataSource = new DataSource({
            type: 'postgres',
            host: config.host,
            port: config.port ?? 5432,
            username: config.username,
            password: config.password,
            database: config.database,
            ssl: config.ssl
              ? { rejectUnauthorized: false }
              : false,
          });
          break;

        /* ---------- MySQL ---------- */
        case 'MySQL':
          dataSource = new DataSource({
            type: 'mysql',
            host: config.host,
            port: config.port ?? 3306,
            username: config.username,
            password: config.password,
            database: config.database,
          });
          break;

        /* ---------- Oracle ---------- */
        case 'Oracle':
          dataSource = new DataSource({
            type: 'oracle',
            host: config.host,
            port: config.port ?? 1521,
            username: config.username,
            password: config.password,
            sid: config.serviceName,
          });
          break;

        default:
          throw new BadRequestException(
            `Unsupported database type: ${config.dbType}`,
          );
      }

      await dataSource.initialize();

      const connectionId = randomUUID();
      this.connections.set(connectionId, {
        kind: 'sql',
        ds: dataSource,
      });

      return connectionId;
    } catch (err: any) {
      console.error(
        'DB connection error:',
        err?.message || err,
      );
      throw new BadRequestException(
        'Database connection failed',
      );
    }
  }

  /* -------------------- GET CONNECTION -------------------- */
  getConnection(connectionId: string): ManagedConnection {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new BadRequestException(
        'Invalid or expired connectionId',
      );
    }
    return conn;
  }

  /* -------------------- CLEANUP (OPTIONAL) -------------------- */
  async closeConnection(connectionId: string) {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    if (conn.kind === 'sql') {
      await conn.ds.destroy();
    }

    if (conn.kind === 'mongo') {
      await conn.client.close();
    }

    this.connections.delete(connectionId);
  }
}
