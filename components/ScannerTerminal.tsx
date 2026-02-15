
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface ScannerTerminalProps {
  logs: LogEntry[];
}

const ScannerTerminal: React.FC<ScannerTerminalProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-black border border-zinc-800 rounded-lg h-64 overflow-y-auto p-4 mono text-xs shadow-inner">
      {logs.length === 0 && (
        <div className="text-zinc-600 italic">Waiting for input...</div>
      )}
      {logs.map((log) => (
        <div key={log.id} className="mb-1 flex gap-2">
          <span className="text-zinc-500">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
          <span className={`
            ${log.type === 'info' ? 'text-blue-400' : ''}
            ${log.type === 'success' ? 'text-green-400 font-bold' : ''}
            ${log.type === 'warning' ? 'text-yellow-400' : ''}
            ${log.type === 'error' ? 'text-red-400 underline font-bold' : ''}
          `}>
            {log.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ScannerTerminal;
