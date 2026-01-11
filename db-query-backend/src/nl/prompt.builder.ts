type TableSchema = {
  name: string;
  columns: string[];
};

export function buildNLtoSQLPrompt(
  dbType: string,
  schema: { name: string; columns: string[] }[],
  question: string,
) {
  const schemaText = schema
    .map(t => `${t.name}: ${t.columns.join(', ')}`)
    .join('; ');

  return `
Generate ONE ${dbType} SQL SELECT query.

Schema:
${schemaText}

Rules:
- Use only listed tables & columns
- No explanations
- Return SQL only

Question:
${question}
`;
}
