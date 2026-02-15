
/**
 * Decodes Cloudflare email protection string.
 * Cloudflare uses a simple XOR cipher where the first byte is the key.
 * @param hex The hex-encoded string from data-cfemail or the URL.
 */
export function decodeCloudflareEmail(hex: string): string {
  let email = "";
  // The first two characters (one byte) are the XOR key
  const r = parseInt(hex.substring(0, 2), 16);
  
  for (let n = 2; n < hex.length; n += 2) {
    // XOR each subsequent byte with the key
    const i = parseInt(hex.substring(n, n + 2), 16) ^ r;
    email += String.fromCharCode(i);
  }
  
  return email;
}

/**
 * Extracts Cloudflare protected strings from HTML content using regex.
 */
export function extractCloudflareHex(html: string): string[] {
  const cfEmailRegex = /data-cfemail="([a-f0-9]+)"/gi;
  const cfUrlRegex = /\/cdn-cgi\/l\/email-protection#([a-f0-9]+)/gi;
  
  const results: Set<string> = new Set();
  let match;
  
  while ((match = cfEmailRegex.exec(html)) !== null) {
    results.add(match[1]);
  }
  
  while ((match = cfUrlRegex.exec(html)) !== null) {
    results.add(match[1]);
  }
  
  return Array.from(results);
}
