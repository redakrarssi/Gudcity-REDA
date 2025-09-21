// Business rule validation utilities
// Implements comprehensive business rule validation following reda.md guidelines

export interface BusinessRuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface CustomerEnrollmentRule {
  maxProgramsPerCustomer: number;
  allowMultipleBusinesses: boolean;
  requireApproval: boolean;
  autoEnroll: boolean;
}

export interface PointsRule {
  maxPointsPerTransaction: number;
  maxDailyPoints: number;
  maxMonthlyPoints: number;
  minPointsPerTransaction: number;
  pointsExpirationDays?: number;
}

export interface ProgramRule {
  maxProgramsPerBusiness: number;
  requireBusinessVerification: boolean;
  allowPublicEnrollment: boolean;
  requireCustomerApproval: boolean;
}

export interface TransactionRule {
  requireBusinessApproval: boolean;
  allowRefunds: boolean;
  maxRefundDays: number;
  requireCustomerConfirmation: boolean;
}

export class BusinessRuleValidator {
  // Default business rules
  private static readonly DEFAULT_CUSTOMER_RULES: CustomerEnrollmentRule = {
    maxProgramsPerCustomer: 10,
    allowMultipleBusinesses: true,
    requireApproval: false,
    autoEnroll: true
  };

  private static readonly DEFAULT_POINTS_RULES: PointsRule = {
    maxPointsPerTransaction: 10000,
    maxDailyPoints: 50000,
    maxMonthlyPoints: 500000,
    minPointsPerTransaction: 1,
    pointsExpirationDays: 365
  };

  private static readonly DEFAULT_PROGRAM_RULES: ProgramRule = {
    maxProgramsPerBusiness: 50,
    requireBusinessVerification: true,
    allowPublicEnrollment: true,
    requireCustomerApproval: true
  };

  private static readonly DEFAULT_TRANSACTION_RULES: TransactionRule = {
    requireBusinessApproval: false,
    allowRefunds: true,
    maxRefundDays: 30,
    requireCustomerConfirmation: false
  };

  /**
   * Validate customer enrollment rules
   */
  static validateCustomerEnrollment(
    customerId: string,
    programId: string,
    businessId: string,
    currentEnrollments: number,
    rules: CustomerEnrollmentRule = this.DEFAULT_CUSTOMER_RULES
  ): BusinessRuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check maximum programs per customer
    if (currentEnrollments >= rules.maxProgramsPerCustomer) {
      errors.push(`Customer has reached maximum of ${rules.maxProgramsPerCustomer} program enrollments`);
    }

    // Check if customer is already enrolled in this program
    if (currentEnrollments > 0) {
      warnings.push('Customer is already enrolled in other programs');
    }

    // Check business approval requirement
    if (rules.requireApproval) {
      warnings.push('Program enrollment requires business approval');
      suggestions.push('Send enrollment request to business for approval');
    }

    // Check auto-enrollment
    if (!rules.autoEnroll) {
      warnings.push('Auto-enrollment is disabled for this program');
      suggestions.push('Manual enrollment process required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Validate points transaction rules
   */
  static validatePointsTransaction(
    points: number,
    customerId: string,
    businessId: string,
    dailyPoints: number,
    monthlyPoints: number,
    rules: PointsRule = this.DEFAULT_POINTS_RULES
  ): BusinessRuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check minimum points
    if (points < rules.minPointsPerTransaction) {
      errors.push(`Points must be at least ${rules.minPointsPerTransaction}`);
    }

    // Check maximum points per transaction
    if (points > rules.maxPointsPerTransaction) {
      errors.push(`Points cannot exceed ${rules.maxPointsPerTransaction} per transaction`);
    }

    // Check daily points limit
    if (dailyPoints + points > rules.maxDailyPoints) {
      errors.push(`Daily points limit of ${rules.maxDailyPoints} would be exceeded`);
    }

    // Check monthly points limit
    if (monthlyPoints + points > rules.maxMonthlyPoints) {
      errors.push(`Monthly points limit of ${rules.maxMonthlyPoints} would be exceeded`);
    }

    // High value transaction warnings
    if (points > 5000) {
      warnings.push('High value transaction - consider additional verification');
      suggestions.push('Require manager approval for large point awards');
    }

    // Points expiration warning
    if (rules.pointsExpirationDays && rules.pointsExpirationDays < 365) {
      warnings.push(`Points expire in ${rules.pointsExpirationDays} days`);
      suggestions.push('Consider extending points expiration period');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Validate program creation rules
   */
  static validateProgramCreation(
    businessId: string,
    programName: string,
    currentPrograms: number,
    businessVerified: boolean,
    rules: ProgramRule = this.DEFAULT_PROGRAM_RULES
  ): BusinessRuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check maximum programs per business
    if (currentPrograms >= rules.maxProgramsPerBusiness) {
      errors.push(`Business has reached maximum of ${rules.maxProgramsPerBusiness} programs`);
    }

    // Check business verification
    if (rules.requireBusinessVerification && !businessVerified) {
      errors.push('Business verification required to create programs');
    }

    // Check program name validation
    if (!programName || programName.trim().length < 3) {
      errors.push('Program name must be at least 3 characters long');
    }

    if (programName.length > 100) {
      errors.push('Program name cannot exceed 100 characters');
    }

    // Check for duplicate program names
    if (currentPrograms > 0) {
      warnings.push('Business already has programs - consider naming conventions');
      suggestions.push('Use descriptive names to distinguish between programs');
    }

    // Public enrollment warning
    if (rules.allowPublicEnrollment) {
      warnings.push('Public enrollment is enabled - customers can join without approval');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Validate transaction rules
   */
  static validateTransaction(
    transactionType: 'AWARD' | 'REDEEM' | 'REFUND' | 'ADJUSTMENT',
    points: number,
    customerId: string,
    businessId: string,
    rules: TransactionRule = this.DEFAULT_TRANSACTION_RULES
  ): BusinessRuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check business approval requirement
    if (rules.requireBusinessApproval && transactionType === 'AWARD') {
      warnings.push('Business approval required for point awards');
      suggestions.push('Send approval request to business manager');
    }

    // Check refund rules
    if (transactionType === 'REFUND' && !rules.allowRefunds) {
      errors.push('Refunds are not allowed for this program');
    }

    // Check refund time limit
    if (transactionType === 'REFUND' && rules.allowRefunds) {
      warnings.push(`Refunds must be processed within ${rules.maxRefundDays} days`);
    }

    // Check customer confirmation requirement
    if (rules.requireCustomerConfirmation && transactionType === 'REDEEM') {
      warnings.push('Customer confirmation required for redemptions');
      suggestions.push('Send confirmation request to customer');
    }

    // High value transaction warnings
    if (points > 5000) {
      warnings.push('High value transaction - additional verification recommended');
      suggestions.push('Consider requiring additional approval for large transactions');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Validate QR code generation rules
   */
  static validateQRCodeGeneration(
    customerId: string,
    businessId: string,
    programId: string,
    customerEnrolled: boolean,
    programActive: boolean
  ): BusinessRuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check customer enrollment
    if (!customerEnrolled) {
      errors.push('Customer must be enrolled in program to generate QR code');
    }

    // Check program status
    if (!programActive) {
      errors.push('Program must be active to generate QR code');
    }

    // Check required IDs
    if (!customerId || !businessId || !programId) {
      errors.push('Customer ID, Business ID, and Program ID are required');
    }

    // Validate ID formats
    if (customerId && isNaN(parseInt(customerId))) {
      errors.push('Invalid customer ID format');
    }

    if (businessId && isNaN(parseInt(businessId))) {
      errors.push('Invalid business ID format');
    }

    if (programId && isNaN(parseInt(programId))) {
      errors.push('Invalid program ID format');
    }

    // QR code security warnings
    warnings.push('QR code contains sensitive customer data');
    suggestions.push('Ensure QR code data is encrypted for privacy protection');

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Validate business rule consistency
   */
  static validateBusinessRuleConsistency(
    customerRules: CustomerEnrollmentRule,
    pointsRules: PointsRule,
    programRules: ProgramRule,
    transactionRules: TransactionRule
  ): BusinessRuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check points rule consistency
    if (pointsRules.maxPointsPerTransaction > pointsRules.maxDailyPoints) {
      errors.push('Max points per transaction cannot exceed daily limit');
    }

    if (pointsRules.maxDailyPoints > pointsRules.maxMonthlyPoints) {
      errors.push('Daily points limit cannot exceed monthly limit');
    }

    // Check customer rule consistency
    if (customerRules.maxProgramsPerCustomer > programRules.maxProgramsPerBusiness) {
      warnings.push('Customer program limit is higher than business program limit');
    }

    // Check transaction rule consistency
    if (transactionRules.requireBusinessApproval && !transactionRules.allowRefunds) {
      warnings.push('Business approval required but refunds not allowed');
      suggestions.push('Consider allowing refunds for approved transactions');
    }

    // Check program rule consistency
    if (programRules.allowPublicEnrollment && programRules.requireCustomerApproval) {
      warnings.push('Public enrollment enabled but customer approval required');
      suggestions.push('Consider disabling customer approval for public programs');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Get default business rules
   */
  static getDefaultRules() {
    return {
      customer: this.DEFAULT_CUSTOMER_RULES,
      points: this.DEFAULT_POINTS_RULES,
      program: this.DEFAULT_PROGRAM_RULES,
      transaction: this.DEFAULT_TRANSACTION_RULES
    };
  }

  /**
   * Validate all business rules for a complete transaction
   */
  static async validateCompleteTransaction(
    customerId: string,
    businessId: string,
    programId: string,
    points: number,
    transactionType: 'AWARD' | 'REDEEM' | 'REFUND' | 'ADJUSTMENT',
    currentEnrollments: number,
    dailyPoints: number,
    monthlyPoints: number,
    customerEnrolled: boolean,
    programActive: boolean,
    businessVerified: boolean
  ): Promise<BusinessRuleValidationResult> {
    const results: BusinessRuleValidationResult[] = [];

    // Validate customer enrollment
    results.push(this.validateCustomerEnrollment(
      customerId, programId, businessId, currentEnrollments
    ));

    // Validate points transaction
    results.push(this.validatePointsTransaction(
      points, customerId, businessId, dailyPoints, monthlyPoints
    ));

    // Validate transaction rules
    results.push(this.validateTransaction(
      transactionType, points, customerId, businessId
    ));

    // Validate QR code generation (if applicable)
    if (transactionType === 'AWARD') {
      results.push(this.validateQRCodeGeneration(
        customerId, businessId, programId, customerEnrolled, programActive
      ));
    }

    // Combine all results
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);
    const allSuggestions = results.flatMap(r => r.suggestions || []);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions.length > 0 ? allSuggestions : undefined
    };
  }
}

export default BusinessRuleValidator;