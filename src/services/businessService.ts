import sql from '../utils/db';

// Business types and interfaces
export interface BusinessApplication {
  id?: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  type: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  documentsVerified: boolean;
  documents: {
    businessLicense: string;
    identityProof: string;
    addressProof: string;
    taxDocument: string;
  };
  description: string;
  address: string;
  notes?: string;
}

export interface Business {
  id?: number;
  name: string;
  owner: string;
  email: string;
  phone?: string;
  type?: string;
  status: 'active' | 'inactive' | 'suspended';
  registeredAt?: string;
  address?: string;
  logo?: string;
  programCount?: number;
  customerCount?: number;
  revenue?: number;
  rating?: number;
  complianceStatus?: 'compliant' | 'warning' | 'violation';
  lastActivity?: string;
  description?: string;
  notes?: string;
  userId?: number;
}

export interface BusinessAnalytics {
  id?: number;
  businessId: number;
  date: string;
  loginCount: number;
  activeCustomers: number;
  newCustomers: number;
  totalTransactions: number;
  revenue: number;
  averageTransactionValue: number;
  customerRetentionRate: number;
  growthRate: number;
}

export interface BusinessDailyAnalytics {
  businessId: number;
  date: string;
  logins: number;
  activeCustomers: number;
  newCustomers: number;
  transactions: number;
  revenue: number;
}

// Ensure the tables exist for businesses
export async function ensureBusinessTablesExist(): Promise<void> {
  try {
    console.log('Ensuring business tables exist...');
    
    // Create businesses table
    await sql`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(100),
        type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        address TEXT,
        logo VARCHAR(500),
        description TEXT,
        notes TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create business applications table
    await sql`
      CREATE TABLE IF NOT EXISTS business_applications (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(100),
        type VARCHAR(100),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        documents_verified BOOLEAN DEFAULT FALSE,
        document_business_license VARCHAR(500),
        document_identity_proof VARCHAR(500),
        document_address_proof VARCHAR(500),
        document_tax VARCHAR(500),
        description TEXT,
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create business analytics table
    await sql`
      CREATE TABLE IF NOT EXISTS business_analytics (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        login_count INTEGER DEFAULT 0,
        active_customers INTEGER DEFAULT 0,
        new_customers INTEGER DEFAULT 0,
        total_transactions INTEGER DEFAULT 0,
        revenue DECIMAL(15,2) DEFAULT 0,
        avg_transaction_value DECIMAL(15,2) DEFAULT 0,
        customer_retention_rate DECIMAL(5,2) DEFAULT 0,
        growth_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(business_id, date)
      )
    `;
    
    // Create business daily logins tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS business_daily_logins (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50),
        device VARCHAR(100),
        session_duration INTEGER DEFAULT 0
      )
    `;
    
    // Create business transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS business_transactions (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        amount DECIMAL(15,2) NOT NULL,
        transaction_type VARCHAR(100),
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('All business tables exist or were created successfully');
    
    // Create sample business data for testing
    await createSampleBusinessData();
    
    // Create sample business applications for testing
    await createSampleBusinessApplications();
    
  } catch (error) {
    console.error('Error ensuring business tables exist:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

// Create a new business
export async function createBusiness(business: Business): Promise<Business | null> {
  try {
    console.log('Creating new business:', business.name);
    
    const result = await sql`
      INSERT INTO businesses (
        name, owner, email, phone, type, status, address, logo, description, notes, user_id
      ) VALUES (
        ${business.name},
        ${business.owner},
        ${business.email},
        ${business.phone || null},
        ${business.type || null},
        ${business.status},
        ${business.address || null},
        ${business.logo || null},
        ${business.description || null},
        ${business.notes || null},
        ${business.userId || null}
      )
      RETURNING *
    `;
    
    if (result && result.length > 0) {
      console.log('Business created successfully:', result[0]);
      return mapDbBusinessToBusiness(result[0]);
    } else {
      console.error('No business was created');
      return null;
    }
  } catch (error) {
    console.error('Error creating business:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

// Get all businesses
export async function getAllBusinesses(): Promise<Business[]> {
  try {
    console.log('Fetching all businesses...');
    
    const businesses = await sql`
      SELECT 
        b.*,
        COUNT(DISTINCT bt.id) as total_transactions,
        COALESCE(SUM(bt.amount), 0) as total_revenue,
        COUNT(DISTINCT bt.customer_id) as total_customers,
        MAX(bdl.login_time) as last_login_time
      FROM 
        businesses b
      LEFT JOIN 
        business_transactions bt ON b.id = bt.business_id
      LEFT JOIN 
        business_daily_logins bdl ON b.id = bdl.business_id
      GROUP BY 
        b.id
      ORDER BY 
        b.created_at DESC
    `;
    
    console.log(`Retrieved ${businesses.length} businesses`);
    return businesses.map(mapDbBusinessToBusiness);
  } catch (error) {
    console.error('Error fetching all businesses:', error);
    return [];
  }
}

// Get a specific business by ID
export async function getBusinessById(id: number): Promise<Business | null> {
  try {
    console.log(`Fetching business with id: ${id}`);
    
    const result = await sql`
      SELECT 
        b.*,
        COUNT(DISTINCT bt.id) as total_transactions,
        COALESCE(SUM(bt.amount), 0) as total_revenue,
        COUNT(DISTINCT bt.customer_id) as total_customers,
        MAX(bdl.login_time) as last_login_time
      FROM 
        businesses b
      LEFT JOIN 
        business_transactions bt ON b.id = bt.business_id
      LEFT JOIN 
        business_daily_logins bdl ON b.id = bdl.business_id
      WHERE 
        b.id = ${id}
      GROUP BY 
        b.id
    `;
    
    if (result && result.length > 0) {
      console.log(`Business found with id ${id}`);
      return mapDbBusinessToBusiness(result[0]);
    }
    
    console.log(`No business found with id ${id}`);
    return null;
  } catch (error) {
    console.error(`Error fetching business with id ${id}:`, error);
    return null;
  }
}

// Update a business
export async function updateBusiness(id: number, business: Partial<Business>): Promise<Business | null> {
  try {
    console.log(`Updating business with id: ${id}`);
    
    // Build dynamic update query
    let updateFields = [];
    let updateValues: any[] = [];
    
    if (business.name !== undefined) {
      updateFields.push('name = $1');
      updateValues.push(business.name);
    }
    
    if (business.owner !== undefined) {
      updateFields.push(`owner = $${updateValues.length + 1}`);
      updateValues.push(business.owner);
    }
    
    if (business.email !== undefined) {
      updateFields.push(`email = $${updateValues.length + 1}`);
      updateValues.push(business.email);
    }
    
    if (business.phone !== undefined) {
      updateFields.push(`phone = $${updateValues.length + 1}`);
      updateValues.push(business.phone);
    }
    
    if (business.type !== undefined) {
      updateFields.push(`type = $${updateValues.length + 1}`);
      updateValues.push(business.type);
    }
    
    if (business.status !== undefined) {
      updateFields.push(`status = $${updateValues.length + 1}`);
      updateValues.push(business.status);
    }
    
    if (business.address !== undefined) {
      updateFields.push(`address = $${updateValues.length + 1}`);
      updateValues.push(business.address);
    }
    
    if (business.logo !== undefined) {
      updateFields.push(`logo = $${updateValues.length + 1}`);
      updateValues.push(business.logo);
    }
    
    if (business.description !== undefined) {
      updateFields.push(`description = $${updateValues.length + 1}`);
      updateValues.push(business.description);
    }
    
    if (business.notes !== undefined) {
      updateFields.push(`notes = $${updateValues.length + 1}`);
      updateValues.push(business.notes);
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = $${updateValues.length + 1}`);
    updateValues.push(new Date());
    
    // Add ID for WHERE clause
    updateValues.push(id);
    
    const query = `
      UPDATE businesses 
      SET ${updateFields.join(', ')} 
      WHERE id = $${updateValues.length} 
      RETURNING *
    `;
    
    const result = await sql.query(query, updateValues);
    
    if (result && result.length > 0) {
      console.log(`Business with id ${id} updated successfully`);
      return mapDbBusinessToBusiness(result[0]);
    }
    
    console.log(`No business found with id ${id} to update`);
    return null;
  } catch (error) {
    console.error(`Error updating business with id ${id}:`, error);
    return null;
  }
}

// Record a business login
export async function recordBusinessLogin(businessId: number, userId: number, ipAddress?: string, device?: string): Promise<boolean> {
  try {
    console.log(`Recording login for business ${businessId}, user ${userId}`);
    
    await sql`
      INSERT INTO business_daily_logins (
        business_id, user_id, ip_address, device
      ) VALUES (
        ${businessId},
        ${userId},
        ${ipAddress || null},
        ${device || null}
      )
    `;
    
    // Update the daily analytics for today
    const today = new Date().toISOString().split('T')[0];
    await updateBusinessDailyAnalytics(businessId, today);
    
    return true;
  } catch (error) {
    console.error(`Error recording login for business ${businessId}:`, error);
    return false;
  }
}

// Record business session duration when user logs out
export async function updateBusinessSessionDuration(businessId: number, userId: number, sessionDuration: number): Promise<boolean> {
  try {
    console.log(`Updating session duration for business ${businessId}, user ${userId}: ${sessionDuration} seconds`);
    
    await sql`
      UPDATE business_daily_logins
      SET session_duration = ${sessionDuration}
      WHERE business_id = ${businessId}
        AND user_id = ${userId}
        AND session_duration = 0
      ORDER BY login_time DESC
      LIMIT 1
    `;
    
    return true;
  } catch (error) {
    console.error(`Error updating session duration for business ${businessId}:`, error);
    return false;
  }
}

// Get business analytics for a specific period
export async function getBusinessAnalytics(businessId: number, startDate: string, endDate: string): Promise<BusinessAnalytics[]> {
  try {
    console.log(`Fetching analytics for business ${businessId} from ${startDate} to ${endDate}`);
    
    const results = await sql`
      SELECT * FROM business_analytics
      WHERE business_id = ${businessId}
        AND date >= ${startDate}
        AND date <= ${endDate}
      ORDER BY date
    `;
    
    return results.map(mapDbAnalyticsToAnalytics);
  } catch (error) {
    console.error(`Error fetching analytics for business ${businessId}:`, error);
    return [];
  }
}

// Update or create business analytics for a specific day
async function updateBusinessDailyAnalytics(businessId: number, date: string): Promise<boolean> {
  try {
    console.log(`Updating daily analytics for business ${businessId} on ${date}`);
    
    // Get login count for the day
    const loginResults = await sql`
      SELECT COUNT(*) as login_count
      FROM business_daily_logins
      WHERE business_id = ${businessId}
        AND DATE(login_time) = ${date}
    `;
    const loginCount = loginResults[0]?.login_count || 0;
    
    // Get transaction data for the day
    const transactionResults = await sql`
      SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as daily_revenue,
        COUNT(DISTINCT customer_id) as active_customers
      FROM business_transactions
      WHERE business_id = ${businessId}
        AND DATE(transaction_date) = ${date}
    `;
    const transactionCount = transactionResults[0]?.transaction_count || 0;
    const dailyRevenue = transactionResults[0]?.daily_revenue || 0;
    const activeCustomers = transactionResults[0]?.active_customers || 0;
    
    // Get new customers for the day (first transaction)
    const newCustomerResults = await sql`
      SELECT COUNT(DISTINCT customer_id) as new_customers
      FROM business_transactions bt1
      WHERE business_id = ${businessId}
        AND DATE(transaction_date) = ${date}
        AND NOT EXISTS (
          SELECT 1 FROM business_transactions bt2
          WHERE bt2.business_id = ${businessId}
            AND bt2.customer_id = bt1.customer_id
            AND DATE(bt2.transaction_date) < ${date}
        )
    `;
    const newCustomers = newCustomerResults[0]?.new_customers || 0;
    
    // Calculate average transaction value
    const avgTransactionValue = transactionCount > 0 ? dailyRevenue / transactionCount : 0;
    
    // Calculate customer retention rate (active customers who have previous transactions)
    const retentionResults = await sql`
      SELECT 
        COUNT(DISTINCT customer_id) as returning_customers
      FROM business_transactions
      WHERE business_id = ${businessId}
        AND DATE(transaction_date) = ${date}
        AND customer_id IN (
          SELECT DISTINCT customer_id
          FROM business_transactions
          WHERE business_id = ${businessId}
            AND DATE(transaction_date) < ${date}
        )
    `;
    const returningCustomers = retentionResults[0]?.returning_customers || 0;
    const retentionRate = activeCustomers > 0 ? (returningCustomers / activeCustomers) * 100 : 0;
    
    // Calculate growth rate (compared to previous day)
    const previousDayResults = await sql`
      SELECT total_transactions, revenue
      FROM business_analytics
      WHERE business_id = ${businessId}
        AND date = (${date}::date - interval '1 day')
    `;
    
    const previousDayTransactions = previousDayResults[0]?.total_transactions || 0;
    const previousDayRevenue = previousDayResults[0]?.revenue || 0;
    
    const transactionGrowth = previousDayTransactions > 0 
      ? ((transactionCount - previousDayTransactions) / previousDayTransactions) * 100 
      : 0;
    
    const revenueGrowth = previousDayRevenue > 0 
      ? ((dailyRevenue - previousDayRevenue) / previousDayRevenue) * 100 
      : 0;
    
    // Use average of transaction and revenue growth
    const growthRate = (transactionGrowth + revenueGrowth) / 2;
    
    // Check if an entry already exists for this business and date
    const existingEntryResults = await sql`
      SELECT id FROM business_analytics
      WHERE business_id = ${businessId} AND date = ${date}
    `;
    
    if (existingEntryResults.length > 0) {
      // Update existing entry
      await sql`
        UPDATE business_analytics
        SET 
          login_count = ${loginCount},
          active_customers = ${activeCustomers},
          new_customers = ${newCustomers},
          total_transactions = ${transactionCount},
          revenue = ${dailyRevenue},
          avg_transaction_value = ${avgTransactionValue},
          customer_retention_rate = ${retentionRate},
          growth_rate = ${growthRate},
          updated_at = NOW()
        WHERE business_id = ${businessId} AND date = ${date}
      `;
    } else {
      // Create new entry
      await sql`
        INSERT INTO business_analytics (
          business_id, date, login_count, active_customers, new_customers, 
          total_transactions, revenue, avg_transaction_value, 
          customer_retention_rate, growth_rate
        ) VALUES (
          ${businessId}, ${date}, ${loginCount}, ${activeCustomers}, ${newCustomers},
          ${transactionCount}, ${dailyRevenue}, ${avgTransactionValue},
          ${retentionRate}, ${growthRate}
        )
      `;
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating daily analytics for business ${businessId}:`, error);
    return false;
  }
}

// Get business login history
export async function getBusinessLoginHistory(businessId: number, days: number = 30): Promise<any[]> {
  try {
    console.log(`Fetching login history for business ${businessId} for the last ${days} days`);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const results = await sql`
      SELECT 
        DATE(login_time) as date,
        COUNT(*) as login_count,
        AVG(session_duration) as avg_session_duration
      FROM business_daily_logins
      WHERE 
        business_id = ${businessId} AND
        login_time >= ${startDate.toISOString()}
      GROUP BY 
        DATE(login_time)
      ORDER BY 
        DATE(login_time)
    `;
    
    return results;
  } catch (error) {
    console.error(`Error fetching login history for business ${businessId}:`, error);
    return [];
  }
}

// Get business activity overview (combined metrics)
export async function getBusinessActivityOverview(businessId: number): Promise<any> {
  try {
    console.log(`Fetching activity overview for business ${businessId}`);
    
    // Get total metrics
    const totalsResult = await sql`
      SELECT 
        COUNT(DISTINCT bdl.id) as total_logins,
        COUNT(DISTINCT bdl.user_id) as unique_users,
        COALESCE(AVG(bdl.session_duration), 0) as avg_session_duration,
        COUNT(DISTINCT bt.id) as total_transactions,
        COALESCE(SUM(bt.amount), 0) as total_revenue,
        COUNT(DISTINCT bt.customer_id) as total_customers
      FROM 
        businesses b
      LEFT JOIN 
        business_daily_logins bdl ON b.id = bdl.business_id
      LEFT JOIN 
        business_transactions bt ON b.id = bt.business_id
      WHERE 
        b.id = ${businessId}
    `;
    
    // Get last 30 days metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentResult = await sql`
      SELECT 
        COUNT(DISTINCT bdl.id) as recent_logins,
        COUNT(DISTINCT bdl.user_id) as recent_users,
        COALESCE(AVG(bdl.session_duration), 0) as recent_avg_session,
        COUNT(DISTINCT bt.id) as recent_transactions,
        COALESCE(SUM(bt.amount), 0) as recent_revenue,
        COUNT(DISTINCT bt.customer_id) as recent_customers
      FROM 
        businesses b
      LEFT JOIN 
        business_daily_logins bdl ON b.id = bdl.business_id AND bdl.login_time >= ${thirtyDaysAgo.toISOString()}
      LEFT JOIN 
        business_transactions bt ON b.id = bt.business_id AND bt.transaction_date >= ${thirtyDaysAgo.toISOString()}
      WHERE 
        b.id = ${businessId}
    `;
    
    // Combine the results
    return {
      allTime: totalsResult[0] || {},
      last30Days: recentResult[0] || {}
    };
  } catch (error) {
    console.error(`Error fetching activity overview for business ${businessId}:`, error);
    return {
      allTime: {},
      last30Days: {}
    };
  }
}

// Mapping functions
function mapDbBusinessToBusiness(dbBusiness: any): Business {
  return {
    id: dbBusiness.id,
    name: dbBusiness.name,
    owner: dbBusiness.owner,
    email: dbBusiness.email,
    phone: dbBusiness.phone,
    type: dbBusiness.type,
    status: dbBusiness.status,
    registeredAt: dbBusiness.registered_at,
    address: dbBusiness.address,
    logo: dbBusiness.logo,
    description: dbBusiness.description,
    notes: dbBusiness.notes,
    userId: dbBusiness.user_id,
    // Calculated fields
    programCount: dbBusiness.program_count || 0,
    customerCount: dbBusiness.total_customers || 0,
    revenue: dbBusiness.total_revenue || 0,
    lastActivity: dbBusiness.last_login_time || dbBusiness.updated_at || dbBusiness.registered_at
  };
}

function mapDbAnalyticsToAnalytics(dbAnalytics: any): BusinessAnalytics {
  return {
    id: dbAnalytics.id,
    businessId: dbAnalytics.business_id,
    date: dbAnalytics.date,
    loginCount: dbAnalytics.login_count,
    activeCustomers: dbAnalytics.active_customers,
    newCustomers: dbAnalytics.new_customers,
    totalTransactions: dbAnalytics.total_transactions,
    revenue: dbAnalytics.revenue,
    averageTransactionValue: dbAnalytics.avg_transaction_value,
    customerRetentionRate: dbAnalytics.customer_retention_rate,
    growthRate: dbAnalytics.growth_rate
  };
}

// Create sample businesses for testing
export async function createSampleBusinessData(): Promise<void> {
  try {
    console.log('Creating sample business data...');
    
    // Check if we already have businesses
    const existingBusinesses = await getAllBusinesses();
    if (existingBusinesses.length > 0) {
      console.log('Sample businesses already exist, skipping creation');
      return;
    }
    
    // Sample business data
    const sampleBusinesses = [
      {
        name: 'Tech Store',
        owner: 'Alex Wong',
        email: 'business@example.com', // This matches our demo business user
        phone: '+1 555-876-5432',
        type: 'Electronics',
        status: 'active',
        address: '123 Tech Lane, San Francisco, CA 94107',
        description: 'High-end technology retailer with strong customer loyalty and tech support programs.',
        registeredAt: new Date().toISOString()
      },
      {
        name: 'Coffee Haven',
        owner: 'Michael Brown',
        email: 'michael@coffeehaven.com',
        phone: '+1 555-345-6789',
        type: 'Food & Beverage',
        status: 'active',
        address: '123 Brew Street, Seattle, WA 98101',
        description: 'Specialty coffee shop with multiple locations offering loyalty programs for regular customers.',
        registeredAt: new Date().toISOString()
      },
      {
        name: 'Fitness Zone',
        owner: 'Sarah Johnson',
        email: 'sarah@fitnesszone.com',
        phone: '+1 555-987-6543',
        type: 'Health & Fitness',
        status: 'inactive',
        address: '456 Health Avenue, Portland, OR 97201',
        description: 'Modern fitness center offering personalized training programs and membership rewards.',
        registeredAt: new Date().toISOString()
      },
      {
        name: 'Urban Eats',
        owner: 'Carlos Rodriguez',
        email: 'carlos@urbaneats.com',
        phone: '+1 555-987-6543',
        type: 'Food & Beverage',
        status: 'suspended',
        address: '321 Food Court, New York, NY 10001',
        description: 'Urban restaurant chain with digital loyalty programs and online ordering rewards.',
        registeredAt: new Date().toISOString()
      }
    ];
    
    // Create each business
    for (const business of sampleBusinesses) {
      await createBusiness(business);
    }
    
    // Create some sample transactions and logins for the first business
    const businesses = await getAllBusinesses();
    if (businesses.length > 0) {
      const firstBusiness = businesses[0];
      
      // Create sample logins (for the past 30 days)
      if (firstBusiness.id) {
        // Create login records for the past 30 days
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          
          // Random number of logins per day (1-5)
          const loginCount = Math.floor(Math.random() * 5) + 1;
          
          for (let j = 0; j < loginCount; j++) {
            await sql`
              INSERT INTO business_daily_logins (
                business_id, user_id, login_time, ip_address, device, session_duration
              ) VALUES (
                ${firstBusiness.id},
                ${firstBusiness.id}, 
                ${date.toISOString()},
                '127.0.0.1',
                'Sample Data Generator',
                ${Math.floor(Math.random() * 3600)}
              )
            `;
          }
          
          // Create sample transactions for this day
          const transactionCount = Math.floor(Math.random() * 10) + 1;
          for (let k = 0; k < transactionCount; k++) {
            await sql`
              INSERT INTO business_transactions (
                business_id, customer_id, amount, transaction_type, transaction_date, notes
              ) VALUES (
                ${firstBusiness.id},
                ${k + 1}, 
                ${Math.floor(Math.random() * 10000) / 100},
                'purchase',
                ${date.toISOString()},
                'Sample transaction'
              )
            `;
          }
          
          // Update analytics for this day
          const dayString = date.toISOString().split('T')[0];
          await updateBusinessDailyAnalytics(firstBusiness.id, dayString);
        }
      }
    }
    
    console.log('Sample business data created successfully');
  } catch (error) {
    console.error('Error creating sample business data:', error);
  }
}

// Get all business applications
export async function getAllBusinessApplications(): Promise<BusinessApplication[]> {
  try {
    console.log('Fetching all business applications...');
    
    const applications = await sql`
      SELECT * FROM business_applications
      ORDER BY submitted_at DESC
    `;
    
    console.log(`Retrieved ${applications.length} business applications`);
    return applications.map(mapDbApplicationToApplication);
  } catch (error) {
    console.error('Error fetching business applications:', error);
    return [];
  }
}

// Get a specific business application by ID
export async function getBusinessApplicationById(id: number): Promise<BusinessApplication | null> {
  try {
    console.log(`Fetching business application with id: ${id}`);
    
    const result = await sql`
      SELECT * FROM business_applications
      WHERE id = ${id}
    `;
    
    if (result && result.length > 0) {
      console.log(`Business application found with id ${id}`);
      return mapDbApplicationToApplication(result[0]);
    }
    
    console.log(`No business application found with id ${id}`);
    return null;
  } catch (error) {
    console.error(`Error fetching business application with id ${id}:`, error);
    return null;
  }
}

// Create a new business application
export async function createBusinessApplication(application: Omit<BusinessApplication, 'id' | 'submittedAt' | 'status' | 'documentsVerified'>): Promise<BusinessApplication | null> {
  try {
    console.log('Creating new business application:', application.name);
    
    const result = await sql`
      INSERT INTO business_applications (
        name, owner, email, phone, type, 
        document_business_license, document_identity_proof, 
        document_address_proof, document_tax,
        description, address
      ) VALUES (
        ${application.name},
        ${application.owner},
        ${application.email},
        ${application.phone || null},
        ${application.type || null},
        ${application.documents.businessLicense || null},
        ${application.documents.identityProof || null},
        ${application.documents.addressProof || null},
        ${application.documents.taxDocument || null},
        ${application.description || null},
        ${application.address || null}
      )
      RETURNING *
    `;
    
    if (result && result.length > 0) {
      console.log('Business application created successfully:', result[0]);
      return mapDbApplicationToApplication(result[0]);
    } else {
      console.error('No business application was created');
      return null;
    }
  } catch (error) {
    console.error('Error creating business application:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

// Update business application status
export async function updateBusinessApplicationStatus(id: number, status: 'pending' | 'approved' | 'rejected', notes?: string): Promise<BusinessApplication | null> {
  try {
    console.log(`Updating business application ${id} status to ${status}`);
    
    const result = await sql`
      UPDATE business_applications
      SET 
        status = ${status},
        notes = COALESCE(${notes}, notes),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (result && result.length > 0) {
      console.log(`Business application ${id} status updated to ${status}`);
      
      // If approved, create a new business
      if (status === 'approved') {
        const application = mapDbApplicationToApplication(result[0]);
        
        // Create a business object with the correct type
        const business: Business = {
          name: application.name,
          owner: application.owner,
          email: application.email,
          phone: application.phone,
          type: application.type,
          status: 'active',
          address: application.address,
          description: application.description,
          notes: notes
        };
        
        await createBusiness(business);
      }
      
      return mapDbApplicationToApplication(result[0]);
    }
    
    console.log(`No business application found with id ${id}`);
    return null;
  } catch (error) {
    console.error(`Error updating business application ${id} status:`, error);
    return null;
  }
}

// Add sample business applications for testing
export async function createSampleBusinessApplications(): Promise<void> {
  try {
    console.log('Creating sample business applications...');
    
    // Check if we already have applications
    const existingApplications = await getAllBusinessApplications();
    if (existingApplications.length > 0) {
      console.log('Sample business applications already exist, skipping creation');
      return;
    }
    
    // Sample business applications
    const sampleApplications = [
      {
        name: "Coffee Haven",
        owner: "Michael Brown",
        email: "michael@coffeehaven.com",
        phone: "+1 555-345-6789",
        type: "Food & Beverage",
        documentsVerified: true,
        documents: {
          businessLicense: "license_coffeehaven.pdf",
          identityProof: "id_michael_brown.pdf",
          addressProof: "address_coffeehaven.pdf",
          taxDocument: "tax_coffeehaven.pdf"
        },
        description: "Specialty coffee shop with multiple locations offering loyalty programs for regular customers.",
        address: "123 Brew Street, Seattle, WA 98101"
      },
      {
        name: "Fitness Zone",
        owner: "Sarah Johnson",
        email: "sarah@fitnesszone.com",
        phone: "+1 555-987-6543",
        type: "Health & Fitness",
        documentsVerified: false,
        documents: {
          businessLicense: "license_fitnesszone.pdf",
          identityProof: "id_sarah_johnson.pdf",
          addressProof: "",
          taxDocument: "tax_fitnesszone.pdf"
        },
        description: "Modern fitness center offering personalized training programs and membership rewards.",
        address: "456 Health Avenue, Portland, OR 97201"
      },
      {
        name: "Tech Gadgets",
        owner: "David Wilson",
        email: "david@techgadgets.com",
        phone: "+1 555-123-4567",
        type: "Electronics",
        documentsVerified: false,
        documents: {
          businessLicense: "license_techgadgets.pdf",
          identityProof: "id_david_wilson.pdf",
          addressProof: "",
          taxDocument: ""
        },
        description: "Electronics store specializing in the latest technology products and accessories.",
        address: "789 Tech Boulevard, San Francisco, CA 94105"
      }
    ];
    
    // Insert sample applications
    for (const app of sampleApplications) {
      await createBusinessApplication(app);
    }
    
    console.log('Sample business applications created successfully');
  } catch (error) {
    console.error('Error creating sample business applications:', error);
  }
}

// Map database application to interface
function mapDbApplicationToApplication(dbApplication: any): BusinessApplication {
  return {
    id: dbApplication.id,
    name: dbApplication.name,
    owner: dbApplication.owner,
    email: dbApplication.email,
    phone: dbApplication.phone,
    type: dbApplication.type,
    submittedAt: dbApplication.submitted_at,
    status: dbApplication.status as 'pending' | 'approved' | 'rejected',
    documentsVerified: dbApplication.documents_verified,
    documents: {
      businessLicense: dbApplication.document_business_license || '',
      identityProof: dbApplication.document_identity_proof || '',
      addressProof: dbApplication.document_address_proof || '',
      taxDocument: dbApplication.document_tax || ''
    },
    description: dbApplication.description || '',
    address: dbApplication.address || '',
    notes: dbApplication.notes
  };
} 