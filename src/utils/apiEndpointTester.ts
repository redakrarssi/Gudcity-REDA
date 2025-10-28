// API Endpoint Tester - Debug utility for testing API endpoints
// Following reda.md rules - utility for debugging API issues

interface TestResult {
  url: string;
  status: number;
  success: boolean;
  data?: any;
  error?: string;
  responseTime: number;
}

export class ApiEndpointTester {
  static async testEndpoint(endpoint: string, baseUrl?: string): Promise<TestResult> {
    const startTime = Date.now();
    const testUrl = baseUrl ? `${baseUrl}${endpoint}` : `${window.location.origin}${endpoint}`;
    
    try {
      const authToken = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      const responseTime = Date.now() - startTime;
      let data;
      
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }

      return {
        url: testUrl,
        status: response.status,
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? (data?.message || response.statusText) : undefined,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        url: testUrl,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        responseTime
      };
    }
  }

  static async testMultipleEndpoints(endpoints: string[]): Promise<TestResult[]> {
    const results = await Promise.all(
      endpoints.map(endpoint => this.testEndpoint(endpoint))
    );
    
    console.log('🧪 API Endpoint Test Results:');
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.url} → ${result.status} (${result.responseTime}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    return results;
  }

  static async diagnoseBusinessApiIssue(): Promise<void> {
    console.log('🔍 Diagnosing Business API Issue...');
    
    const testEndpoints = [
      '/api/admin/businesses',  // Original endpoint (might cause double /api/)
      '/admin/businesses',      // Fixed endpoint
      '/api/api/admin/businesses', // The problematic double path
    ];

    const results = await this.testMultipleEndpoints(testEndpoints);
    
    // Find the working endpoint
    const workingEndpoint = results.find(r => r.success);
    if (workingEndpoint) {
      console.log(`🎯 Working endpoint found: ${workingEndpoint.url}`);
      console.log(`✅ Status: ${workingEndpoint.status}, Response time: ${workingEndpoint.responseTime}ms`);
      if (workingEndpoint.data?.businesses) {
        console.log(`📊 Business data: ${workingEndpoint.data.businesses.length} businesses found`);
      }
    } else {
      console.log('❌ No working endpoints found. Check authentication and server status.');
    }

    // Check for common issues
    const doubleApiIssue = results.find(r => r.url.includes('/api/api/'));
    if (doubleApiIssue && !doubleApiIssue.success) {
      console.log('⚠️ Double /api/ path detected - this is likely the root cause of the issue');
      console.log('💡 Solution: Use /admin/businesses instead of /api/admin/businesses');
    }

    // Check authentication
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      console.log('⚠️ No authentication token found in localStorage');
    } else {
      console.log('✅ Authentication token present');
    }
  }
}

// Export for easy testing in console
(window as any).testBusinessApi = () => ApiEndpointTester.diagnoseBusinessApiIssue();
