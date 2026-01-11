import { Injectable } from '@nestjs/common';
import { ConnectionManagerService } from '../connections/connection-manager.service';

type TableSchema = {
  name: string;
  columns: string[];
};

@Injectable()
export class SchemaService {
  constructor(
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  /* =========================
     GET TABLES / COLLECTIONS
     ========================= */
  async getTables(connectionId: string): Promise<string[]> {
    const conn =
      this.connectionManager.getConnection(connectionId);

    /* ---------- SQL ---------- */
    if (conn.kind === 'sql') {
      const ds = conn.ds;
      const dbType = ds.options.type;

      /* PostgreSQL */
      if (dbType === 'postgres') {
        const result = await ds.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);

        return result.map((r: any) => r.table_name);
      }

      /* MySQL */
      if (dbType === 'mysql') {
        const dbName = ds.options.database;

        const result = await ds.query(
          `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = ?
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `,
          [dbName],
        );

        return result.map(
          (r: any) => r.TABLE_NAME,
        );
      }

      return [];
    }

    /* ---------- MongoDB ---------- */
    if (conn.kind === 'mongo') {
      const collections =
        await conn.db.listCollections().toArray();

      return collections.map((c) => c.name);
    }

    return [];
  }

  /* =========================
     GET COLUMNS / FIELDS
     ========================= */
  async getColumns(
    connectionId: string,
    table: string,
  ) {
    const conn =
      this.connectionManager.getConnection(connectionId);

    /* ---------- SQL ---------- */
    if (conn.kind === 'sql') {
      const ds = conn.ds;
      const dbType = ds.options.type;

      /* PostgreSQL */
      if (dbType === 'postgres') {
        return ds.query(
          `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = $1
            AND table_schema = 'public'
          ORDER BY ordinal_position
        `,
          [table],
        );
      }

      /* MySQL */
      if (dbType === 'mysql') {
        const dbName = ds.options.database;

        const result = await ds.query(
          `
          SELECT COLUMN_NAME, DATA_TYPE
          FROM information_schema.columns
          WHERE table_schema = ?
            AND table_name = ?
          ORDER BY ORDINAL_POSITION
        `,
          [dbName, table],
        );

        return result.map((r: any) => ({
          column_name: r.COLUMN_NAME,
          data_type: r.DATA_TYPE,
        }));
      }

      return [];
    }

    /* ---------- MongoDB ---------- */
    if (conn.kind === 'mongo') {
      const collection = conn.db.collection(table);

      const docs = await collection
        .find({})
        .limit(10)
        .toArray();

      const fieldSet = new Set<string>();

      docs.forEach((doc) => {
        Object.keys(doc).forEach((key) =>
          fieldSet.add(key),
        );
      });

      return Array.from(fieldSet).map((field) => ({
        column_name: field,
        data_type: 'mixed',
      }));
    }

    return [];
  }

  /* =========================
     FULL SCHEMA (SQL ONLY)
     ========================= */
  async getFullSchema(
    connectionId: string,
  ): Promise<TableSchema[]> {
    const conn =
      this.connectionManager.getConnection(connectionId);

    // NL schema is SQL-only
    if (conn.kind !== 'sql') {
      return [];
    }

    const tables = await this.getTables(connectionId);

    const schema: TableSchema[] = [];

    for (const table of tables) {
      const columns =
        await this.getColumns(connectionId, table);

      schema.push({
        name: table,
        columns: columns.map(
          (c: any) => c.column_name,
        ),
      });
    }

    return schema;
  }
}
