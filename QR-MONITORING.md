# QR Code Monitoring System

## Overview

The QR Code Monitoring System is a comprehensive solution for tracking, alerting, and auditing QR code usage within the Gudcity-REDA platform. It provides real-time monitoring capabilities to detect suspicious scan patterns, track usage statistics, and maintain a complete audit trail of all security-sensitive operations.

## Key Features

### 1. Suspicious Activity Detection

The system tracks and alerts on suspicious scan patterns, such as:

- Multiple failed scan attempts from the same IP address
- Unusual scan frequency (statistical outliers)
- Geographically inconsistent scan locations
- Scan attempts outside of business hours

### 2. Usage Statistics Monitoring

Comprehensive analytics are provided to detect unusual activity:

- Daily, weekly, and monthly usage patterns
- Scan success/failure rates
- Unique user counts
- Geographic distribution of scans
- Temporal analysis (time-of-day patterns)

### 3. Audit Logging

All security-sensitive operations are logged with detailed contextual information:

- User actions (scan, generate, revoke)
- System events (integrity checks, repairs)
- Administrative actions (configuration changes)
- Each log entry includes:
  - Timestamp
  - User ID
  - IP address
  - User agent
  - Action details
  - Resource identifiers

## Technical Implementation

### Database Schema

The monitoring system uses several dedicated tables:

1. `qr_scan_attempts` - Records all scan attempts with success/failure status
2. `security_audit_logs` - Stores comprehensive audit trail of security operations
3. `suspicious_qr_activities` - Tracks detected suspicious activities
4. `system_alerts` - Stores generated alerts for review

### Components

1. **QrCodeMonitoringService**
   - Core service that implements monitoring functionality
   - Exposes methods for recording scans, detecting anomalies, and generating reports

2. **Audit Logging Utility**
   - Provides standardized logging functions
   - Ensures consistent audit trail across the application

3. **Alert Service**
   - Manages the generation and delivery of alerts
   - Supports multiple alert channels (database, console, email)

4. **Monitoring Scripts**
   - Scheduled tasks that run periodic checks and analysis
   - Configured via cron jobs for regular execution

## Setup and Configuration

### Initial Setup

1. Run the setup script:
   ```
   node scripts/setup-qr-monitoring.mjs
   ```

2. This will:
   - Create the necessary database tables
   - Set up the monitoring schedule
   - Create the monitoring script
   - Configure the logs directory

### Configuration Options

The monitoring system can be configured through environment variables:

- `QR_MONITOR_SUSPICIOUS_THRESHOLD`: Number of failed attempts to trigger an alert (default: 3)
- `QR_MONITOR_TIME_WINDOW_MS`: Time window for suspicious activity detection (default: 300000 - 5 minutes)
- `QR_MONITOR_DEVIATION_THRESHOLD`: Standard deviation multiplier for unusual activity (default: 2.0)

## Monitoring Dashboard

A monitoring dashboard is available at `/admin/security/qr-monitoring` that provides:

- Real-time view of scan activity
- Alert history and status
- Audit log search and filtering
- Statistical reports and visualizations

## Integration with Other Systems

The QR Code Monitoring System integrates with:

1. **QR Code Integrity Service**
   - Shares data about code validity and repair operations
   - Coordinates integrity checks with monitoring

2. **Notification Service**
   - Delivers alerts to administrators
   - Sends reports to stakeholders

3. **Security Information and Event Management (SIEM)**
   - Can export logs to external SIEM systems
   - Supports standard security information formats

## Best Practices

1. **Regular Review**
   - Check the monitoring dashboard daily
   - Review and investigate all alerts promptly
   - Analyze usage patterns weekly

2. **Alert Tuning**
   - Adjust thresholds based on your traffic patterns
   - Reduce false positives by fine-tuning detection parameters

3. **Audit Trail Maintenance**
   - Archive older audit logs regularly
   - Ensure sufficient storage for logs
   - Maintain backups of audit data

## Troubleshooting

Common issues and their solutions:

1. **False Positives**
   - Adjust the `QR_MONITOR_SUSPICIOUS_THRESHOLD` setting
   - Whitelist known high-volume IP addresses

2. **Missing Logs**
   - Check database connectivity
   - Verify log directory permissions
   - Ensure scheduled tasks are running

3. **Performance Issues**
   - Optimize database indexes
   - Increase archiving frequency
   - Consider sharding strategies for high-volume installations 