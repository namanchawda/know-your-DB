export function validateSQL(sql: string) {
  const forbidden = ['insert', 'update', 'delete', 'drop', 'alter'];

  const lower = sql.toLowerCase();

  for (const word of forbidden) {
    if (lower.includes(word)) {
      throw new Error('Unsafe SQL detected');
    }
  }

  if (!lower.trim().startsWith('select')) {
    throw new Error('Only SELECT queries are allowed');
  }
}
