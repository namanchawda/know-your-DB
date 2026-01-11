const BASE_URL = 'https://know-your-db.onrender.com';

function getConnectionId() {
  return localStorage.getItem('connectionId');
}

export async function getTables() {
  const id = getConnectionId();
  if (!id) throw new Error('No active connection');

  const res = await fetch(
    `${BASE_URL}/schema/tables?connectionId=${id}`,
  );
  return res.json();
}

export async function getColumns(table: string) {
  const id = getConnectionId();
  if (!id) throw new Error('No active connection');

  const res = await fetch(
    `${BASE_URL}/schema/columns?connectionId=${id}&table=${table}`,
  );
  return res.json();
}

export async function executeQuery(query: string) {
  const id = getConnectionId();
  if (!id) throw new Error('No active connection');

  const res = await fetch(
    `${BASE_URL}/query/execute?connectionId=${id}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // FIXED: backend DTO expects { query }, not { sql }
      body: JSON.stringify({ query }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'SQL execution failed');
  }

  return res.json();
}

export async function runNLQuery(
  question: string,
  dbType: string,
  mode: 'local' | 'cloud' | 'auto',
) {
  const id = getConnectionId();
  if (!id) throw new Error('No active connection');

  const res = await fetch(
    `${BASE_URL}/nl/query?connectionId=${id}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, dbType, mode }),
    },
  );

  if (!res.ok) {
    throw new Error('NL query failed');
  }

  return res.json();
}

export async function connectDatabase(payload: {
  dbType: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  uri?: string;
}) {
  const res = await fetch(
    `${BASE_URL}/connections/connect`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Connection failed');
  }

  return res.json(); // { connectionId }
}

