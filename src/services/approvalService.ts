import sql from '../utils/db';
// TODO: Business application functions need to be implemented via API
// These functions were removed during API migration
import { ProductionSafeService } from '../utils/productionApiClient';

// Temporary type definition
export interface BusinessApplication {
  id: number;
  name: string;
  email: string;
  business_name: string;
  business_phone?: string;
  business_address?: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  rejection_reason?: string;
}

// Approval types
export type ApprovalType = 'business' | 'program' | 'user' | 'payout';

// Approval status
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Generic approval interface
export interface Approval {
  id: number;
  type: ApprovalType;
  name: string;
  submittedBy: string;
  email: string;
  submittedAt: string;
  status: ApprovalStatus;
  details?: any; // Full object with all details
}

// Get all approvals across all types
export async function getAllApprovals(): Promise<Approval[]> {
  // PRODUCTION FIX: Use API in production to avoid direct DB access
  if (ProductionSafeService.shouldUseApi()) {
    try {
      const result = await ProductionSafeService.getApprovals();
      return result.approvals || result || [];
    } catch (error) {
      console.error('Failed to fetch approvals via API:', error);
      return [];
    }
  }

  try {
    console.log('Fetching all approvals...');
    
    // TODO: Direct DB access removed - API endpoint required
    // const businessApplications = await getAllBusinessApplications();
    // const businessApprovals = businessApplications.map(convertBusinessApplicationToApproval);
    
    // Temporarily return empty array until API is available in development
    console.warn('Direct database access not available - returning empty array');
    return [];
  } catch (error) {
    console.error('Error fetching all approvals:', error);
    return [];
  }
}

// Get approvals filtered by type
export async function getApprovalsByType(type: ApprovalType): Promise<Approval[]> {
  try {
    console.log(`Fetching approvals of type: ${type}`);
    
    switch (type) {
      case 'business':
        // TODO: Direct DB access removed - API endpoint required
        // const businessApplications = await getAllBusinessApplications();
        // return businessApplications.map(convertBusinessApplicationToApproval);
        console.warn('Direct database access not available');
        return [];
      default:
        return [];
    }
  } catch (error) {
    console.error(`Error fetching approvals of type ${type}:`, error);
    return [];
  }
}

// Get approval by ID and type
export async function getApprovalById(id: number, type: ApprovalType): Promise<Approval | null> {
  try {
    console.log(`Fetching approval of type ${type} with id: ${id}`);
    
    switch (type) {
      case 'business':
        // TODO: Direct DB access removed - API endpoint required
        // const application = await getBusinessApplicationById(id);
        // return application ? convertBusinessApplicationToApproval(application) : null;
        console.warn('Direct database access not available');
        return null;
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error fetching approval of type ${type} with id ${id}:`, error);
    return null;
  }
}

// Update approval status
export async function updateApprovalStatus(
  id: number, 
  type: ApprovalType, 
  status: ApprovalStatus, 
  notes?: string
): Promise<boolean> {
  // PRODUCTION FIX: Use API in production to avoid direct DB access
  if (ProductionSafeService.shouldUseApi()) {
    try {
      const result = await ProductionSafeService.updateApproval(id, status, notes);
      return result && result.approval ? true : false;
    } catch (error) {
      console.error('Failed to update approval via API:', error);
      return false;
    }
  }

  try {
    console.log(`Updating approval of type ${type} with id ${id} to status: ${status}`);
    
    switch (type) {
      case 'business':
        // TODO: Direct DB access removed - API endpoint required
        // const result = await updateBusinessApplicationStatus(id, status, notes);
        // return !!result;
        console.warn('Direct database access not available');
        return false;
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error updating approval of type ${type} with id ${id}:`, error);
    return false;
  }
}

// Helper function to convert BusinessApplication to generic Approval format
function convertBusinessApplicationToApproval(application: BusinessApplication): Approval {
  return {
    id: application.id as number,
    type: 'business',
    name: application.name,
    submittedBy: application.owner,
    email: application.email,
    submittedAt: application.submittedAt,
    status: application.status,
    details: application
  };
}

// Ensure approval-related tables exist
export async function ensureApprovalTableExists(): Promise<void> {
  try {
    console.log('Ensuring approval tables exist...');
    
    // Create approval logs table - this will store a unified log of all approval actions
    await sql`
      CREATE TABLE IF NOT EXISTS approval_logs (
        id SERIAL PRIMARY KEY,
        approval_id INTEGER NOT NULL,
        approval_type VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        actor_id INTEGER,
        actor_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Approval tables created or already exist');
  } catch (error) {
    console.error('Error ensuring approval tables exist:', error);
  }
} 