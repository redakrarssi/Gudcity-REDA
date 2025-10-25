import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCcw, Copy, Info } from 'lucide-react';
import { diagnoseEnvironment } from '../../utils/environmentDiagnostic';

type DashboardType = 'admin' | 'business' | 'customer';

interface DiagnosisResult {
  ok: boolean;
  endpoint: string;
  httpStatus?: number;
  statusText?: string;
  errorMessage?: string;
  tokenPresent: boolean;
  recommendations: string[];
  environment: ReturnType<typeof diagnoseEnvironment>;
}

interface DashboardDiagnosisProps {
  dashboard: DashboardType;
  resourceId?: number; // businessId for business, customerId for customer
  className?: string;
}

export const DashboardDiagnosis: React.FC<DashboardDiagnosisProps> = ({
  dashboard,
  resourceId,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  const buildEndpoint = useCallback(() => {
    const params = new URLSearchParams({ type: dashboard });
    if (dashboard === 'business' && resourceId) params.set('businessId', String(resourceId));
    if (dashboard === 'customer' && resourceId) params.set('customerId', String(resourceId));
    return `/api/dashboard/stats?${params.toString()}`;
  }, [dashboard, resourceId]);

  const runDiagnosis = useCallback(async () => {
    setLoading(true);
    try {
      const environment = diagnoseEnvironment();
      const endpoint = buildEndpoint();
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let httpStatus: number | undefined;
      let statusText: string | undefined;
      let errorMessage: string | undefined;

      try {
        const res = await fetch(endpoint, { method: 'GET', headers });
        httpStatus = res.status;
        statusText = res.statusText;

        if (!res.ok) {
          // Try read error body for more context
          const text = await res.text();
          errorMessage = text || `HTTP ${res.status}`;
        }

        const ok = res.ok;
        const recommendations: string[] = [];

        // Fun.md-aligned guidance and common issues
        if (!token) {
          recommendations.push('You are not authenticated. Log in to obtain a token.');
        }

        if (httpStatus === 401) {
          recommendations.push('Authentication failed (401). Ensure your token is valid and not expired.');
        }

        if (httpStatus === 403) {
          if (dashboard === 'admin') {
            recommendations.push('Access denied (403). Admin role is required for admin dashboard.');
          } else if (dashboard === 'business') {
            recommendations.push('Access denied (403). Business ID must match the logged-in account.');
          } else if (dashboard === 'customer') {
            recommendations.push('Access denied (403). Customer ID must match the logged-in account.');
          }
        }

        if (httpStatus && httpStatus >= 500) {
          recommendations.push('Server error (5xx). Backend route is reachable but failing. Check server logs.');
        }

        // Double /api prefix and URL base checks per fun.md guidance
        const hasDoubleApiWarning = environment.environmentVariables.recommendations.some(r => r.includes('double /api'));
        if (hasDoubleApiWarning) {
          recommendations.push('VITE_API_URL ends with "/api" which can cause double /api/api paths. Remove "/api".');
        }
        if (environment.environment === 'production' && environment.apiConfiguration.explicitUrl && !environment.apiConfiguration.explicitUrl.startsWith('http')) {
          recommendations.push('In production, VITE_API_URL should be a full https:// domain or empty.');
        }

        setResult({
          ok,
          endpoint,
          httpStatus,
          statusText,
          errorMessage,
          tokenPresent: !!token,
          recommendations,
          environment,
        });
      } catch (fetchErr: any) {
        const environment = diagnoseEnvironment();
        const endpoint = buildEndpoint();
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const recommendations: string[] = [
          'Network error. Verify the app can reach /api routes from the browser.',
        ];
        const hasDoubleApiWarning = environment.environmentVariables.recommendations.some(r => r.includes('double /api'));
        if (hasDoubleApiWarning) {
          recommendations.push('VITE_API_URL may cause double /api. Remove trailing "/api".');
        }
        setResult({
          ok: false,
          endpoint,
          httpStatus: undefined,
          statusText: undefined,
          errorMessage: fetchErr?.message || 'Network request failed',
          tokenPresent: !!token,
          recommendations,
          environment,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [buildEndpoint, dashboard]);

  useEffect(() => {
    runDiagnosis();
  }, [runDiagnosis]);

  const shouldRender = useMemo(() => {
    if (!result) return false;
    return !result.ok; // only show when failing
  }, [result]);

  const copyDetails = useCallback(() => {
    if (!result) return;
    const payload = {
      dashboard,
      endpoint: result.endpoint,
      httpStatus: result.httpStatus,
      statusText: result.statusText,
      errorMessage: result.errorMessage,
      tokenPresent: result.tokenPresent,
      recommendations: result.recommendations,
      environment: result.environment,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
  }, [result, dashboard]);

  if (!shouldRender) return null;

  return (
    <div className={`rounded-xl border border-red-200 bg-red-50 p-4 ${className}`}>
      <div className="flex items-start">
        <div className="mr-3 mt-0.5 text-red-600">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-red-800">
              Connectivity issue detected: unable to load {dashboard} dashboard data
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={runDiagnosis}
                className="inline-flex items-center px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-100"
                disabled={loading}
                aria-label="Re-run connectivity check"
              >
                <RefreshCcw className="w-3 h-3 mr-1" /> {loading ? 'Checking...' : 'Re-run check'}
              </button>
              <button
                onClick={copyDetails}
                className="inline-flex items-center px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-100"
                aria-label="Copy diagnostic details"
              >
                <Copy className="w-3 h-3 mr-1" /> Copy details
              </button>
              <button
                onClick={() => setExpanded(v => !v)}
                className="inline-flex items-center px-2 py-1 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-100"
                aria-expanded={expanded}
                aria-controls="diagnostic-details"
              >
                {expanded ? 'Hide details' : 'Show details'}
              </button>
            </div>
          </div>

          <p className="mt-1 text-xs text-red-700">
            This UI follows fun.md guidance: a single catch-all endpoint (/api/dashboard/stats) is used. The check below explains why it failed and how to fix it.
          </p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg bg-white border border-red-200 p-3">
              <div className="text-xs text-gray-700">
                <div className="font-medium text-gray-900 mb-1">Endpoint</div>
                <div className="font-mono break-all">{result?.endpoint}</div>
                {result?.httpStatus !== undefined ? (
                  <div className="mt-1">Status: {result.httpStatus} {result.statusText || ''}</div>
                ) : (
                  <div className="mt-1">Status: Network error</div>
                )}
                {result?.errorMessage && (
                  <div className="mt-1 text-red-600">{result.errorMessage}</div>
                )}
                <div className="mt-1">Auth token present: {result?.tokenPresent ? (
                  <span className="inline-flex items-center text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> yes</span>
                ) : (
                  <span className="text-red-700">no</span>
                )}</div>
              </div>
            </div>

            <div className="rounded-lg bg-white border border-red-200 p-3">
              <div className="text-xs text-gray-700">
                <div className="font-medium text-gray-900 mb-1">Recommended fixes</div>
                <ul className="list-disc ml-5 space-y-1">
                  {result?.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                  {!result?.recommendations.length && (
                    <li>Check server logs for details.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {expanded && result && (
            <div id="diagnostic-details" className="mt-3 rounded-lg bg-white border border-red-200 p-3">
              <div className="flex items-center text-xs text-gray-900 font-medium mb-2">
                <Info className="w-3 h-3 mr-1" /> Environment details
              </div>
              <pre className="text-[11px] leading-4 text-gray-700 overflow-auto max-h-64">{JSON.stringify({
  environment: result.environment.environment,
  apiConfiguration: result.environment.apiConfiguration,
  missingEnv: result.environment.environmentVariables.missing,
  envRecs: result.environment.environmentVariables.recommendations,
}, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardDiagnosis;
