/**
 * QR Code Security Test Suite
 * 
 * Tests to verify that QR codes remain scannable after security improvements
 * while blocking malicious content.
 */

import { SecureJsonParser } from './secureJsonParser';
import { XssProtection } from './xssProtection';
import { SecureQrGenerator } from './secureQrGenerator';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  data?: any;
}

export class QrSecurityTest {
  
  /**
   * Run all security tests
   */
  static async runAllTests(): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: TestResult[];
  }> {
    const tests = [
      () => this.testValidCustomerQrCode(),
      () => this.testValidLoyaltyQrCode(),
      () => this.testValidPromoQrCode(),
      () => this.testSecureQrGeneration(),
      () => this.testIntegrityVerification(),
      () => this.testXssProtection(),
      () => this.testMaliciousJsonBlocked(),
      () => this.testLegacyCompatibility(),
      () => this.testExpiredQrCodes(),
      () => this.testJsonSizeLimit()
    ];
    
    const results: TestResult[] = [];
    
    for (const test of tests) {
      try {
        const result = await test();
        results.push(result);
      } catch (error) {
        results.push({
          testName: 'Unknown Test',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    
    return {
      totalTests: results.length,
      passedTests,
      failedTests,
      results
    };
  }
  
  /**
   * Test that valid customer QR codes still work
   */
  static testValidCustomerQrCode(): TestResult {
    try {
      const customerQrData = {
        type: 'customer',
        customerId: '12345',
        customerName: 'John Doe',
        cardNumber: 'GC-001234-C',
        cardType: 'STANDARD',
        timestamp: Date.now()
      };
      
      const jsonString = JSON.stringify(customerQrData);
      const parsed = SecureJsonParser.safeParse(jsonString);
      const sanitized = XssProtection.sanitizeQrDisplayData(parsed);
      
      const isValid = sanitized &&
                     sanitized.type === 'customer' &&
                     sanitized.customerId === '12345' &&
                     sanitized.customerName === 'John Doe';
      
      return {
        testName: 'Valid Customer QR Code',
        passed: isValid,
        data: sanitized
      };
    } catch (error) {
      return {
        testName: 'Valid Customer QR Code',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test that valid loyalty QR codes still work
   */
  static testValidLoyaltyQrCode(): TestResult {
    try {
      const loyaltyQrData = {
        type: 'loyaltyCard',
        cardId: '67890',
        customerId: '12345',
        programId: '100',
        businessId: '200',
        points: 150,
        timestamp: Date.now()
      };
      
      const jsonString = JSON.stringify(loyaltyQrData);
      const parsed = SecureJsonParser.safeParse(jsonString);
      const sanitized = XssProtection.sanitizeQrDisplayData(parsed);
      
      const isValid = sanitized &&
                     sanitized.type === 'loyaltyCard' &&
                     sanitized.cardId === '67890' &&
                     sanitized.points === 150;
      
      return {
        testName: 'Valid Loyalty QR Code',
        passed: isValid,
        data: sanitized
      };
    } catch (error) {
      return {
        testName: 'Valid Loyalty QR Code',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test that valid promo QR codes still work
   */
  static testValidPromoQrCode(): TestResult {
    try {
      const promoQrData = {
        type: 'promoCode',
        code: 'SAVE20',
        businessId: '200',
        discount: 20,
        expiryDate: '2024-12-31',
        timestamp: Date.now()
      };
      
      const jsonString = JSON.stringify(promoQrData);
      const parsed = SecureJsonParser.safeParse(jsonString);
      const sanitized = XssProtection.sanitizeQrDisplayData(parsed);
      
      const isValid = sanitized &&
                     sanitized.type === 'promoCode' &&
                     sanitized.code === 'SAVE20' &&
                     sanitized.discount === 20;
      
      return {
        testName: 'Valid Promo QR Code',
        passed: isValid,
        data: sanitized
      };
    } catch (error) {
      return {
        testName: 'Valid Promo QR Code',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test secure QR generation
   */
  static async testSecureQrGeneration(): Promise<TestResult> {
    try {
      const originalData = {
        type: 'customer',
        customerId: '12345',
        customerName: 'Jane Smith'
      };
      
      const secureQrString = await SecureQrGenerator.generateSecureQrCode(originalData);
      const parsedSecureData = JSON.parse(secureQrString);
      
      const hasSecurityFeatures = parsedSecureData.nonce &&
                                 parsedSecureData.timestamp &&
                                 parsedSecureData.version &&
                                 parsedSecureData.integrity;
      
      return {
        testName: 'Secure QR Generation',
        passed: hasSecurityFeatures,
        data: parsedSecureData
      };
    } catch (error) {
      return {
        testName: 'Secure QR Generation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test integrity verification
   */
  static async testIntegrityVerification(): Promise<TestResult> {
    try {
      const originalData = {
        type: 'customer',
        customerId: '12345',
        customerName: 'Test User'
      };
      
      const secureQrString = await SecureQrGenerator.generateSecureQrCode(originalData);
      const parsedSecureData = JSON.parse(secureQrString);
      
      // Test valid integrity
      const validCheck = SecureQrGenerator.verifyQrCodeSecurity(parsedSecureData);
      
      // Test tampered data
      const tamperedData = { ...parsedSecureData };
      tamperedData.customerName = 'Hacker';
      const tamperedCheck = SecureQrGenerator.verifyQrCodeSecurity(tamperedData);
      
      return {
        testName: 'Integrity Verification',
        passed: validCheck.isValid && !tamperedCheck.isValid,
        data: { validCheck, tamperedCheck }
      };
    } catch (error) {
      return {
        testName: 'Integrity Verification',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test XSS protection
   */
  static testXssProtection(): TestResult {
    try {
      const maliciousData = {
        type: 'customer',
        customerId: '12345',
        customerName: '<script>alert("XSS")</script>',
        description: 'javascript:alert("XSS")',
        onload: 'alert("XSS")'
      };
      
      const sanitized = XssProtection.sanitizeQrDisplayData(maliciousData);
      
      const isSafe = !sanitized.customerName.includes('<script>') &&
                     !sanitized.description.includes('javascript:') &&
                     !sanitized.onload; // Should be removed
      
      return {
        testName: 'XSS Protection',
        passed: isSafe,
        data: sanitized
      };
    } catch (error) {
      return {
        testName: 'XSS Protection',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test that malicious JSON is blocked
   */
  static testMaliciousJsonBlocked(): TestResult {
    try {
      const maliciousJson = '{"__proto__": {"isAdmin": true}, "constructor": {"prototype": {"isAdmin": true}}, "type": "customer", "customerId": "123"}';
      
      let parseSucceeded = false;
      let parsed: any = null;
      
      try {
        parsed = SecureJsonParser.safeParse(maliciousJson);
        parseSucceeded = true;
      } catch (error) {
        // Expected to throw
      }
      
      // If parsing succeeded, check that dangerous properties were removed
      const isSafe = !parseSucceeded || 
                    (parsed && 
                     !parsed.__proto__ && 
                     !parsed.constructor && 
                     parsed.type === 'customer');
      
      return {
        testName: 'Malicious JSON Blocked',
        passed: isSafe,
        data: { parseSucceeded, parsed }
      };
    } catch (error) {
      return {
        testName: 'Malicious JSON Blocked',
        passed: true, // Error means it was blocked
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test legacy compatibility
   */
  static testLegacyCompatibility(): TestResult {
    try {
      const legacyData = {
        type: 'customer',
        id: '12345', // Old field name
        name: 'Legacy User', // Old field name
        cardNumber: 'GC-001234-C'
      };
      
      const jsonString = JSON.stringify(legacyData);
      const parsed = SecureJsonParser.safeParse(jsonString);
      const sanitized = XssProtection.sanitizeQrDisplayData(parsed);
      
      // Should still work even with old field names
      const isCompatible = sanitized &&
                          sanitized.type === 'customer' &&
                          (sanitized.id === '12345' || sanitized.customerId === '12345') &&
                          (sanitized.name === 'Legacy User' || sanitized.customerName === 'Legacy User');
      
      return {
        testName: 'Legacy Compatibility',
        passed: isCompatible,
        data: sanitized
      };
    } catch (error) {
      return {
        testName: 'Legacy Compatibility',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test expired QR code handling
   */
  static async testExpiredQrCodes(): Promise<TestResult> {
    try {
      const expiredData = {
        type: 'customer',
        customerId: '12345',
        customerName: 'Test User',
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        expiresAt: Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago
      };
      
      const isExpired = SecureQrGenerator.isExpired(expiredData);
      const securityCheck = SecureQrGenerator.verifyQrCodeSecurity(expiredData);
      
      return {
        testName: 'Expired QR Code Handling',
        passed: isExpired && !securityCheck.isValid,
        data: { isExpired, securityCheck }
      };
    } catch (error) {
      return {
        testName: 'Expired QR Code Handling',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test JSON size limit
   */
  static testJsonSizeLimit(): TestResult {
    try {
      // Create a very large JSON string (over 10KB)
      const largeData = {
        type: 'customer',
        customerId: '12345',
        customerName: 'A'.repeat(15000), // 15KB of 'A' characters
        timestamp: Date.now()
      };
      
      const largeJsonString = JSON.stringify(largeData);
      
      let parseSucceeded = false;
      try {
        SecureJsonParser.safeParse(largeJsonString);
        parseSucceeded = true;
      } catch (error) {
        // Expected to throw due to size limit
      }
      
      return {
        testName: 'JSON Size Limit',
        passed: !parseSucceeded, // Should fail due to size limit
        data: { size: largeJsonString.length, parseSucceeded }
      };
    } catch (error) {
      return {
        testName: 'JSON Size Limit',
        passed: true, // Error means size limit worked
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Generate test report
   */
  static generateReport(testResults: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: TestResult[];
  }): string {
    let report = '# QR Code Security Test Report\n\n';
    report += `**Total Tests:** ${testResults.totalTests}\n`;
    report += `**Passed:** ${testResults.passedTests}\n`;
    report += `**Failed:** ${testResults.failedTests}\n`;
    report += `**Success Rate:** ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%\n\n`;
    
    report += '## Test Results\n\n';
    
    for (const result of testResults.results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `### ${result.testName} - ${status}\n`;
      
      if (result.error) {
        report += `**Error:** ${result.error}\n`;
      }
      
      if (result.data) {
        report += `**Data:** \`${JSON.stringify(result.data, null, 2)}\`\n`;
      }
      
      report += '\n';
    }
    
    return report;
  }
}

export default QrSecurityTest;
