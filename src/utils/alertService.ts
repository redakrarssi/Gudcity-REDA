import sql from '../dev-only/db';

/**
 * Alert interface for monitoring system
 */
export interface Alert {
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details?: any;
}

/**
 * Send an alert to the monitoring system
 * 
 * @param alert The alert to send
 * @returns Promise that resolves when the alert is sent
 */
export const sendAlert = async (alert: Alert): Promise<void> => {
  try {
    // First, log the alert to the database
    await sql`
      INSERT INTO system_alerts 
      (alert_type, severity, message, details, created_at)
      VALUES (${alert.alertType}, ${alert.severity}, ${alert.message}, ${JSON.stringify(alert.details || {})}, NOW())
    `;

    // Log the alert to the console
    const severityEmoji = getSeverityEmoji(alert.severity);
    console.log(`${severityEmoji} ALERT [${alert.severity}] ${alert.alertType}: ${alert.message}`);
    
    // In a production environment, you might also want to:
    // 1. Send email notifications for high-priority alerts
    // 2. Send SMS for critical alerts
    // 3. Integrate with services like PagerDuty
    // 4. Push to a monitoring dashboard
  } catch (error) {
    console.error('Error sending alert:', error);
    
    // Still log to console even if database fails
    console.log(`⚠️ ALERT [${alert.severity}] ${alert.alertType}: ${alert.message}`);
  }
};

/**
 * Get the appropriate emoji for alert severity
 */
function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'LOW':
      return '🔵';
    case 'MEDIUM':
      return '🟡';
    case 'HIGH':
      return '🔴';
    case 'CRITICAL':
      return '⚠️';
    default:
      return '⚠️';
  }
}

/**
 * Get recent alerts from the database
 * 
 * @param limit Maximum number of alerts to return
 * @param severityFilter Optional severity filter
 * @returns Promise that resolves to alerts
 */
export const getRecentAlerts = async (
  limit: number = 100,
  severityFilter?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): Promise<any[]> => {
  try {
    if (severityFilter) {
      const result = await sql`
        SELECT * FROM system_alerts
        WHERE severity = ${severityFilter}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      return result;
    } else {
      const result = await sql`
        SELECT * FROM system_alerts
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      return result;
    }
  } catch (error) {
    console.error('Error getting recent alerts:', error);
    return [];
  }
};

export default {
  sendAlert,
  getRecentAlerts
}; 