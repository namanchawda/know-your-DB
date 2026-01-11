export function validateColumns(
  sql: string,
  schema: Record<string, string[]>,
): string[] {
  const errors: string[] = [];

  for (const [table, columns] of Object.entries(schema)) {
    const regex = new RegExp(
      `\\b${table}\\.([a-zA-Z_][a-zA-Z0-9_]*)`,
      'gi',
    );

    let match;
    while ((match = regex.exec(sql))) {
      const column = match[1];
      if (!columns.includes(column)) {
        errors.push(
          `Column ${table}.${column} does not exist`,
        );
      }
    }
  }

  return errors;
}
