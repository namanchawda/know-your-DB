export function extractSQL(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty LLM response');
  }

  // Remove markdown code fences
  let cleaned = text.replace(/```sql|```/gi, '').trim();

  /**
   * Match:
   *  - SELECT ...
   *  - stops before explanation text
   *  - semicolon OPTIONAL
   */
  const match = cleaned.match(
    /\bselect\b[\s\S]*?(?=;|\n\s*\n|$)/i
  );

  if (!match) {
    throw new Error('No valid SQL SELECT found');
  }

  let sql = match[0].trim();

  // Ensure semicolon for consistency
  if (!sql.endsWith(';')) {
    sql += ';';
  }

  return sql;
}
