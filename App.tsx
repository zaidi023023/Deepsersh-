
import React, { useState, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Terminal, 
  Download, 
  Database, 
  Play, 
  Square,
  Globe,
  Mail,
  Zap,
  Layers,
  Activity,
  Cpu,
  Wifi,
  AlertTriangle,
  Radio,
  Unplug,
  Fingerprint
} from 'lucide-react';
import { EmailEntry, LogEntry, CrawlStats, CrawlSettings } from './types';
import { extractEmails } from './services/emailExtractor';
import ScannerTerminal from './components/ScannerTerminal';
import ResultsTable from './components/ResultsTable';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [settings, setSettings] = useState<CrawlSettings>({
    depth: 2,
    delay: 1,
    sameDomain: true,
    includeSubdomains: true
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [stats, setStats] = useState<CrawlStats>({
    pagesVisited: 0,
    emailsFound: 0,
    startTime: 0
  });

  const stopSignal = useRef(false);
  const lastSuccessfulTunnel = useRef<number | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [
      ...prev, 
      { 
        id: Math.random().toString(36).substr(2, 9), 
        message, 
        type, 
        timestamp: new Date().toISOString() 
      }
    ].slice(-100));
  }, []);

  const fetchWithTimeout = async (resource: string, options: any, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  const fetchLiveContent = async (targetUrl: string): Promise<{html: string, links: string[]}> => {
    const tunnels = [
      { name: "VOID GATE", url: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}` },
      { name: "NEURAL RELAY", url: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
      { name: "QUANTUM TUNNEL", url: (u: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}` },
      { name: "SHADOW STREAM", url: (u: string) => `https://thingproxy.freeboard.io/fetch/${u}` }
    ];

    let prioritizedTunnels = [...tunnels];
    if (lastSuccessfulTunnel.current !== null) {
      const successful = prioritizedTunnels.splice(lastSuccessfulTunnel.current, 1)[0];
      prioritizedTunnels.unshift(successful);
    }

    for (let i = 0; i < prioritizedTunnels.length; i++) {
      const tunnel = prioritizedTunnels[i];
      try {
        addLog(`[System] فحص العقدة عبر: ${tunnel.name}...`, "info");
        
        const response = await fetchWithTimeout(tunnel.url(targetUrl), {
          method: 'GET',
          headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        if (!html || html.length < 200) throw new Error("Empty Response");

        lastSuccessfulTunnel.current = tunnels.findIndex(t => t.name === tunnel.name);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const baseUrl = new URL(targetUrl);
        
        const links: string[] = Array.from(doc.querySelectorAll('a[href]'))
          .map(a => {
            try {
              const href = a.getAttribute('href')?.split('#')[0].split('?')[0].trim();
              if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return '';
              return new URL(href, baseUrl.href).href;
            } catch { return ''; }
          })
          .filter(link => link && link.startsWith('http'));

        addLog(`[Success] تم اختراق العقدة بنجاح`, "success");
        return { html, links: Array.from(new Set(links)) };

      } catch (e: any) {
        addLog(`[Skip] فشل الاتصال عبر ${tunnel.name}`, "warning");
        continue;
      }
    }
    throw new Error("تجاوزت العقدة كافة محاولات الاختراق.");
  };

  const handleCrawl = async () => {
    if (!url) return addLog("يرجى إدخال الهدف.", "error");

    let startUrl = url.trim();
    if (!/^https?:\/\//i.test(startUrl)) startUrl = 'https://' + startUrl;

    setIsCrawling(true);
    stopSignal.current = false;
    setEmails([]);
    setLogs([]);
    setStats({ pagesVisited: 0, emailsFound: 0, startTime: Date.now() });

    addLog(`[Mission] انطلاق نظام الاستخراج الشامل V3...`, "success");

    const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
    const visited = new Set<string>();
    const foundEmailsSet = new Set<string>();
    
    let baseHostname = "";
    try { baseHostname = new URL(startUrl).hostname.replace('www.', ''); } catch { baseHostname = startUrl; }

    while (queue.length > 0 && !stopSignal.current) {
      const current = queue.shift();
      if (!current || visited.has(current.url) || current.depth > settings.depth) continue;

      visited.add(current.url);
      setStats(prev => ({ ...prev, pagesVisited: visited.size }));

      try {
        const { html, links } = await fetchLiveContent(current.url);
        
        const extracted = extractEmails(html, current.url);
        extracted.forEach(entry => {
          if (!foundEmailsSet.has(entry.email)) {
            foundEmailsSet.add(entry.email);
            setEmails(prev => [entry, ...prev]);
            setStats(prev => ({ ...prev, emailsFound: foundEmailsSet.size }));
            addLog(`[+Asset] ${entry.email}`, "success");
          }
        });

        if (current.depth < settings.depth) {
          const newLinks = links.filter(link => {
            try {
              const linkHost = new URL(link).hostname.replace('www.', '');
              const isTarget = !settings.sameDomain || linkHost === baseHostname || linkHost.endsWith('.' + baseHostname);
              return isTarget && !visited.has(link);
            } catch { return false; }
          });
          
          newLinks.forEach(link => queue.push({ url: link, depth: current.depth + 1 }));
          if (newLinks.length > 0) addLog(`[Scan] تم العثور على ${newLinks.length} رابط جديد.`, "info");
        }

        if (settings.delay > 0) await new Promise(r => setTimeout(r, settings.delay * 1000));

      } catch (err: any) {
        addLog(`[Notice] العقدة ${current.url} محمية بشدة، تجاوزها...`, "warning");
      }
    }

    setIsCrawling(false);
    addLog(`[Complete] تمت المهمة بنجاح. الأصول المستخرجة: ${foundEmailsSet.size}`, "success");
  };

  const stopCrawl = () => {
    stopSignal.current = true;
    setIsCrawling(false);
    addLog("[Alert] تم قطع الاتصال يدوياً.", "error");
  };

  return (
    <div className="min-h-screen bg-[#010102] text-zinc-300 selection:bg-blue-600/40 font-['Inter'] relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      
      <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-2xl border-b border-white/5 px-10 py-6 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="bg-zinc-900 border border-white/10 p-3 rounded-2xl">
            <Fingerprint size={28} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase flex items-center gap-3 tracking-tighter">
              ShadowCore <span className="text-blue-500">ULTRA V3</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">Deep Scraper Engine</span>
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Protocol Connectivity</span>
          <div className="flex gap-1 mt-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${isCrawling ? 'bg-blue-500 animate-pulse' : 'bg-zinc-800'}`}></div>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-[1700px] mx-auto px-10 py-12">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          <div className="xl:col-span-4 space-y-8">
            <div className="bg-[#0a0a0c] border border-white/5 rounded-[3rem] p-10 shadow-2xl">
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Mission Objective</label>
                  <input 
                    type="text"
                    placeholder="example.com"
                    className="w-full bg-black border border-white/10 rounded-2xl py-6 px-8 text-sm font-bold focus:border-blue-500/50 outline-none transition-all text-white"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isCrawling}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-black/40 p-6 rounded-[1.5rem] border border-white/5">
                    <span className="text-[9px] font-black text-zinc-600 uppercase block mb-3">Depth: {settings.depth}</span>
                    <input type="range" min="1" max="5" value={settings.depth} onChange={(e) => setSettings({...settings, depth: parseInt(e.target.value)})} className="w-full accent-blue-600" />
                  </div>
                  <div className="bg-black/40 p-6 rounded-[1.5rem] border border-white/5">
                    <span className="text-[9px] font-black text-zinc-600 uppercase block mb-3">Delay: {settings.delay}s</span>
                    <input type="range" min="0" max="5" value={settings.delay} onChange={(e) => setSettings({...settings, delay: parseInt(e.target.value)})} className="w-full accent-blue-600" />
                  </div>
                </div>

                <button 
                  onClick={isCrawling ? stopCrawl : handleCrawl}
                  className={`w-full font-black py-7 rounded-3xl flex items-center justify-center gap-4 transition-all active:scale-95 text-lg uppercase tracking-widest ${
                    isCrawling ? 'bg-white text-black' : 'bg-blue-600 text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)]'
                  }`}
                >
                  {isCrawling ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  {isCrawling ? 'Terminate' : 'Execute'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#0a0a0c] border border-white/5 p-8 rounded-[2rem] flex flex-col items-center">
                <Mail size={24} className="text-blue-500 mb-3" />
                <span className="text-4xl font-black text-white">{stats.emailsFound}</span>
                <p className="text-[9px] font-black text-zinc-600 uppercase mt-3">Assets</p>
              </div>
              <div className="bg-[#0a0a0c] border border-white/5 p-8 rounded-[2rem] flex flex-col items-center">
                <Activity size={24} className="text-green-500 mb-3" />
                <span className="text-4xl font-black text-white">{stats.pagesVisited}</span>
                <p className="text-[9px] font-black text-zinc-600 uppercase mt-3">Nodes</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-700 uppercase tracking-widest px-2">Extraction Logs</h3>
              <ScannerTerminal logs={logs} />
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="bg-[#0a0a0c] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl min-h-[750px] flex flex-col">
              <div className="p-10 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Harvested Data</h2>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1 tracking-widest">Encrypted Vault</p>
                </div>
                {emails.length > 0 && (
                  <button 
                    onClick={() => {
                       const blob = new Blob([emails.map(e => `${e.email}`).join('\n')], {type: 'text/plain'});
                       const a = document.createElement('a');
                       a.href = URL.createObjectURL(blob);
                       a.download = `shadow_export_${Date.now()}.txt`;
                       a.click();
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-black px-8 py-4 rounded-2xl transition-all"
                  >
                    SAVE DATABASE
                  </button>
                )}
              </div>
              <div className="flex-1 p-4">
                <ResultsTable emails={emails} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
