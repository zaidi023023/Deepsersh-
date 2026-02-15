
import { decodeCloudflareEmail, extractCloudflareHex } from './cloudflareDecoder';
import { EmailEntry } from '../types';

/**
 * محرك استخراج الإيميلات المتقدم - Shadow Extract V4
 */
export function extractEmails(html: string, url: string): EmailEntry[] {
  const entries: EmailEntry[] = [];
  const timestamp = new Date().toISOString();

  // 1. النمط القياسي الفائق
  const standardRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  const standardMatches = html.match(standardRegex) || [];
  standardMatches.forEach(email => {
    entries.push({ email: email.toLowerCase(), sourceUrl: url, type: 'plain', timestamp });
  });

  // 2. استخراج mailto: مع تنظيف متقدم
  const mailtoRegex = /href=["']mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})["']/gi;
  let mailtoMatch;
  while ((mailtoMatch = mailtoRegex.exec(html)) !== null) {
    entries.push({ email: mailtoMatch[1].toLowerCase(), sourceUrl: url, type: 'mailto', timestamp });
  }

  // 3. الأنماط المموهة (Obfuscated) - تغطية شاملة
  const obfuscatedPatterns = [
    { regex: /([a-zA-Z0-9._%+-]+)\s*\[at\]\s*([a-zA-Z0-9.-]+)\s*\[dot\]\s*([a-zA-Z]{2,})/gi, replacer: (m: any, p1: any, p2: any, p3: any) => `${p1}@${p2}.${p3}` },
    { regex: /([a-zA-Z0-9._%+-]+)\s*\(at\)\s*([a-zA-Z0-9.-]+)\s*\(dot\)\s*([a-zA-Z]{2,})/gi, replacer: (m: any, p1: any, p2: any, p3: any) => `${p1}@${p2}.${p3}` },
    { regex: /([a-zA-Z0-9._%+-]+)\s*@\s*([a-zA-Z0-9.-]+)\s*\.\s*([a-zA-Z]{2,})/gi, replacer: (m: any, p1: any, p2: any, p3: any) => `${p1}@${p2}.${p3}` }
  ];

  obfuscatedPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(html)) !== null) {
      // Fix: Use apply to pass the match array as arguments to the replacer function to avoid spread argument error
      const email = pattern.replacer.apply(null, match as any);
      entries.push({ email: email.toLowerCase(), sourceUrl: url, type: 'obfuscated', timestamp });
    }
  });

  // 4. فك تشفير Cloudflare - الأولوية القصوى
  const cfHexes = extractCloudflareHex(html);
  cfHexes.forEach(hex => {
    try {
      const decoded = decodeCloudflareEmail(hex);
      if (decoded && decoded.includes('@')) {
        entries.push({ email: decoded.toLowerCase(), sourceUrl: url, type: 'cloudflare', timestamp });
      }
    } catch (e) {}
  });

  // 5. استخراج من نصوص داخل JSON (مثل محتوى الـ API)
  const jsonEmailRegex = /\\u0040|%40/i; // البحث عن @ مشفرة
  if (jsonEmailRegex.test(html)) {
    const decodedHtml = decodeURIComponent(html.replace(/\\u0040/g, '@'));
    const jsonMatches = decodedHtml.match(standardRegex) || [];
    jsonMatches.forEach(email => {
      entries.push({ email: email.toLowerCase(), sourceUrl: url, type: 'plain', timestamp });
    });
  }

  // إزالة التكرار مع الحفاظ على الأولوية للنوع الأقوى (Cloudflare > mailto > plain)
  const uniqueEmails = new Map<string, EmailEntry>();
  entries.forEach(entry => {
    if (!uniqueEmails.has(entry.email)) {
      uniqueEmails.set(entry.email, entry);
    } else {
      const existing = uniqueEmails.get(entry.email)!;
      const typePriority = { 'cloudflare': 3, 'mailto': 2, 'obfuscated': 1, 'plain': 0 };
      if (typePriority[entry.type] > typePriority[existing.type]) {
        uniqueEmails.set(entry.email, entry);
      }
    }
  });

  return Array.from(uniqueEmails.values());
}
