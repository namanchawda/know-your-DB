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
    database?: string;     // SQL + Mongo
    ssl?: boolean;
    serviceName?: string;  // Oracle
    uri?: string;          // MongoDB
  }) {
    try {
      /* ==================== MONGODB ==================== */
      if (config.dbType === 'MongoDB') {
        if (!config.uri) {
          throw new BadRequestException('MongoDB URI is required');
        }
        if (!config.database) {
          throw new BadRequestException('MongoDB database name is required');
        }

        const client = new MongoClient(config.uri, {
          connectTimeoutMS: 10_000,
        });

        await client.connect();
        const db = client.db(config.database);

        const connectionId = randomUUID();
        this.connections.set(connectionId, {
          kind: 'mongo',
          db,
          client,
        });

        return connectionId;
      }

      /* ==================== SQL VALIDATION ==================== */
      if (!config.host || !config.username || !config.password) {
        throw new BadRequestException(
          'host, username and password are required',
        );
      }

      let dataSource: DataSource;

      switch (config.dbType) {
        /* ---------- PostgreSQL / Supabase ---------- */
        case 'PostgreSQL':
          if (!config.database) {
            throw new BadRequestException('Database name is required');
          }
        
          const connectionString = `postgresql://${encodeURIComponent(
            config.username!,
          )}:${encodeURIComponent(config.password!)}@${config.host}:${
            config.port ?? 5432
          }/${config.database}`;
        
          dataSource = new DataSource({
            type: 'postgres',
            url: connectionString,
            ssl: {
              rejectUnauthorized: false,
            },
            extra: {
              ssl: {
                rejectUnauthorized: false,
              },
              connectionTimeoutMillis: 10_000,
            },
          });
          break;


        /* ---------- MySQL ---------- */
        case 'MySQL':
          if (!config.database) {
            throw new BadRequestException('Database name is required');
          }

          dataSource = new DataSource({
            type: 'mysql',
            host: config.host,
            port: config.port ?? 3306,
            username: config.username,
            password: config.password,
            database: config.database,
            extra: {
              connectTimeout: 10_000,
            },
          });
          break;

        /* ---------- Oracle ---------- */
        case 'Oracle':
          if (!config.serviceName) {
            throw new BadRequestException(
              'Oracle serviceName is required',
            );
          }

          dataSource = new DataSource({
            type: 'oracle',
            host: config.host,
            port: config.port ?? 1521,
            username: config.username,
            password: config.password,
            serviceName: config.serviceName,
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
      console.error('DB connection error:', err);

      throw new BadRequestException(
        err?.message || 'Database connection failed',
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

  /* -------------------- CLEANUP -------------------- */
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
