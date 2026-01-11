import { Injectable, BadRequestException } from '@nestjs/common';
import { SchemaService } from '../schema/schema.service';
import { LLMService } from '../llm/llm.service';
import { ConnectionManagerService } from '../connections/connection-manager.service';
import { validateSQL } from './sql.validator';
import { extractSQL } from './sql.extractor';
import { validateColumns } from './column.validator';

@Injectable()
export class NLService {
  constructor(
    private readonly schemaService: SchemaService,
    private readonly llmService: LLMService,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  async handle(
    connectionId: string,
    question: string,
    dbType: string,
    mode?: 'auto' | 'cloud' | 'local',
  ) {
    const startTime = Date.now();

    /* -------------------- Get Connection -------------------- */
    const conn =
      this.connectionManager.getConnection(connectionId);

    /* ======================================================
       BLOCK MONGODB (NL is SQL-only for now)
       ====================================================== */
    if (conn.kind === 'mongo') {
      throw new BadRequestException(
        'Natural language queries are currently supported only for SQL databases (PostgreSQL, MySQL, Oracle). MongoDB NL support is coming soon.',
      );
    }

    /* -------------------- Load Full Schema -------------------- */
    const fullSchema =
      await this.schemaService.getFullSchema(
        connectionId,
      );

    /* -------------------- Reduce Schema for Prompt -------------------- */
    const relevantSchema = fullSchema.filter((table) =>
      question.toLowerCase().includes(table.name.toLowerCase()),
    );

    const schemaForPrompt =
      relevantSchema.length > 0
        ? relevantSchema
        : fullSchema;

    /* -------------------- LLM → SQL -------------------- */
    const result = await this.llmService.generateSQL({
      dbType,
      schema: schemaForPrompt,
      question,
      mode,
    });

    const sql = extractSQL(result.sql);
    validateSQL(sql);

    /* ======================================================
       SQL DATABASES (Postgres / MySQL / Oracle)
       ====================================================== */
    const ds = conn.ds;

    /* ---- Column Validation ---- */
    const schemaMap = Object.fromEntries(
      fullSchema.map((t) => [t.name, t.columns]),
    );

    const columnErrors = validateColumns(
      sql,
      schemaMap,
    );

    if (columnErrors.length > 0) {
      // Optional strict mode
      // throw new BadRequestException(columnErrors.join(', '))
    }

    /* ---- Safety: enforce LIMIT ---- */
    let finalSQL = sql;
    if (!/limit\s+\d+/i.test(finalSQL)) {
      finalSQL =
        finalSQL.replace(/;$/, '') + ' LIMIT 50;';
    }

    /* ---- Execute SQL ---- */
    const rows = await ds.query(finalSQL);

    console.log(
      `NL→SQL completed in ${Date.now() - startTime} ms`,
    );

    return {
      sql: finalSQL,
      rows,
      provider: result.provider,
    };
  }
}
