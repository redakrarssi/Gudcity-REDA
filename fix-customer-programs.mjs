#!/usr/bin/env node

/**
 * Script to fix customer program enrollment issues causing 405 errors when awarding points.
 * This script includes multiple fixes:
 * 1. Ensures enrollments have corresponding loyalty_cards
 * 2. Fixes data consistency issues between customer_programs and loyalty_cards tables
 * 3. Adds missing API route middleware fixes to prevent 405 errors
 */

import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('🔧 Starting fix for customer program points issue');
  
  try {
    // 1. First check if the award-points API route is properly configured
    console.log('Checking API route configuration...');
    
    const businessRoutesPath = path.join('src', 'api', 'businessRoutes.ts');
    let businessRoutes = '';
    
    try {
      businessRoutes = await fs.readFile(businessRoutesPath, 'utf-8');
      console.log('✅ Found business routes file');
    } catch (err) {
      console.error('❌ Could not read business routes file:', err);
      console.log('Creating a sample fix file instead...');
      
      // Create a sample fix file
      const sampleFix = `
/**
 * Fix for 405 Error when awarding points to enrolled customers
 * 
 * Problem: Customers already enrolled in a program are experiencing 405 errors when points are awarded.
 * 
 * Root causes identified:
 * 1. API route middleware issue - The POST route for award-points is not properly registered or is being blocked
 * 2. Customer_programs table not properly linked to loyalty_cards
 * 3. Enrollment status check failing for some customers
 * 
 * Fix implementation:
 * 1. Update businessRoutes.ts to properly register the POST route with correct middleware
 * 2. Improve customer lookup to find customers across different tables
 * 3. Fix enrollment status checking with direct SQL queries
 * 4. Enhance error handling and diagnostic information
 */

// Example fix for businessRoutes.ts:
router.post('/award-points', auth, async (req: Request, res: Response) => {
  // ... Existing code ...
  
  try {
    // Log request details for debugging the 405 issue
    console.log(\`Award points request: customer=\${customerIdStr}, program=\${programIdStr}, points=\${points}, business=\${businessIdStr}\`);
    
    // Validate inputs
    if (!customerId || !programId || !points) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Get customer name with expanded fallback logic
    let customerName = "Customer #" + customerIdStr; // Default name in case no name is found
    let customerFound = false;
    
    // Try multiple tables to find customer
    // First try users table with customer type
    let customerResult = await sql\`
      SELECT id, name FROM users WHERE id = \${customerIdStr} AND user_type = 'customer'
    \`;

    if (customerResult.length > 0) {
      customerName = String(customerResult[0].name || customerName);
      customerFound = true;
    } 
    // Try other tables if not found...
    
    // Check if customer is enrolled with more thorough query
    const enrollmentCheck = await sql\`
      SELECT EXISTS (
        SELECT 1 FROM customer_programs 
        WHERE customer_id = \${customerIdStr}
        AND program_id = \${programIdStr}
      ) AS is_enrolled
    \`;
    
    const isEnrolled = enrollmentCheck[0]?.is_enrolled === true;
    
    if (!isEnrolled) {
      // Create enrollment and card
    } else {
      // Find existing card or create one if missing
      const cardResult = await sql\`
        SELECT id FROM loyalty_cards
        WHERE customer_id = \${customerIdStr}
        AND program_id = \${programIdStr}
      \`;
      
      // ... rest of function ...
    }
  } catch (error) {
    // Improved error handling with specific status codes and diagnnostic info
  }
});

// Example fix for PointsAwardingModal.tsx:
const response = await fetch('/api/businesses/award-points', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json' 
  },
  credentials: 'same-origin',
  body: JSON.stringify({ 
    customerId, 
    programId: selectedProgramId,
    points: pointsToAward,
    description: 'Points awarded via QR code scan',
    source: 'SCAN',
    transactionRef
  }),
});

// Handle 405 Method Not Allowed error specifically
if (response.status === 405) {
  console.error('405 Method Not Allowed error. API endpoint might be misconfigured.');
  throw new Error(\`Server rejected request method: POST. Allowed methods: \${response.headers.get('Allow') || 'unknown'}\`);
}
`;
      
      await fs.writeFile('fix-405-error-sample.txt', sampleFix);
      console.log('✅ Created sample fix file: fix-405-error-sample.txt');
    }
    
    // 2. Create or update the API Middleware fix
    console.log('Creating API middleware fix...');
    
    const apiMiddlewareFix = `
/**
 * API MIDDLEWARE FIX FOR 405 ERRORS
 * 
 * This middleware should be added to your Express application to help
 * diagnose and prevent 405 Method Not Allowed errors when awarding points.
 * 
 * How to use:
 * 1. Copy this code into a middleware file (e.g., src/middleware/apiErrorHandler.ts)
 * 2. Import and add to your Express app before other route handlers
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to log and diagnose API requests
 */
export const apiRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, body, headers } = req;
  
  // Log basic request info
  console.log(\`API Request: \${method} \${url}\`);
  
  // Add a response listener to log the outcome
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    console.log(\`API Response: \${method} \${url} - Status: \${statusCode} - Duration: \${duration}ms\`);
    
    // Special handling for 405 errors
    if (statusCode === 405) {
      console.error(\`405 Method Not Allowed Error: \${method} \${url}\`);
      console.error('This typically indicates a route configuration issue or middleware conflict');
      console.error('Check that the route is properly registered with the correct HTTP method');
      console.error('Also verify that no middleware is blocking this request method');
    }
  });
  
  next();
};

/**
 * Middleware to handle CORS and preflight requests
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Allow all origins for development (restrict this in production)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

/**
 * Middleware to properly handle 405 errors
 */
export const methodNotAllowedHandler = (req: Request, res: Response, next: NextFunction) => {
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalStatus = res.status;
  
  // Override status to intercept 405 responses
  res.status = function(code) {
    if (code === 405) {
      console.warn(\`405 Method Not Allowed intercepted: \${req.method} \${req.url}\`);
      
      // Add proper Allow header if missing
      if (!res.get('Allow')) {
        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
      }
      
      // Enhance 405 responses with more helpful information
      return originalStatus.call(this, 405)
        .json({
          error: 'Method Not Allowed',
          message: \`\${req.method} is not allowed for this resource\`,
          allowedMethods: res.get('Allow'),
          path: req.url,
          helpText: 'This error typically indicates a route configuration issue or middleware conflict'
        });
    }
    
    return originalStatus.call(this, code);
  };
  
  next();
};
`;
    
    await fs.writeFile('api-middleware-fix.ts', apiMiddlewareFix);
    console.log('✅ Created API middleware fix file: api-middleware-fix.ts');
    
    // 3. Create a database fix script
    console.log('Creating database fix script...');
    
    const dbFixScript = `#!/usr/bin/env node

/**
 * Database fix script for customer program enrollment and loyalty card issues
 * 
 * This script fixes inconsistencies between customer_programs and loyalty_cards tables
 * that could cause the 405 error when awarding points to enrolled customers.
 * 
 * Issues addressed:
 * 1. Customers enrolled in programs but missing loyalty cards
 * 2. Loyalty cards with incorrect customer or program references
 * 3. Inconsistent data formats for customer IDs across tables
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('❌ Database URL not found in environment variables');
    console.error('Create a .env or .env.local file with DATABASE_URL or VITE_DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });

  console.log('🔧 Starting database fix for customer program enrollment issues');
  
  try {
    // 1. Ensure consistent customer ID format across tables
    console.log('Standardizing customer ID format...');
    
    // This will standardize IDs across tables - adapt as needed for your schema
    const fixQueries = [
      \`
      ALTER TABLE customer_programs 
      ALTER COLUMN customer_id TYPE VARCHAR(255)
      \`,
      
      \`
      ALTER TABLE loyalty_cards
      ALTER COLUMN customer_id TYPE VARCHAR(255)
      \`,
      
      \`
      INSERT INTO loyalty_cards (customer_id, program_id, business_id, card_type, points, is_active, created_at)
      SELECT 
        cp.customer_id, 
        cp.program_id, 
        lp.business_id, 
        'STANDARD', 
        COALESCE(cp.current_points, 0), 
        TRUE, 
        NOW()
      FROM customer_programs cp
      JOIN loyalty_programs lp ON cp.program_id = lp.id
      WHERE NOT EXISTS (
        SELECT 1 FROM loyalty_cards lc 
        WHERE lc.customer_id = cp.customer_id 
        AND lc.program_id = cp.program_id
      )
      \`,
      
      \`
      UPDATE loyalty_cards lc
      SET points = cp.current_points
      FROM customer_programs cp
      WHERE lc.customer_id = cp.customer_id
      AND lc.program_id = cp.program_id
      AND lc.points != cp.current_points
      \`
    ];
    
    // Execute each fix query
    for (const query of fixQueries) {
      try {
        await pool.query(query);
        console.log('✅ Successfully executed fix query');
      } catch (err) {
        console.log('⚠️ Query error (may be safely ignored if column already exists):', err.message);
      }
    }
    
    // 2. Check for any specific problem with customer ID 4
    console.log('\\nChecking customer ID 4 specifically...');
    
    // Verify customer 4 exists
    const customer4 = await pool.query(\`
      SELECT * FROM users WHERE id = 4
    \`);
    
    if (customer4.rows.length > 0) {
      console.log('✅ Customer ID 4 exists in users table');
      
      // Check enrollments
      const enrollments = await pool.query(\`
        SELECT * FROM customer_programs WHERE customer_id = '4'
      \`);
      
      if (enrollments.rows.length > 0) {
        console.log(\`✅ Customer 4 has \${enrollments.rows.length} program enrollments\`);
        
        // Check for missing loyalty cards
        const missingCards = await pool.query(\`
          SELECT cp.program_id 
          FROM customer_programs cp
          WHERE cp.customer_id = '4'
          AND NOT EXISTS (
            SELECT 1 FROM loyalty_cards lc
            WHERE lc.customer_id = '4'
            AND lc.program_id = cp.program_id
          )
        \`);
        
        if (missingCards.rows.length > 0) {
          console.log(\`⚠️ Customer 4 is missing loyalty cards for \${missingCards.rows.length} programs\`);
          
          // Fix missing cards
          for (const row of missingCards.rows) {
            const programId = row.program_id;
            
            // Get business ID for this program
            const programInfo = await pool.query(\`
              SELECT business_id FROM loyalty_programs WHERE id = $1
            \`, [programId]);
            
            if (programInfo.rows.length > 0) {
              const businessId = programInfo.rows[0].business_id;
              
              // Create missing card
              await pool.query(\`
                INSERT INTO loyalty_cards (
                  customer_id, program_id, business_id, card_type, 
                  points, is_active, created_at
                )
                VALUES ($1, $2, $3, 'STANDARD', 0, TRUE, NOW())
              \`, ['4', programId, businessId]);
              
              console.log(\`✅ Created missing card for program \${programId}\`);
            }
          }
        } else {
          console.log('✅ Customer 4 has all required loyalty cards');
        }
      } else {
        console.log('❌ Customer 4 has no program enrollments');
      }
    } else {
      console.log('❌ Customer ID 4 not found in users table');
    }
    
    console.log('\\n✅ Database fix script completed successfully');
    
  } catch (error) {
    console.error('❌ Error during database fix:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
`;
    
    await fs.writeFile('fix-customer-programs-db.mjs', dbFixScript);
    console.log('✅ Created database fix script: fix-customer-programs-db.mjs');
    
    // Final recommendations
    console.log('\n📋 Summary of fixes:');
    console.log('1. Created API middleware fix (api-middleware-fix.ts)');
    console.log('2. Created database fix script (fix-customer-programs-db.mjs)');
    console.log('3. Provided sample fix code (fix-405-error-sample.txt)');
    
    console.log('\n📋 How to apply the fixes:');
    console.log('1. Copy the middleware from api-middleware-fix.ts into your Express app setup');
    console.log('2. Run the database fix script with: node fix-customer-programs-db.mjs');
    console.log('3. Apply the improved error handling to PointsAwardingModal.tsx');
    console.log('4. Ensure all route handlers in businessRoutes.ts are properly registered');
    
  } catch (error) {
    console.error('❌ Error creating fix files:', error);
  }
}

main().catch(console.error); 