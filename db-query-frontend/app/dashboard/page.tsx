'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getTables,
  getColumns,
  executeQuery,
  runNLQuery,
} from '../../lib/api';

/* ================= TYPES ================= */

type QueryResult = {
  rows: any[];
};

type LLMMode = 'cloud'; // Forced to cloud only

type HistoryItem = {
  id: string;
  type: 'sql' | 'nl';
  sql: string;
  nl?: string;
  timestamp: number;
};

const BASE_HISTORY_KEY = 'query_history';
const MAX_HISTORY = 10;

/* ================= HELPERS ================= */

function getHistoryKey() {
  if (typeof window === 'undefined') return BASE_HISTORY_KEY;
  const context =
    localStorage.getItem('historyContext') ||
    localStorage.getItem('dbType') ||
    'default';
  return `${BASE_HISTORY_KEY}:${context}`;
}

/* ================= COMPONENT ================= */

export default function DashboardPage() {
  const router = useRouter();

  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<any[]>([]);

  const [sqlQuery, setSqlQuery] = useState('');
  const [nlQuery, setNlQuery] = useState('');

  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Modal States
  const [cellModalContent, setCellModalContent] = useState<string | null>(null);
  const [cellModalTitle, setCellModalTitle] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [showFullTableModal, setShowFullTableModal] = useState(false);
  
  // Disconnect Modal State
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  /* -------------------- LLM Mode -------------------- */
  // Fixed to 'cloud' as requested
  const llmMode: LLMMode = 'cloud';

  const dbType =
    typeof window !== 'undefined'
      ? localStorage.getItem('dbType') || 'PostgreSQL'
      : 'PostgreSQL';

  const historyContext =
    typeof window !== 'undefined'
      ? localStorage.getItem('historyContext')
      : null;

  const isMongo = dbType === 'MongoDB';

  /* -------------------- INITIAL LOAD -------------------- */
  useEffect(() => {
    const id = localStorage.getItem('connectionId');
    if (!id) {
      router.replace('/connect');
      return;
    }

    loadTables();
    loadHistory();
  }, [dbType, historyContext]);

  /* -------------------- HISTORY -------------------- */
  function loadHistory() {
    try {
      const key = getHistoryKey();
      const raw = localStorage.getItem(key) || '[]';
      setHistory(JSON.parse(raw));
    } catch {
      setHistory([]);
    }
  }

  function pushHistory(item: HistoryItem) {
    const key = getHistoryKey();
    const updated = [item, ...history].slice(0, MAX_HISTORY);
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  /* -------------------- Load Tables -------------------- */
  async function loadTables() {
    try {
      setError(null);
      const data = await getTables();
      if (!Array.isArray(data)) {
        throw new Error('Invalid tables response');
      }
      setTables(data);
    } catch {
      setError('Failed to load tables');
    }
  }

  /* -------------------- Load Columns -------------------- */
  async function loadColumns(table: string) {
    try {
      setSelectedTable(table);
      setColumns([]);
      setError(null);

      const data = await getColumns(table);
      setColumns(data);
    } catch {
      setError('Failed to load columns');
    }
  }

  /* -------------------- Run Raw SQL -------------------- */
  async function runSQL() {
    if (!sqlQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await executeQuery(sqlQuery);
      setResult(res);

      pushHistory({
        id: crypto.randomUUID(),
        type: 'sql',
        sql: sqlQuery,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setError(err.message || 'SQL execution failed');
    } finally {
      setLoading(false);
    }
  }

  /* -------------------- Run NL Query -------------------- */
  async function runNL() {
    if (!nlQuery.trim() || isMongo) return;

    setLoading(true);
    setError(null);

    try {
      // Always uses 'cloud' mode now
      const res = await runNLQuery(nlQuery, dbType, llmMode);

      setSqlQuery(res.sql);
      setResult({ rows: res.rows });

      pushHistory({
        id: crypto.randomUUID(),
        type: 'nl',
        nl: nlQuery,
        sql: res.sql,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setError(err.message || 'AI query failed');
    } finally {
      setLoading(false);
    }
  }

  /* -------------------- Disconnect Logic -------------------- */
  function handleDisconnectRequest() {
    setShowDisconnectModal(true);
  }

  function confirmDisconnect() {
    localStorage.removeItem('connectionId');
    localStorage.removeItem('dbType');
    localStorage.removeItem('historyContext');
    router.push('/connect');
  }

  /* -------------------- MODAL HANDLERS -------------------- */
  function openCellModal(content: string, title: string) {
    setCellModalContent(content);
    setCellModalTitle(title);
    setIsCopied(false); 
  }

  function closeCellModal() {
    setCellModalContent(null);
    setCellModalTitle('');
  }

  function handleCopy() {
    if (cellModalContent) {
      navigator.clipboard.writeText(cellModalContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); 
    }
  }

  /* ================= UI ================= */

  return (
    <div className="flex h-screen w-full bg-gray-50 text-slate-800 font-sans relative">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h1 className="font-bold text-lg text-slate-800 tracking-tight">Dashboard</h1>
          {/* ENHANCED DISCONNECT BUTTON */}
          <button 
            onClick={handleDisconnectRequest} 
            className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Exit</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tables ({tables.length})</h2>
          <div className="space-y-1">
            {tables.map((table) => (
              <div
                key={table}
                onClick={() => loadColumns(table)}
                className={`px-3 py-2 rounded-md text-sm cursor-pointer transition-colors truncate ${
                  selectedTable === table ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                }`}
                title={table}
              >
                {table}
              </div>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent History</h2>
            <div className="space-y-2">
              {history.length === 0 && <p className="text-xs text-slate-400 italic">No queries yet</p>}
              {history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => { setSqlQuery(h.sql); if (h.nl) setNlQuery(h.nl); }}
                  className="group p-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200"
                >
                  {h.type === 'nl' && <div className="text-sm font-medium text-slate-700 truncate mb-1">{h.nl}</div>}
                  <div className="text-xs text-slate-500 font-mono truncate opacity-75 group-hover:opacity-100">{h.sql}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-white flex flex-col gap-6 shrink-0">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-700">Ask with AI</label>
              {/* REMOVED DROPDOWN - Forced Cloud Badge */}
              {!isMongo && (
                 <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                   Cloud Model Active
                 </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                disabled={isMongo}
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder={isMongo ? 'Natural Language disabled for MongoDB' : 'e.g. show me the top 5 customers by spending'}
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runNL()}
              />
              <button onClick={runNL} disabled={loading || isMongo} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50">
                {loading ? 'Thinking...' : 'Ask'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 gap-6 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col shrink-0">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SQL Editor</span>
                <button onClick={runSQL} disabled={loading} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium transition-colors shadow-sm">
                  Run Query
                </button>
              </div>
              <textarea
                className="w-full p-4 font-mono text-sm text-slate-800 h-32 focus:outline-none resize-none bg-white rounded-b-xl"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM..."
                spellCheck={false}
              />
              {error && <div className="px-4 py-2 bg-red-50 text-red-600 text-sm border-t border-red-100 rounded-b-xl">{error}</div>}
            </div>

            {/* RESULTS TABLE */}
            {result?.rows && (
              <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Query Results</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400">{result.rows.length} rows found</span>
                    <button onClick={() => setShowFullTableModal(true)} className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1 rounded shadow-sm transition-colors flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Expand View
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        {Object.keys(result.rows[0] || {}).map((k) => (
                          <th key={k} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap bg-slate-50">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          {Object.values(row).map((v: any, j) => (
                            <td
                              key={j}
                              onClick={() => openCellModal(String(v), Object.keys(row)[j])}
                              className="px-4 py-2 text-sm text-slate-700 whitespace-nowrap max-w-50 truncate cursor-pointer hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Click to view full content"
                            >
                              {String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {!result?.rows && !loading && <div className="flex-1 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl m-1">Run a query to see results here</div>}
          </div>

          <div className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0">
             <div className="p-4 border-b border-slate-100">
               <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Schema Details</h2>
               <p className="text-sm font-medium text-slate-800 mt-1 truncate" title={selectedTable || ''}>{selectedTable || 'No table selected'}</p>
             </div>
             <div className="flex-1 overflow-y-auto p-2">
               {columns.length === 0 ? (
                 <div className="text-xs text-slate-400 p-4 text-center mt-10 leading-relaxed">Select a table from the left sidebar to view its columns.</div>
               ) : (
                 <div className="space-y-1">
                   {columns.map((col) => (
                     <div key={col.column_name} className="px-3 py-2 text-sm border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded transition-colors">
                       <div className="font-medium text-slate-700 truncate" title={col.column_name}>{col.column_name}</div>
                       <div className="text-xs text-slate-400 font-mono mt-0.5">{col.data_type}</div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
        </div>
      </main>

      {/* SINGLE CELL MODAL */}
      {cellModalContent !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800 uppercase tracking-wide text-sm">{cellModalTitle}</h3>
              <div className="flex gap-2">
                <button
                   onClick={handleCopy}
                   className={`text-xs border px-3 py-1.5 rounded transition-all duration-200 ${
                     isCopied 
                       ? 'bg-emerald-50 border-emerald-200 text-emerald-600 font-medium' 
                       : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                   }`}
                >
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={closeCellModal} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto bg-white">
              <pre className="text-sm text-slate-700 font-mono whitespace-pre-wrap break-all leading-relaxed">{cellModalContent}</pre>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
              <button onClick={closeCellModal} className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FULL TABLE MODAL */}
      {showFullTableModal && result?.rows && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800 uppercase tracking-wide text-sm">Full Query Results ({result.rows.length} rows)</h3>
              <button onClick={() => setShowFullTableModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-white p-4">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {Object.keys(result.rows[0] || {}).map((k) => (
                      <th key={k} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap bg-slate-50">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      {Object.values(row).map((v: any, j) => (
                        <td key={j} onClick={() => openCellModal(String(v), Object.keys(row)[j])} className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap max-w-75 truncate cursor-pointer hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Click to view full content">
                          {String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
              <button onClick={() => setShowFullTableModal(false)} className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DISCONNECT CONFIRMATION MODAL */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className="p-6 text-center">
                 <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-2">Disconnect Database?</h3>
                 <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                   Are you sure you want to disconnect? You will need to re-enter your credentials to access the data again.
                 </p>
                 <div className="flex gap-3">
                    <button 
                      onClick={() => setShowDisconnectModal(false)}
                      className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmDisconnect}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
                    >
                      Disconnect
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
