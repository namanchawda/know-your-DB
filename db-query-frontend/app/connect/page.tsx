'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type DBProvider =
  | 'supabase'
  | 'postgres'
  | 'mysql'
  | 'mongodb'
  | 'oracle';

/* ---------------- ICONS ---------------- */

const Icons = {
  supabase: <span className="text-emerald-500 font-bold">S</span>,
  postgres: <span className="text-blue-500 font-bold">P</span>,
  mysql: <span className="text-orange-500 font-bold">M</span>,
  mongodb: <span className="text-green-600 font-bold">M</span>,
  oracle: <span className="text-red-600 font-bold">O</span>,
};

const providers = [
  { id: 'supabase', name: 'Supabase (Postgres)', sub: 'PostgreSQL', icon: Icons.supabase, group: 'Stable' },
  { id: 'postgres', name: 'PostgreSQL', sub: 'Standard', icon: Icons.postgres, group: 'Stable' },
  { id: 'mysql', name: 'MySQL', sub: 'Standard', icon: Icons.mysql, group: 'Stable' },
  { id: 'mongodb', name: 'MongoDB Atlas', sub: 'NoSQL', icon: Icons.mongodb, group: 'Beta' },
  { id: 'oracle', name: 'Oracle', sub: 'Standard', icon: Icons.oracle, group: 'Beta' },
];

export default function ConnectPage() {
  const router = useRouter();

  const [provider, setProvider] = useState<DBProvider | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    ssl: true,
    uri: '',
    serviceName: '',
  });

  useEffect(() => setMounted(true), []);

  function updateField(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    switch (provider) {
      case 'supabase':
      case 'postgres':
        return {
          dbType: 'PostgreSQL',
          host: form.host,
          port: Number(form.port),
          database: form.database,
          username: form.username,
          password: form.password,
          ssl: true,
        };

      case 'mysql':
        return {
          dbType: 'MySQL',
          host: form.host,
          port: Number(form.port),
          database: form.database,
          username: form.username,
          password: form.password,
        };

      case 'mongodb':
        return {
          dbType: 'MongoDB',
          uri: form.uri,
          database: form.database,
        };

      case 'oracle':
        return {
          dbType: 'Oracle',
          host: form.host,
          port: Number(form.port),
          serviceName: form.serviceName,
          username: form.username,
          password: form.password,
        };

      default:
        throw new Error('Select a database provider');
    }
  }

  async function connect() {
    setError(null);
    setLoading(true);
    try {
      const payload = buildPayload();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/connections/connect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Connection failed');

      localStorage.setItem('connectionId', data.connectionId);
      localStorage.setItem('dbType', payload.dbType);
      localStorage.setItem('historyContext', provider);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-200 p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8">

        <h2 className="text-2xl font-bold mb-6">Connect Database</h2>

        {/* Provider */}
        <select
          value={provider}
          onChange={e => setProvider(e.target.value as DBProvider)}
          className="w-full mb-4 p-3 border rounded"
        >
          <option value="">Select Provider</option>
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* SQL FORM (Supabase INCLUDED) */}
        {provider && provider !== 'mongodb' && (
          <>
            <input className="input-field mb-3" placeholder="Host"
              onChange={e => updateField('host', e.target.value)} />

            <input className="input-field mb-3" type="number"
              placeholder={provider === 'supabase' ? '6543' : '5432'}
              onChange={e => updateField('port', e.target.value)} />

            {provider !== 'oracle' && (
              <input className="input-field mb-3" placeholder="Database (e.g. postgres)"
                onChange={e => updateField('database', e.target.value)} />
            )}

            {provider === 'oracle' && (
              <input className="input-field mb-3" placeholder="Service Name"
                onChange={e => updateField('serviceName', e.target.value)} />
            )}

            <input className="input-field mb-3"
              placeholder={provider === 'supabase' ? 'postgres.<project-ref>' : 'Username'}
              onChange={e => updateField('username', e.target.value)} />

            <input type="password" className="input-field mb-3"
              placeholder="Password"
              onChange={e => updateField('password', e.target.value)} />
          </>
        )}

        {/* MongoDB */}
        {provider === 'mongodb' && (
          <>
            <input className="input-field mb-3" placeholder="Database"
              onChange={e => updateField('database', e.target.value)} />
            <input className="input-field mb-3" placeholder="Mongo URI"
              onChange={e => updateField('uri', e.target.value)} />
          </>
        )}

        <button
          onClick={connect}
          disabled={!provider || loading}
          className="w-full bg-indigo-600 text-white py-3 rounded font-bold mt-4"
        >
          {loading ? 'Connecting...' : 'Connect Database'}
        </button>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          background: #f8fafc;
        }
      `}</style>
    </main>
  );
}
