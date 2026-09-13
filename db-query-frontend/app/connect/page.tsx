'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const postgres = {
  id: 'postgres',
  name: 'Neon DB or PostgreSQL',
  sub: 'Standard',
  icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" className="text-blue-500" />
    </svg>,
};

export default function ConnectPage() {
  const router = useRouter();
  const [provider, setProvider] = useState(false);
  const [connectionString, setConnectionString] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  async function connect() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/connections/connect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dbType: 'PostgreSQL', connectionString }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Connection failed');
      localStorage.setItem('connectionId', data.connectionId);
      localStorage.setItem('dbType', 'PostgreSQL');
      localStorage.setItem('historyContext', 'postgres');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen h-screen flex items-center justify-center bg-slate-200 p-4 font-sans overflow-hidden">
      <div className="w-full max-w-300 h-150 bg-white rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
        <div className="hidden md:flex flex-col justify-between w-[40%] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-10 text-white relative overflow-hidden z-10 shrink-0">
          <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-purple-600/30 rounded-full blur-3xl opacity-60" />
          <div className="relative z-10 mt-4">
            <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-6 ring-4 ring-white/10">
               <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
               </svg>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-4"><span className="block">Universal</span><span className="block text-indigo-300">Data Gateway</span></h1>
            <p className="text-indigo-100/90 text-lg leading-relaxed max-w-sm font-medium">Connect to your PostgreSQL database instantly.</p>
          </div>
          <div className="relative z-10 flex gap-3 mb-2">
            <div className="bg-white/10 rounded-xl p-4 flex-1 border border-white/20"><div className="text-2xl font-bold">PostgreSQL</div><div className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold">Database</div></div>
            <div className="bg-white/10 rounded-xl p-4 flex-1 border border-white/20"><div className="text-2xl font-bold">AI</div><div className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold">Query Engine</div></div>
          </div>
        </div>

        <div className="flex-1 bg-white relative flex flex-col h-full min-w-0 p-8 md:p-12">
          <div className="max-w-3xl w-full mx-auto flex flex-col justify-center h-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-slate-100 pb-6">
              <div><h2 className="text-3xl font-bold text-slate-900 mb-1">Connect Database</h2><p className="text-slate-500 font-medium">Enter your PostgreSQL connection string.</p></div>
              <div className="w-full md:w-64">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Provider</label>
                <button onClick={() => setIsModalOpen(true)} className="w-full text-left px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold flex items-center gap-3 hover:border-indigo-400">
                  {provider ? <><div className="p-1.5 bg-slate-50 rounded-md">{postgres.icon}</div><span className="text-slate-800 text-sm">{postgres.name}</span></> : <span className="text-slate-400 text-sm">Select Provider</span>}
                  <span className="ml-auto text-slate-400">⌄</span>
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {!provider ? <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50"><p className="text-sm font-medium text-slate-400">Please select PostgreSQL above</p></div> : <div>
                <label className="input-label" htmlFor="connection-string">Connection String</label>
                <textarea id="connection-string" value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder="postgresql://user:password@host:5432/dbname?sslmode=require" className="input-field min-h-32 resize-y font-mono text-sm" spellCheck={false} />
              </div>}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-6">
              <p className="text-[11px] font-medium text-slate-400 max-w-xs">Your connection string is used only to establish this session.</p>
              <button onClick={connect} disabled={!provider || !connectionString.trim() || loading} className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50">{loading ? 'Connecting...' : 'Connect Database'}</button>
            </div>
            {error && <div className="mt-3 p-2 bg-red-50 text-red-700 text-xs rounded-lg text-center font-semibold">{error}</div>}
          </div>
        </div>
      </div>

      {isModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800">Select Provider</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 text-xl">×</button></div>
          <div className="p-2"><button onClick={() => { setProvider(true); setIsModalOpen(false); }} className="w-full px-3 py-3 hover:bg-slate-50 rounded-xl flex items-center gap-3 text-left"><div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">{postgres.icon}</div><div><div className="text-sm font-bold text-slate-700">Neon DB or PostgreSQL</div><div className="text-[10px] text-slate-500">Standard</div></div></button></div>
        </div>
      </div>}

      <style jsx>{`
        .input-label { display: block; font-size: .7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .4rem; }
        .input-field { width: 100%; padding: .75rem 1rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: .75rem; color: #0f172a; outline: none; }
        .input-field:focus { background: #fff; border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79,70,229,.1); }
      `}</style>
    </main>
  );
}
