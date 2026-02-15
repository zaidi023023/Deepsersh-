
import React from 'react';
import { EmailEntry } from '../types';

interface ResultsTableProps {
  emails: EmailEntry[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ emails }) => {
  if (emails.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
        No emails found yet. Start crawling to see results.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-zinc-800 rounded-xl shadow-xl bg-zinc-900/50 backdrop-blur-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-zinc-800/80 text-zinc-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4 font-semibold">Email Address</th>
            <th className="px-6 py-4 font-semibold">Detection Type</th>
            <th className="px-6 py-4 font-semibold">Source Page</th>
            <th className="px-6 py-4 font-semibold">Found At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {emails.map((entry, idx) => (
            <tr key={`${entry.email}-${idx}`} className="hover:bg-zinc-800/30 transition-colors">
              <td className="px-6 py-4 text-blue-400 font-medium select-all mono">{entry.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  entry.type === 'cloudflare' ? 'bg-orange-900/30 text-orange-400 border border-orange-500/20' :
                  entry.type === 'mailto' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/20' :
                  entry.type === 'obfuscated' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20' :
                  'bg-blue-900/30 text-blue-400 border border-blue-500/20'
                }`}>
                  {entry.type}
                </span>
              </td>
              <td className="px-6 py-4 text-zinc-400 truncate max-w-[200px] text-xs">
                <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-300">
                  {entry.sourceUrl}
                </a>
              </td>
              <td className="px-6 py-4 text-zinc-500 text-xs">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;
