// Points validation utilities for business rule enforcement
// Implements comprehensive validation following reda.md security guidelines

export interface PointsValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  maxAllowed?: number;
  currentBalance?: number;
}

export interface PointsAuditEntry {
  id: string;
  customerId: string;
  businessId: string;
  programId: string;
  cardId: string;
  transactionType: 'AWARD' | 'REDEEM' | 'ADJUSTMENT' | 'EXPIRATION';
  pointsBefore: number;
  pointsAfter: number;
  pointsChange: number;
  source: string;
  description: string;
  transactionRef: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class PointsValidator {
  // Business rules configuration
  private static readonly MAX_POINTS_PER_TRANSACTION = 10000;
  private static readonly MAX_DAILY_POINTS_PER_CUSTOMER = 50000;
  private static readonly MAX_MONTHLY_POINTS_PER_CUSTOMER = 500000;
  private static readonly MIN_POINTS_PER_TRANSACTION = 1;
  private static readonly MAX_POINTS_BALANCE = 1000000; // 1 million points max balance

  /**
   * Validate points for a transaction
   */
  static validatePointsTransaction(
    points: number,
    customerId: string,
    businessId: string,
    programId: string,
    transactionType: 'AWARD' | 'REDEEM' | 'ADJUSTMENT' = 'AWARD'
  ): PointsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!Number.isInteger(points)) {
      errors.push('Points must be a whole number');
    }

    if (points < this.MIN_POINTS_PER_TRANSACTION) {
      errors.push(`Points must be at least ${this.MIN_POINTS_PER_TRANSACTION}`);
    }

    if (points > this.MAX_POINTS_PER_TRANSACTION) {
      errors.push(`Points cannot exceed ${this.MAX_POINTS_PER_TRANSACTION} per transaction`);
    }

    // Transaction type specific validation
    if (transactionType === 'REDEEM' && points <= 0) {
      errors.push('Redemption points must be positive');
    }

    if (transactionType === 'AWARD' && points <= 0) {
      errors.push('Award points must be positive');
    }

    // High value transaction warnings
    if (points > 5000) {
      warnings.push('High value transaction - ensure proper authorization');
    }

    if (points > 1000 && transactionType === 'AWARD') {
      warnings.push('Large point award - consider business approval');
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      maxAllowed: this.MAX_POINTS_PER_TRANSACTION
    };
  }

  /**
   * Validate points balance limits
   */
  static validatePointsBalance(
    currentBalance: number,
    pointsChange: number,
    customerId: string
  ): PointsValidationResult {
    const newBalance = currentBalance + pointsChange;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check maximum balance limit
    if (newBalance > this.MAX_POINTS_BALANCE) {
      errors.push(`Points balance cannot exceed ${this.MAX_POINTS_BALANCE}`);
    }

    // Check for negative balance
    if (newBalance < 0) {
      errors.push('Insufficient points balance for this transaction');
    }

    // High balance warnings
    if (newBalance > 100000) {
      warnings.push('Very high points balance - consider redemption options');
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      currentBalance: newBalance
    };
  }

  /**
   * Validate business permissions for points awarding
   */
  static validateBusinessPermissions(
    businessId: string,
    programId: string,
    customerId: string
  ): PointsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic ID validation
    if (!businessId || !programId || !customerId) {
      errors.push('Missing required identifiers');
    }

    // Check for valid ID formats
    if (businessId && isNaN(parseInt(businessId))) {
      errors.push('Invalid business ID format');
    }

    if (programId && isNaN(parseInt(programId))) {
      errors.push('Invalid program ID format');
    }

    if (customerId && isNaN(parseInt(customerId))) {
      errors.push('Invalid customer ID format');
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Comprehensive validation for points transactions
   */
  static async validatePointsTransactionComplete(
    points: number,
    customerId: string,
    businessId: string,
    programId: string,
    transactionType: 'AWARD' | 'REDEEM' | 'ADJUSTMENT' = 'AWARD',
    currentBalance?: number
  ): Promise<PointsValidationResult> {
    const results: PointsValidationResult[] = [];

    // Basic points validation
    results.push(this.validatePointsTransaction(points, customerId, businessId, programId, transactionType));

    // Business permissions validation
    results.push(this.validateBusinessPermissions(businessId, programId, customerId));

    // Balance validation if current balance provided
    if (currentBalance !== undefined) {
      results.push(this.validatePointsBalance(currentBalance, points, customerId));
    }

    // Combine results
    const allErrors = results.filter(r => r.error).map(r => r.error!);
    const allWarnings = results.filter(r => r.warnings).flatMap(r => r.warnings!);

    return {
      isValid: allErrors.length === 0,
      error: allErrors.length > 0 ? allErrors.join('; ') : undefined,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      maxAllowed: this.MAX_POINTS_PER_TRANSACTION,
      currentBalance: currentBalance
    };
  }

  /**
   * Get business rule limits
   */
  static getBusinessRules() {
    return {
      maxPointsPerTransaction: this.MAX_POINTS_PER_TRANSACTION,
      maxDailyPointsPerCustomer: this.MAX_DAILY_POINTS_PER_CUSTOMER,
      maxMonthlyPointsPerCustomer: this.MAX_MONTHLY_POINTS_PER_CUSTOMER,
      minPointsPerTransaction: this.MIN_POINTS_PER_TRANSACTION,
      maxPointsBalance: this.MAX_POINTS_BALANCE
    };
  }
}

export class PointsAuditor {
  private static auditLog: PointsAuditEntry[] = [];

  /**
   * Create audit entry for points change
   */
  static createAuditEntry(
    customerId: string,
    businessId: string,
    programId: string,
    cardId: string,
    transactionType: 'AWARD' | 'REDEEM' | 'ADJUSTMENT' | 'EXPIRATION',
    pointsBefore: number,
    pointsAfter: number,
    source: string,
    description: string,
    transactionRef: string,
    metadata?: Record<string, any>
  ): PointsAuditEntry {
    const auditEntry: PointsAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      businessId,
      programId,
      cardId,
      transactionType,
      pointsBefore,
      pointsAfter,
      pointsChange: pointsAfter - pointsBefore,
      source,
      description,
      transactionRef,
      timestamp: new Date(),
      metadata
    };

    // Store in memory (in production, this would go to database)
    this.auditLog.push(auditEntry);

    return auditEntry;
  }

  /**
   * Get audit trail for a customer
   */
  static getCustomerAuditTrail(customerId: string, limit: number = 100): PointsAuditEntry[] {
    return this.auditLog
      .filter(entry => entry.customerId === customerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get audit trail for a business
   */
  static getBusinessAuditTrail(businessId: string, limit: number = 100): PointsAuditEntry[] {
    return this.auditLog
      .filter(entry => entry.businessId === businessId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get audit trail for a program
   */
  static getProgramAuditTrail(programId: string, limit: number = 100): PointsAuditEntry[] {
    return this.auditLog
      .filter(entry => entry.programId === programId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get audit trail for a specific card
   */
  static getCardAuditTrail(cardId: string, limit: number = 100): PointsAuditEntry[] {
    return this.auditLog
      .filter(entry => entry.cardId === cardId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get audit summary for a customer
   */
  static getCustomerAuditSummary(customerId: string): {
    totalTransactions: number;
    totalPointsAwarded: number;
    totalPointsRedeemed: number;
    currentBalance: number;
    lastActivity: Date | null;
  } {
    const customerEntries = this.auditLog.filter(entry => entry.customerId === customerId);
    
    const totalTransactions = customerEntries.length;
    const totalPointsAwarded = customerEntries
      .filter(entry => entry.transactionType === 'AWARD')
      .reduce((sum, entry) => sum + entry.pointsChange, 0);
    const totalPointsRedeemed = Math.abs(customerEntries
      .filter(entry => entry.transactionType === 'REDEEM')
      .reduce((sum, entry) => sum + entry.pointsChange, 0));
    const currentBalance = customerEntries
      .reduce((sum, entry) => sum + entry.pointsChange, 0);
    const lastActivity = customerEntries.length > 0 
      ? customerEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp
      : null;

    return {
      totalTransactions,
      totalPointsAwarded,
      totalPointsRedeemed,
      currentBalance,
      lastActivity
    };
  }

  /**
   * Get audit summary for a business
   */
  static getBusinessAuditSummary(businessId: string): {
    totalTransactions: number;
    totalPointsAwarded: number;
    totalPointsRedeemed: number;
    uniqueCustomers: number;
    lastActivity: Date | null;
  } {
    const businessEntries = this.auditLog.filter(entry => entry.businessId === businessId);
    
    const totalTransactions = businessEntries.length;
    const totalPointsAwarded = businessEntries
      .filter(entry => entry.transactionType === 'AWARD')
      .reduce((sum, entry) => sum + entry.pointsChange, 0);
    const totalPointsRedeemed = Math.abs(businessEntries
      .filter(entry => entry.transactionType === 'REDEEM')
      .reduce((sum, entry) => sum + entry.pointsChange, 0));
    const uniqueCustomers = new Set(businessEntries.map(entry => entry.customerId)).size;
    const lastActivity = businessEntries.length > 0 
      ? businessEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp
      : null;

    return {
      totalTransactions,
      totalPointsAwarded,
      totalPointsRedeemed,
      uniqueCustomers,
      lastActivity
    };
  }

  /**
   * Clear audit log (for testing purposes)
   */
  static clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Export audit log for analysis
   */
  static exportAuditLog(): PointsAuditEntry[] {
    return [...this.auditLog];
  }
}

export default PointsValidator;