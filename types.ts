
export interface EmailEntry {
  email: string;
  sourceUrl: string;
  type: 'plain' | 'obfuscated' | 'cloudflare' | 'mailto';
  timestamp: string;
}

export interface CrawlStats {
  pagesVisited: number;
  emailsFound: number;
  startTime: number;
  endTime?: number;
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export interface CrawlSettings {
  depth: number;
  delay: number;
  sameDomain: boolean;
  includeSubdomains: boolean;
}
