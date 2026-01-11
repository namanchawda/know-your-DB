export function formatSchema(
  tables: { name: string; columns: string[] }[],
): string {
  return tables
    .map(
      (t) =>
        `- ${t.name}(${t.columns.join(', ')})`,
    )
    .join('\n');
}
