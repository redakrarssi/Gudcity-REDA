import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import sql from '../utils/db';
import { logger } from '../utils/logger';
import { createSecureErrorResponse, isDevelopmentEnvironment } from '../utils/secureErrorResponse';

const router = Router();

// Admin-only guard for sensitive endpoints
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

/**
 * GET /api/admin/businesses
 * Retrieve all businesses with comprehensive information including:
 * - Basic business information
 * - Registration duration calculation
 * - Programs, customers, promotions
 * - Historical timeline data
 * - Last login information
 */
router.get('/businesses', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    logger.info('Admin businesses endpoint accessed', { userId: req.user?.id });

    // Fetch all businesses with comprehensive data
    // First try to get from users table (business accounts)
    const usersBusinessesResult = await sql<any[]>`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at as registration_date,
        u.status,
        bp.address,
        bp.phone,
        bp.currency,
        bp.country,
        bp.timezone,
        bp.language,
        bp.business_hours,
        bp.payment_settings,
        bp.notification_settings,
        bp.integrations,
        bp.tax_id,
        bp.updated_at as profile_updated_at,
        'user_business' as source
      FROM users u
      LEFT JOIN business_profile bp ON u.id = bp.business_id
      WHERE u.user_type = 'business'
    `;

    // Also try to get from businesses table (legacy/separate business records)
    const legacyBusinessesResult = await sql<any[]>`
      SELECT 
        b.id,
        b.name,
        b.email,
        b.registered_at as registration_date,
        b.status,
        b.address,
        b.phone,
        'USD' as currency,
        'US' as country,
        'UTC' as timezone,
        'en' as language,
        '{}'::jsonb as business_hours,
        '{}'::jsonb as payment_settings,
        '{}'::jsonb as notification_settings,
        '{}'::jsonb as integrations,
        NULL as tax_id,
        b.updated_at as profile_updated_at,
        'legacy_business' as source
      FROM businesses b
      WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = b.user_id AND u.user_type = 'business'
      )
    `;

    // Combine both results and sort by registration date
    const businessesResult = [...usersBusinessesResult, ...legacyBusinessesResult]
      .sort((a, b) => new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime());

    if (!businessesResult.length) {
      return res.json({ businesses: [] });
    }

    // Process each business to add calculated fields and related data
    const businesses = await Promise.all(
      businessesResult.map(async (business) => {
        const businessId = business.id;
        const businessSource = business.source;
        
        // Calculate registration duration
        const registrationDate = new Date(business.registration_date);
        const now = new Date();
        const duration = calculateDuration(registrationDate, now);
        
        // Fetch programs for this business
        const programs = await sql<any[]>`
          SELECT 
            id,
            name,
            description,
            type,
            category,
            point_value,
            expiration_days,
            status,
            is_active,
            created_at
          FROM loyalty_programs
          WHERE business_id = ${businessId}
          ORDER BY created_at DESC
        `;
        
        // Fetch customers for this business
        const customers = await sql<any[]>`
          SELECT 
            c.id,
            c.name,
            c.email,
            c.tier,
            c.loyalty_points,
            c.total_spent,
            c.visits,
            c.joined_at,
            c.last_visit,
            c.phone,
            c.address
          FROM customers c
          INNER JOIN program_enrollments pe ON c.id = pe.customer_id
          INNER JOIN loyalty_programs lp ON pe.program_id = lp.id
          WHERE lp.business_id = ${businessId}
          GROUP BY c.id
          ORDER BY c.joined_at DESC
        `;
        
        // Fetch promotions for this business
        const promotions = await sql<any[]>`
          SELECT 
            id,
            code,
            type,
            value,
            currency,
            max_uses,
            used_count,
            expires_at,
            status,
            name,
            description,
            created_at
          FROM promo_codes
          WHERE business_id = ${businessId}
          ORDER BY created_at DESC
        `;
        
        // Fetch last login information - handle both table structures
        let lastLogin = null;
        if (businessSource === 'user_business') {
          // For user businesses, try to get from business_daily_logins
          const lastLoginResult = await sql<any[]>`
            SELECT 
              login_time,
              ip_address,
              device
            FROM business_daily_logins
            WHERE business_id = ${businessId}
            ORDER BY login_time DESC
            LIMIT 1
          `;
          
          if (lastLoginResult.length > 0) {
            lastLogin = {
              time: lastLoginResult[0].login_time,
              ipAddress: lastLoginResult[0].ip_address,
              device: lastLoginResult[0].device
            };
          }
        } else {
          // For legacy businesses, try to get from business_daily_logins with user_id
          const lastLoginResult = await sql<any[]>`
            SELECT 
              login_time,
              ip_address,
              device
            FROM business_daily_logins
            WHERE user_id = ${businessId}
            ORDER BY login_time DESC
            LIMIT 1
          `;
          
          if (lastLoginResult.length > 0) {
            lastLogin = {
              time: lastLoginResult[0].login_time,
              ipAddress: lastLoginResult[0].ip_address,
              device: lastLoginResult[0].device
            };
          }
        }
        
        // Build historical timeline
        const timeline = await buildBusinessTimeline(businessId, businessSource);
        
        return {
          // General Info
          generalInfo: {
            id: business.id,
            name: business.name,
            email: business.email,
            status: business.status,
            address: business.address,
            phone: business.phone,
            currency: business.currency || 'USD',
            country: business.country,
            timezone: business.timezone || 'UTC',
            language: business.language || 'en',
            taxId: business.tax_id,
            businessHours: business.business_hours,
            paymentSettings: business.payment_settings,
            notificationSettings: business.notification_settings,
            integrations: business.integrations,
            profileUpdatedAt: business.profile_updated_at,
            source: businessSource
          },
          
          // Registration Duration
          registrationDuration: {
            registrationDate: business.registration_date,
            duration: duration,
            daysRegistered: Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24))
          },
          
          // Programs
          programs: {
            count: programs.length,
            items: programs
          },
          
          // Customers
          customers: {
            count: customers.length,
            items: customers
          },
          
          // Promotions
          promotions: {
            count: promotions.length,
            items: promotions
          },
          
          // Last Login
          lastLogin: lastLogin,
          
          // Historical Timeline
          timeline: timeline
        };
      })
    );

    res.json({
      success: true,
      totalBusinesses: businesses.length,
      businesses: businesses
    });

  } catch (error) {
    logger.error('Error fetching admin businesses data', { error, userId: req.user?.id });
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    return res.status(statusCode).json(response);
  }
});

/**
 * Helper function to calculate duration between two dates
 * Returns human-readable duration string
 */
function calculateDuration(startDate: Date, endDate: Date): string {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} days registered`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    if (remainingDays === 0) {
      return `${months} month${months > 1 ? 's' : ''} registered`;
    } else {
      return `${months} month${months > 1 ? 's' : ''} ${remainingDays} days registered`;
    }
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    if (remainingDays === 0) {
      return `${years} year${years > 1 ? 's' : ''} registered`;
    } else {
      const months = Math.floor(remainingDays / 30);
      const finalDays = remainingDays % 30;
      if (months === 0) {
        return `${years} year${years > 1 ? 's' : ''} ${finalDays} days registered`;
      } else {
        return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''} ${finalDays} days registered`;
      }
    }
  }
}

/**
 * Helper function to build comprehensive business timeline
 * Includes all major events from registration to present
 */
async function buildBusinessTimeline(businessId: number, businessSource: string): Promise<any[]> {
  const timeline: any[] = [];
  
  try {
    // Get business registration based on source
    if (businessSource === 'user_business') {
      const businessResult = await sql<any[]>`
        SELECT created_at, name
        FROM users
        WHERE id = ${businessId}
      `;
      
      if (businessResult.length > 0) {
        timeline.push({
          type: 'business_registration',
          title: 'Business Account Created',
          description: `${businessResult[0].name} registered on the platform`,
          date: businessResult[0].created_at,
          category: 'account'
        });
      }
    } else {
      const businessResult = await sql<any[]>`
        SELECT registered_at as created_at, name
        FROM businesses
        WHERE id = ${businessId}
      `;
      
      if (businessResult.length > 0) {
        timeline.push({
          type: 'business_registration',
          title: 'Business Account Created',
          description: `${businessResult[0].name} registered on the platform`,
          date: businessResult[0].created_at,
          category: 'account'
        });
      }
    }
    
    // Get programs created
    const programsResult = await sql<any[]>`
      SELECT name, created_at
      FROM loyalty_programs
      WHERE business_id = ${businessId}
      ORDER BY created_at ASC
    `;
    
    programsResult.forEach(program => {
      timeline.push({
        type: 'program_created',
        title: 'Loyalty Program Created',
        description: `Created program: ${program.name}`,
        date: program.created_at,
        category: 'programs'
      });
    });
    
    // Get customer enrollments
    const enrollmentsResult = await sql<any[]>`
      SELECT 
        c.name as customer_name,
        lp.name as program_name,
        pe.enrolled_at
      FROM program_enrollments pe
      INNER JOIN loyalty_programs lp ON pe.program_id = lp.id
      INNER JOIN customers c ON pe.customer_id = c.id
      WHERE lp.business_id = ${businessId}
      ORDER BY pe.enrolled_at ASC
    `;
    
    enrollmentsResult.forEach(enrollment => {
      timeline.push({
        type: 'customer_enrolled',
        title: 'Customer Enrolled',
        description: `${enrollment.customer_name} enrolled in ${enrollment.program_name}`,
        date: enrollment.enrolled_at,
        category: 'customers'
      });
    });
    
    // Get promotions created
    const promotionsResult = await sql<any[]>`
      SELECT name, code, created_at
      FROM promo_codes
      WHERE business_id = ${businessId}
      ORDER BY created_at ASC
    `;
    
    promotionsResult.forEach(promotion => {
      timeline.push({
        type: 'promotion_created',
        title: 'Promotion Created',
        description: `Created promotion: ${promotion.name} (${promotion.code})`,
        date: promotion.created_at,
        category: 'promotions'
      });
    });
    
    // Get login activity (last 10 logins) - handle both table structures
    let loginsResult: any[] = [];
    if (businessSource === 'user_business') {
      loginsResult = await sql<any[]>`
        SELECT login_time, ip_address, device
        FROM business_daily_logins
        WHERE business_id = ${businessId}
        ORDER BY login_time DESC
        LIMIT 10
      `;
    } else {
      loginsResult = await sql<any[]>`
        SELECT login_time, ip_address, device
        FROM business_daily_logins
        WHERE user_id = ${businessId}
        ORDER BY login_time DESC
        LIMIT 10
      `;
    }
    
    loginsResult.forEach(login => {
      timeline.push({
        type: 'login_activity',
        title: 'Business Login',
        description: `Logged in from ${login.ip_address}${login.device ? ` (${login.device})` : ''}`,
        date: login.login_time,
        category: 'activity'
      });
    });
    
    // Sort timeline by date (oldest first)
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  } catch (error) {
    logger.error('Error building business timeline', { error, businessId, businessSource });
  }
  
  return timeline;
}

export default router;