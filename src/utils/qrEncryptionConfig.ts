/**
 * QR Encryption Configuration & Testing Utility
 * 
 * Provides configuration management and testing tools for the QR encryption system.
 * Helps ensure proper setup and backward compatibility.
 */

import { QrEncryption } from './qrEncryption';
import QrDataManager from './qrDataManager';

export interface QrEncryptionTestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export class QrEncryptionConfig {
  
  /**
   * Run comprehensive system tests for QR encryption
   */
  static async runSystemTests(): Promise<QrEncryptionTestResult[]> {
    const results: QrEncryptionTestResult[] = [];
    
    // Test 1: Environment Setup
    results.push(await this.testEnvironmentSetup());
    
    // Test 2: Basic Encryption/Decryption
    results.push(await this.testBasicEncryption());
    
    // Test 3: Backward Compatibility
    results.push(await this.testBackwardCompatibility());
    
    // Test 4: QR Data Manager Integration
    results.push(await this.testQrDataManagerIntegration());
    
    // Test 5: Third-party Scanner Privacy
    results.push(await this.testThirdPartyPrivacy());
    
    return results;
  }
  
  /**
   * Test environment setup and configuration
   */
  private static async testEnvironmentSetup(): Promise<QrEncryptionTestResult> {
    try {
      const status = QrDataManager.getEncryptionStatus();
      
      if (!status.keyConfigured) {
        return {
          success: false,
          message: "Encryption key not configured",
          details: status,
          error: "Set QR_ENCRYPTION_KEY or QR_SECRET_KEY environment variable"
        };
      }
      
      if (!status.webCryptoAvailable) {
        return {
          success: false,
          message: "Web Crypto API not available",
          details: status,
          error: "QR encryption requires HTTPS or localhost environment"
        };
      }
      
      if (!status.encryptionAvailable) {
        return {
          success: false,
          message: "QR encryption not available",
          details: status
        };
      }
      
      return {
        success: true,
        message: "Environment setup is correct",
        details: status
      };
      
    } catch (error) {
      return {
        success: false,
        message: "Environment test failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test basic encryption and decryption functionality
   */
  private static async testBasicEncryption(): Promise<QrEncryptionTestResult> {
    try {
      const testData = {
        type: 'customer',
        customerId: '12345',
        name: 'Test Customer',
        email: 'test@example.com',
        cardNumber: 'GC-012345-C',
        cardType: 'STANDARD',
        timestamp: Date.now()
      };
      
      // Test encryption
      const encryptedData = await QrEncryption.encryptQrData(testData);
      
      if (!QrEncryption.isEncrypted(encryptedData)) {
        return {
          success: false,
          message: "Data was not properly encrypted",
          details: { encryptedData }
        };
      }
      
      // Test decryption
      const decryptedData = await QrEncryption.decryptQrData(encryptedData);
      
      if (decryptedData.name !== testData.name || decryptedData.email !== testData.email) {
        return {
          success: false,
          message: "Decrypted data doesn't match original",
          details: { original: testData, decrypted: decryptedData }
        };
      }
      
      return {
        success: true,
        message: "Basic encryption/decryption works correctly",
        details: {
          originalSensitiveFields: { name: testData.name, email: testData.email },
          encryptedPreview: QrEncryption.getPublicPreview(encryptedData),
          decryptedSensitiveFields: { name: decryptedData.name, email: decryptedData.email }
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: "Basic encryption test failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test backward compatibility with unencrypted QR codes
   */
  private static async testBackwardCompatibility(): Promise<QrEncryptionTestResult> {
    try {
      const legacyQrData = {
        type: 'customer',
        customerId: '67890',
        name: 'Legacy Customer',
        email: 'legacy@example.com',
        cardNumber: 'GC-067890-C',
        cardType: 'STANDARD',
        timestamp: Date.now()
      };
      
      const legacyQrString = JSON.stringify(legacyQrData);
      
      // Test that QrDataManager handles legacy data correctly
      const processedData = await QrDataManager.prepareForBusiness(legacyQrString);
      
      if (processedData.name !== legacyQrData.name || processedData.email !== legacyQrData.email) {
        return {
          success: false,
          message: "Legacy QR code processing failed",
          details: { original: legacyQrData, processed: processedData }
        };
      }
      
      return {
        success: true,
        message: "Backward compatibility with legacy QR codes works correctly",
        details: { legacyData: legacyQrData, processedData: processedData }
      };
      
    } catch (error) {
      return {
        success: false,
        message: "Backward compatibility test failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test QrDataManager integration
   */
  private static async testQrDataManagerIntegration(): Promise<QrEncryptionTestResult> {
    try {
      const testData = {
        type: 'customer',
        customerId: '99999',
        name: 'Integration Test Customer',
        email: 'integration@example.com',
        cardNumber: 'GC-099999-C',
        cardType: 'STANDARD',
        timestamp: Date.now()
      };
      
      // Test generation flow
      const qrString = await QrDataManager.prepareForGeneration(testData);
      
      // Test business consumption flow
      const businessData = await QrDataManager.prepareForBusiness(qrString);
      
      if (businessData.name !== testData.name || businessData.email !== testData.email) {
        return {
          success: false,
          message: "QrDataManager integration failed - data mismatch",
          details: { original: testData, business: businessData }
        };
      }
      
      return {
        success: true,
        message: "QrDataManager integration works correctly",
        details: {
          generatedQrPreview: QrDataManager.getSafePreview(qrString),
          businessData: businessData
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: "QrDataManager integration test failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test that third-party scanners can't see sensitive data
   */
  private static async testThirdPartyPrivacy(): Promise<QrEncryptionTestResult> {
    try {
      const sensitiveData = {
        type: 'customer',
        customerId: '11111',
        name: 'Private Customer',
        email: 'private@secret.com',
        phone: '+1-555-SECRET',
        cardNumber: 'GC-011111-C',
        cardType: 'STANDARD',
        timestamp: Date.now()
      };
      
      // Generate encrypted QR
      const qrString = await QrDataManager.prepareForGeneration(sensitiveData);
      const parsedQr = JSON.parse(qrString);
      
      // Verify sensitive data is not visible in raw QR
      if (qrString.includes(sensitiveData.name) || 
          qrString.includes(sensitiveData.email) ||
          qrString.includes(sensitiveData.phone)) {
        return {
          success: false,
          message: "Sensitive data is still visible in QR code!",
          details: { qrString: qrString.substring(0, 200) + '...' },
          error: "Third-party scanners can see sensitive information"
        };
      }
      
      // Verify structural data is still readable (for routing)
      if (parsedQr.type !== sensitiveData.type || 
          parsedQr.customerId !== sensitiveData.customerId) {
        return {
          success: false,
          message: "Essential routing data was encrypted (shouldn't be)",
          details: parsedQr
        };
      }
      
      return {
        success: true,
        message: "Privacy protection works - sensitive data is hidden, routing data is visible",
        details: {
          visibleToThirdParty: QrDataManager.getSafePreview(qrString),
          hiddenSensitiveData: ['name', 'email', 'phone']
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: "Third-party privacy test failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Generate a comprehensive system report
   */
  static async generateSystemReport(): Promise<string> {
    const tests = await this.runSystemTests();
    const status = QrDataManager.getEncryptionStatus();
    
    let report = '🔒 QR CODE ENCRYPTION SYSTEM REPORT\n';
    report += '=' .repeat(50) + '\n\n';
    
    report += '📊 SYSTEM STATUS:\n';
    report += `  Encryption Available: ${status.encryptionAvailable ? '✅' : '❌'}\n`;
    report += `  Encryption Enabled: ${status.encryptionEnabled ? '✅' : '❌'}\n`;
    report += `  Key Configured: ${status.keyConfigured ? '✅' : '❌'}\n`;
    report += `  Web Crypto Available: ${status.webCryptoAvailable ? '✅' : '❌'}\n\n`;
    
    report += '🧪 TEST RESULTS:\n';
    tests.forEach((test, index) => {
      const icon = test.success ? '✅' : '❌';
      report += `  ${index + 1}. ${icon} ${test.message}\n`;
      if (!test.success && test.error) {
        report += `     Error: ${test.error}\n`;
      }
    });
    
    const allPassed = tests.every(test => test.success);
    report += `\n🎯 OVERALL STATUS: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`;
    
    if (allPassed) {
      report += '\n🎉 QR encryption system is fully operational!\n';
      report += '   Third-party scanners will only see encrypted data.\n';
      report += '   Your business dashboard will decrypt customer information automatically.\n';
    } else {
      report += '\n⚠️  Please fix the failed tests before using QR encryption.\n';
    }
    
    return report;
  }
}

export default QrEncryptionConfig;
