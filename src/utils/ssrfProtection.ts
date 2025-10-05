/**
 * SSRF Protection Utilities
 * 
 * Comprehensive protection against Server-Side Request Forgery (SSRF) attacks
 * by validating URLs, blocking internal networks, and implementing domain whitelisting.
 */

import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

export interface SSRFValidationResult {
  valid: boolean;
  error?: string;
  resolvedUrl?: string;
  ipAddress?: string;
  hostname?: string;
}

export class SSRFProtection {
  // Allowed URL schemes
  private static readonly ALLOWED_SCHEMES = ['http', 'https'];
  
  // Blocked IP ranges (private networks, localhost, etc.)
  private static readonly BLOCKED_IP_RANGES = [
    '127.0.0.0/8',      // localhost
    '10.0.0.0/8',       // private class A
    '172.16.0.0/12',    // private class B
    '192.168.0.0/16',   // private class C
    '169.254.0.0/16',   // link-local
    '0.0.0.0/8',        // current network
    '224.0.0.0/4',      // multicast
    '::1',              // IPv6 localhost
    'fc00::/7',        // IPv6 private
    'fe80::/10'        // IPv6 link-local
  ];
  
  // Blocked hostnames
  private static readonly BLOCKED_HOSTNAMES = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'metadata.google.internal',
    '169.254.169.254',  // AWS metadata
    '100.100.100.200',  // Alibaba Cloud metadata
    '169.254.169.254',  // Azure metadata
    '169.254.169.254'   // GCP metadata
  ];
  
  // Allowed domains (whitelist approach)
  private static readonly ALLOWED_DOMAINS = [
    // Payment processors
    'api.stripe.com',
    'api.paypal.com',
    'api.squareup.com',
    'api.razorpay.com',
    
    // Communication services
    'api.sendgrid.com',
    'api.mailgun.net',
    'api.twilio.com',
    'hooks.slack.com',
    'api.discord.com',
    
    // Cloud services
    'api.github.com',
    'api.vercel.com',
    'api.netlify.com',
    'api.heroku.com',
    
    // CDN and assets
    'cdn.jsdelivr.net',
    'unpkg.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
    
    // Social media APIs
    'api.twitter.com',
    'graph.facebook.com',
    'api.linkedin.com',
    
    // Add your trusted external services here
    'api.example.com',  // Replace with your actual trusted domains
  ];
  
  // Allowed ports
  private static readonly ALLOWED_PORTS = [80, 443, 8080, 8443];
  
  /**
   * Validate URL for SSRF protection
   */
  static async validateUrl(url: string): Promise<SSRFValidationResult> {
    try {
      // Parse URL
      const parsedUrl = new URL(url);
      
      // Check scheme
      if (!this.ALLOWED_SCHEMES.includes(parsedUrl.protocol.slice(0, -1))) {
        return {
          valid: false,
          error: `Invalid URL scheme: ${parsedUrl.protocol}. Only HTTP and HTTPS are allowed.`
        };
      }
      
      // Check hostname
      const hostname = parsedUrl.hostname.toLowerCase();
      
      // Check against blocked hostnames
      if (this.BLOCKED_HOSTNAMES.includes(hostname)) {
        return {
          valid: false,
          error: `Blocked hostname: ${hostname}`
        };
      }
      
      // Resolve hostname to IP
      const resolved = await dnsLookup(hostname);
      const ip = resolved.address;
      
      // Check against blocked IP ranges
      if (this.isBlockedIP(ip)) {
        return {
          valid: false,
          error: `Blocked IP address: ${ip}`
        };
      }
      
      // Check against allowed domains (whitelist)
      if (!this.isAllowedDomain(hostname)) {
        return {
          valid: false,
          error: `Domain not in whitelist: ${hostname}`
        };
      }
      
      // Check port (block non-standard ports)
      const port = parsedUrl.port ? parseInt(parsedUrl.port) : (parsedUrl.protocol === 'https:' ? 443 : 80);
      if (!this.isAllowedPort(port)) {
        return {
          valid: false,
          error: `Port not allowed: ${port}`
        };
      }
      
      return {
        valid: true,
        resolvedUrl: parsedUrl.toString(),
        ipAddress: ip,
        hostname: hostname
      };
      
    } catch (error) {
      return {
        valid: false,
        error: `Invalid URL format: ${error.message}`
      };
    }
  }
  
  /**
   * Check if IP is in blocked ranges
   */
  private static isBlockedIP(ip: string): boolean {
    // Check IPv4
    if (this.isIPv4(ip)) {
      return this.isIPv4Blocked(ip);
    }
    
    // Check IPv6
    if (this.isIPv6(ip)) {
      return this.isIPv6Blocked(ip);
    }
    
    return false;
  }
  
  /**
   * Check if IPv4 is blocked
   */
  private static isIPv4Blocked(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    
    // localhost
    if (parts[0] === 127) return true;
    
    // private class A
    if (parts[0] === 10) return true;
    
    // private class B
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // private class C
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // link-local
    if (parts[0] === 169 && parts[1] === 254) return true;
    
    // current network
    if (parts[0] === 0) return true;
    
    // multicast
    if (parts[0] >= 224) return true;
    
    return false;
  }
  
  /**
   * Check if IPv6 is blocked
   */
  private static isIPv6Blocked(ip: string): boolean {
    // localhost
    if (ip === '::1') return true;
    
    // private
    if (ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true;
    
    // link-local
    if (ip.startsWith('fe80:')) return true;
    
    return false;
  }
  
  /**
   * Check if domain is allowed
   */
  private static isAllowedDomain(hostname: string): boolean {
    return this.ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  }
  
  /**
   * Check if port is allowed
   */
  private static isAllowedPort(port: number): boolean {
    return this.ALLOWED_PORTS.includes(port);
  }
  
  /**
   * Check if string is IPv4
   */
  private static isIPv4(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipv4Regex.test(ip);
  }
  
  /**
   * Check if string is IPv6
   */
  private static isIPv6(ip: string): boolean {
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  }
  
  /**
   * Sanitize URL for logging (remove sensitive data)
   */
  static sanitizeUrlForLogging(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Remove query parameters that might contain sensitive data
      const sanitized = new URL(parsed.origin + parsed.pathname);
      
      return sanitized.toString();
    } catch {
      return '[INVALID_URL]';
    }
  }
  
  /**
   * Add domain to whitelist (for dynamic configuration)
   */
  static addAllowedDomain(domain: string): void {
    if (!this.ALLOWED_DOMAINS.includes(domain)) {
      this.ALLOWED_DOMAINS.push(domain);
    }
  }
  
  /**
   * Remove domain from whitelist
   */
  static removeAllowedDomain(domain: string): void {
    const index = this.ALLOWED_DOMAINS.indexOf(domain);
    if (index > -1) {
      this.ALLOWED_DOMAINS.splice(index, 1);
    }
  }
  
  /**
   * Get current allowed domains
   */
  static getAllowedDomains(): string[] {
    return [...this.ALLOWED_DOMAINS];
  }
  
  /**
   * Validate multiple URLs at once
   */
  static async validateUrls(urls: string[]): Promise<SSRFValidationResult[]> {
    const results = await Promise.all(
      urls.map(url => this.validateUrl(url))
    );
    
    return results;
  }
  
  /**
   * Check if URL is safe for external requests
   */
  static async isUrlSafe(url: string): Promise<boolean> {
    const result = await this.validateUrl(url);
    return result.valid;
  }
}
