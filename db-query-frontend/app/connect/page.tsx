'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type DBProvider =
  | 'supabase'
  | 'postgres'
  | 'mysql'
  | 'mongodb'
  | 'oracle';

// --- ICONS ---
const Icons = {
  supabase: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" className="text-emerald-500" />
    </svg>
  ),
  postgres: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" className="text-blue-500" />
    </svg>
  ),
  mysql: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" className="text-orange-500" />
    </svg>
  ),
  mongodb: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" className="text-green-600" />
    </svg>
  ),
  oracle: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" className="text-red-600" />
    </svg>
  ),
};

const providers = [
  { id: 'supabase', name: 'Supabase', sub: 'PostgreSQL', icon: Icons.supabase, group: 'Stable' },
  { id: 'postgres', name: 'PostgreSQL', sub: 'Standard', icon: Icons.postgres, group: 'Stable' },
  { id: 'mysql', name: 'MySQL', sub: 'Standard', icon: Icons.mysql, group: 'Stable' },
  { id: 'mongodb', name: 'MongoDB Atlas', sub: 'NoSQL', icon: Icons.mongodb, group: 'Beta' },
  { id: 'oracle', name: 'Oracle', sub: 'Standard', icon: Icons.oracle, group: 'Beta' },
];

export default function ConnectPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<DBProvider | ''>('');
  const [form, setForm] = useState<any>({
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    ssl: false,
    uri: '',
    serviceName: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function updateField(key: string, value: any) {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }

  const selectedProvider = providers.find(p => p.id === provider);

  function extractSupabaseProjectRef(host: string) {
    // Accept ONLY:
    // db.<project-ref>.supabase.co
    const match = host.trim().match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    return match ? match[1] : null;
  }


  function buildPayload() {
    switch (provider) {
      case 'supabase': {
  const projectRef = extractSupabaseProjectRef(form.host);

  if (!projectRef) {
    throw new Error(
      'Use host like: db.<project-ref>.supabase.co'
    );
  }

  return {
    dbType: 'PostgreSQL',

    // ✅ ALWAYS pooled host
    host: 'aws-1-ap-south-1.pooler.supabase.com',

    // ✅ REQUIRED pooled port
    port: 6543,

    // ✅ REQUIRED username format
    username: `postgres.${projectRef}`,

    // ✅ ALWAYS postgres
    database: 'postgres',

    password: form.password,
    ssl: true,
  };
}
      case 'postgres':
        return { dbType: 'PostgreSQL', host: form.host, port: Number(form.port || 5432), database: form.database, username: form.username, password: form.password, ssl: form.ssl };
      case 'mysql':
        return { dbType: 'MySQL', host: form.host, port: Number(form.port || 3306), database: form.database, username: form.username, password: form.password };
      case 'mongodb':
        return { dbType: 'MongoDB', uri: form.uri, database: form.database };
      case 'oracle':
        return { dbType: 'Oracle', host: form.host, port: Number(form.port || 1521), serviceName: form.serviceName, username: form.username, password: form.password };
      default:
        throw new Error('Select a database type');
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
      localStorage.setItem('dbType', payload.dbType ?? 'Unknown');
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
    <main className="min-h-screen h-screen flex items-center justify-center bg-slate-200 p-4 font-sans overflow-hidden">
      <div className="w-full max-w-300 h-150 bg-white rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT SIDE - BRANDING */}
        <div className="hidden md:flex flex-col justify-between w-[40%] bg-linear-to-br from-indigo-900 via-indigo-950 to-slate-950 p-10 text-white relative overflow-hidden z-10 shrink-0">
          <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-purple-600/30 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

          <div className="relative z-10 mt-4">
            <div className="w-14 h-14 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-6 ring-4 ring-white/10">
               <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
               </svg>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-4 drop-shadow-sm">
              <span className="block text-white">Universal</span>
              <span className="block text-indigo-300">Data Gateway</span>
            </h1>
            
            <p className="text-indigo-100/90 text-lg leading-relaxed max-w-sm font-medium">
              Connect to any SQL or NoSQL database instantly.
            </p>
          </div>

          <div className="relative z-10 flex gap-3 mb-2">
             <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 border border-white/20 shadow-sm">
               <div className="text-2xl font-bold text-white mb-0.5">5+</div>
               <div className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold">Databases</div>
             </div>
             <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 border border-white/20 shadow-sm">
               <div className="text-2xl font-bold text-white mb-0.5">AI</div>
               <div className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold">Query Engine</div>
             </div>
          </div>
        </div>

        {/* RIGHT SIDE - FORM */}
        <div className="flex-1 bg-white relative flex flex-col h-full min-w-0 p-8 md:p-12">
            <div className="max-w-3xl w-full mx-auto flex flex-col justify-center h-full">
                
                {/* HEADER + SELECTOR ROW */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-slate-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-1 tracking-tight">Welcome Back</h2>
                        <p className="text-slate-500 font-medium">Enter your credentials to access your data.</p>
                    </div>

                    <div className="w-full md:w-64">
                         <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Provider
                        </label>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="w-full text-left px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold transition-all flex items-center gap-3 hover:border-indigo-400 hover:shadow-sm group"
                        >
                            {selectedProvider ? (
                                <>
                                    <div className="p-1.5 bg-slate-50 rounded-md border border-slate-100">{selectedProvider.icon}</div>
                                    <span className="text-slate-800 text-sm">{selectedProvider.name}</span>
                                </>
                            ) : (
                                <span className="text-slate-400 text-sm">Select...</span>
                            )}
                            <div className="ml-auto text-slate-400 group-hover:text-indigo-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </button>
                    </div>
                </div>

                {/* FORM GRID */}
                <div className="flex-1 flex flex-col justify-center">
                    {!provider && (
                         <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                             <div className="text-center text-slate-400">
                                 <p className="text-sm font-medium">Please select a database provider above</p>
                             </div>
                         </div>
                    )}

                    {provider && (
                        <div className="grid grid-cols-2 gap-x-5 gap-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             
                             {/* SUPABASE SPECIFIC - Only Host & Password */}
                             {provider === 'supabase' && (
                                <>
                                    <div className="col-span-2">
                                        <label className="input-label">Host URL</label>
                                        <input 
                                            placeholder="db.ref.supabase.co" 
                                            className="input-field" 
                                            onChange={(e) => updateField('host', e.target.value)} 
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="input-label">Database Password</label>
                                        <input 
                                            type="password" 
                                            placeholder="••••••••" 
                                            className="input-field" 
                                            onChange={(e) => updateField('password', e.target.value)} 
                                        />
                                    </div>
                                    <div className="col-span-2 mt-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            Standard configuration applied automatically (Port 5432, User postgres)
                                        </div>
                                    </div>
                                </>
                             )}

                             {/* OTHER PROVIDERS */}
                             {provider !== 'supabase' && (
                                <>
                                    {/* HOST & PORT */}
                                    {provider !== 'mongodb' && (
                                        <>
                                            <div className="col-span-1">
                                                <label className="input-label">Host</label>
                                                <input placeholder="localhost" className="input-field" onChange={(e) => updateField('host', e.target.value)} />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="input-label">Port</label>
                                                <input 
                                                    placeholder={provider === 'postgres' ? '5432' : provider === 'mysql' ? '3306' : '1521'} 
                                                    type="number" 
                                                    className="input-field" 
                                                    onChange={(e) => updateField('port', e.target.value)} 
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* DB NAME / SERVICE NAME */}
                                    {provider !== 'mongodb' && (
                                        <div className="col-span-2">
                                            <label className="input-label">{provider === 'oracle' ? 'Service Name' : 'Database Name'}</label>
                                            <input 
                                                placeholder={provider === 'oracle' ? 'ORCL' : 'my_database'} 
                                                className="input-field" 
                                                onChange={(e) => updateField(provider === 'oracle' ? 'serviceName' : 'database', e.target.value)} 
                                            />
                                        </div>
                                    )}

                                    {/* MONGODB */}
                                    {provider === 'mongodb' && (
                                        <>
                                            <div className="col-span-2">
                                                <label className="input-label">Database Name</label>
                                                <input placeholder="my_database" className="input-field" onChange={(e) => updateField('database', e.target.value)} />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="input-label">Connection URI</label>
                                                <input placeholder="mongodb+srv://user:pass@cluster..." className="input-field font-mono text-xs" onChange={(e) => updateField('uri', e.target.value)} />
                                            </div>
                                        </>
                                    )}

                                    {/* USER & PASS (Not for MongoDB) */}
                                    {provider !== 'mongodb' && (
                                        <>
                                            <div className="col-span-1">
                                                <label className="input-label">Username</label>
                                                <input placeholder="postgres" className="input-field" onChange={(e) => updateField('username', e.target.value)} />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="input-label">Password</label>
                                                <input type="password" placeholder="••••••••" className="input-field" onChange={(e) => updateField('password', e.target.value)} />
                                            </div>
                                        </>
                                    )}
                                </>
                             )}
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-6">
                    <p className="text-[11px] font-medium text-slate-400 max-w-xs leading-relaxed">
                        By connecting, you agree to our Terms of Service. Data is encrypted in transit and at rest.
                    </p>
                    <button
                        onClick={connect}
                        disabled={!provider || loading}
                        className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center gap-2 text-sm uppercase tracking-wide min-w-50 justify-center"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Connect Database'}
                        {!loading && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>}
                    </button>
                </div>
                {error && <div className="mt-3 p-2 bg-red-50 text-red-700 text-xs rounded-lg text-center font-semibold border border-red-100">{error}</div>}
            </div>
        </div>
      </div>

      {/* POPUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Select Provider</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stable</div>
                    {providers.filter(p => p.group === 'Stable').map(p => (
                        <button 
                            key={p.id}
                            onClick={() => { setProvider(p.id as DBProvider); setIsModalOpen(false); }}
                            className="w-full px-3 py-3 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-3 transition-colors text-left group"
                        >
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:border-indigo-200">{p.icon}</div>
                            <div>
                                <div className="text-sm font-bold text-slate-700">{p.name}</div>
                                <div className="text-[10px] text-slate-500">{p.sub}</div>
                            </div>
                            {provider === p.id && <div className="ml-auto text-indigo-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div>}
                        </button>
                    ))}
                    
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Beta</div>
                    {providers.filter(p => p.group === 'Beta').map(p => (
                        <button 
                            key={p.id}
                            onClick={() => { setProvider(p.id as DBProvider); setIsModalOpen(false); }}
                            className="w-full px-3 py-3 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-3 transition-colors text-left group"
                        >
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:border-amber-200">{p.icon}</div>
                            <div>
                                <div className="text-sm font-bold text-slate-700">{p.name}</div>
                                <div className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded inline-block mt-0.5 font-medium">Beta Access</div>
                            </div>
                            {provider === p.id && <div className="ml-auto text-indigo-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      <style jsx>{`
        .input-label { display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; margin-left: 0.2rem; }
        .input-field { width: 100%; padding: 0.75rem 1rem; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 0.75rem; font-size: 0.9rem; font-weight: 500; color: #0f172a; transition: all 0.2s; outline: none; }
        .input-field:focus { background-color: #fff; border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
      `}</style>
    </main>
  );
}
