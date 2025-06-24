import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('🔄 Setting up Real-Time Sync Infrastructure...');
    
    // 1. Create notification triggers table for real-time sync
    console.log('\n1. Creating notification triggers infrastructure...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_notifications (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        operation VARCHAR(20) NOT NULL,
        record_id VARCHAR(255) NOT NULL,
        customer_id VARCHAR(255),
        business_id VARCHAR(255),
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_sync_notifications_customer 
      ON sync_notifications(customer_id);
      
      CREATE INDEX IF NOT EXISTS idx_sync_notifications_business 
      ON sync_notifications(business_id);
      
      CREATE INDEX IF NOT EXISTS idx_sync_notifications_created_at 
      ON sync_notifications(created_at);
    `);
    console.log('✅ Sync notifications table created');

    // 2. Create a comprehensive customer_business_view
    console.log('\n2. Creating comprehensive customer-business view...');
    await pool.query(`
      CREATE OR REPLACE VIEW customer_business_view AS
      SELECT DISTINCT
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.tier as customer_tier,
        c.status as customer_status,
        c.created_at as customer_joined_at,
        c.notes as customer_notes,
        lp.business_id::text,
        b.name as business_name,
        COUNT(DISTINCT pe.program_id) as enrolled_programs_count,
        COALESCE(SUM(pe.current_points), 0) as total_loyalty_points,
        COALESCE(SUM(lt.amount), 0) as total_spent,
        COUNT(DISTINCT lt.id) as total_transactions,
        MAX(lt.transaction_date) as last_transaction_date,
        MAX(pe.last_activity) as last_program_activity,
        ARRAY_AGG(DISTINCT lp.name) FILTER (WHERE lp.name IS NOT NULL) as program_names,
        ARRAY_AGG(DISTINCT pe.program_id) FILTER (WHERE pe.program_id IS NOT NULL) as program_ids
      FROM users c
      JOIN program_enrollments pe ON c.id::text = pe.customer_id
      JOIN loyalty_programs lp ON pe.program_id = lp.id
      LEFT JOIN users b ON lp.business_id::text = b.id::text
      LEFT JOIN loyalty_transactions lt ON c.id::text = lt.customer_id AND lt.business_id::text = lp.business_id::text
      WHERE c.user_type = 'customer' 
        AND c.status = 'active'
        AND pe.status = 'ACTIVE'
        AND lp.status = 'ACTIVE'
      GROUP BY c.id, c.name, c.email, c.phone, c.tier, c.status, c.created_at, c.notes, 
               lp.business_id, b.name
      ORDER BY c.name ASC;
    `);
    console.log('✅ Customer-business view created');

    // 3. Create loyalty cards summary view
    console.log('\n3. Creating loyalty cards summary view...');
    await pool.query(`
      CREATE OR REPLACE VIEW customer_loyalty_cards AS
      SELECT 
        lc.id,
        lc.customer_id,
        lc.business_id,
        lc.program_id,
        lc.card_type,
        lc.card_number,
        lc.points_balance as points,
        lc.total_points_earned,
        lc.points_multiplier,
        lc.next_reward,
        lc.points_to_next,
        lc.status,
        lc.qr_code_url,
        lc.expiry_date,
        lc.benefits,
        lc.last_used,
        lc.is_active,
        lc.created_at,
        lc.updated_at,
        lp.name as program_name,
        lp.type as program_type,
        lp.description as program_description,
        b.name as business_name,
        c.name as customer_name,
        c.email as customer_email
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN users b ON lc.business_id::text = b.id::text AND b.user_type = 'business'
      JOIN users c ON lc.customer_id = c.id::text AND c.user_type = 'customer'
      WHERE lc.is_active = true
        AND lp.status = 'ACTIVE'
        AND b.status = 'active'
        AND c.status = 'active'
      ORDER BY lc.updated_at DESC;
    `);
    console.log('✅ Customer loyalty cards view created');

    // 4. Create program enrollments trigger function
    console.log('\n4. Creating real-time sync trigger functions...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_program_enrollment_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          INSERT INTO sync_notifications (
            table_name, operation, record_id, customer_id, business_id, data
          )
          SELECT 
            'program_enrollments',
            TG_OP,
            NEW.id::text,
            NEW.customer_id,
            lp.business_id,
            json_build_object(
              'program_id', NEW.program_id,
              'current_points', NEW.current_points,
              'status', NEW.status,
              'program_name', lp.name,
              'business_name', b.name
            )
                     FROM loyalty_programs lp
           LEFT JOIN users b ON lp.business_id::text = b.id::text
          WHERE lp.id = NEW.program_id;
          
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          INSERT INTO sync_notifications (
            table_name, operation, record_id, customer_id, business_id, data
          )
          SELECT 
            'program_enrollments',
            TG_OP,
            OLD.id::text,
            OLD.customer_id,
            lp.business_id,
            json_build_object('program_id', OLD.program_id)
          FROM loyalty_programs lp
          WHERE lp.id = OLD.program_id;
          
          RETURN OLD;
        END IF;
        
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Program enrollment trigger function created');

    // 5. Create loyalty cards trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_loyalty_card_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          INSERT INTO sync_notifications (
            table_name, operation, record_id, customer_id, business_id, data
          )
          VALUES (
            'loyalty_cards',
            TG_OP,
            NEW.id::text,
            NEW.customer_id,
            NEW.business_id,
            json_build_object(
              'card_id', NEW.id,
              'program_id', NEW.program_id,
              'points_balance', NEW.points_balance,
              'status', NEW.status
            )
          );
          
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          INSERT INTO sync_notifications (
            table_name, operation, record_id, customer_id, business_id, data
          )
          VALUES (
            'loyalty_cards',
            TG_OP,
            OLD.id::text,
            OLD.customer_id,
            OLD.business_id,
            json_build_object('card_id', OLD.id)
          );
          
          RETURN OLD;
        END IF;
        
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Loyalty cards trigger function created');

    // 6. Create customer notifications trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_customer_notification_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
          INSERT INTO sync_notifications (
            table_name, operation, record_id, customer_id, business_id, data
          )
          VALUES (
            'customer_notifications',
            TG_OP,
            NEW.id::text,
            NEW.customer_id::text,
            NEW.business_id::text,
            json_build_object(
              'notification_id', NEW.id,
              'type', NEW.type,
              'title', NEW.title,
              'requires_action', NEW.requires_action,
              'is_read', NEW.is_read
            )
          );
          
          RETURN NEW;
        END IF;
        
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Customer notifications trigger function created');

    // 7. Create actual triggers
    console.log('\n5. Creating database triggers...');
    
    // Drop existing triggers if they exist
    await pool.query(`
      DROP TRIGGER IF EXISTS program_enrollments_sync_trigger ON program_enrollments;
      DROP TRIGGER IF EXISTS loyalty_cards_sync_trigger ON loyalty_cards;
      DROP TRIGGER IF EXISTS customer_notifications_sync_trigger ON customer_notifications;
    `);

    // Create new triggers
    await pool.query(`
      CREATE TRIGGER program_enrollments_sync_trigger
      AFTER INSERT OR UPDATE OR DELETE ON program_enrollments
      FOR EACH ROW EXECUTE FUNCTION notify_program_enrollment_change();
      
      CREATE TRIGGER loyalty_cards_sync_trigger
      AFTER INSERT OR UPDATE OR DELETE ON loyalty_cards
      FOR EACH ROW EXECUTE FUNCTION notify_loyalty_card_change();
    `);
    
    // Only create notification trigger if the table exists
    const notificationTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customer_notifications'
      );
    `);
    
    if (notificationTableExists.rows[0].exists) {
      await pool.query(`
        CREATE TRIGGER customer_notifications_sync_trigger
        AFTER INSERT OR UPDATE ON customer_notifications
        FOR EACH ROW EXECUTE FUNCTION notify_customer_notification_change();
      `);
      console.log('✅ Customer notifications trigger created');
    }
    
    console.log('✅ Database triggers created successfully');

    // 8. Create cleanup function for old sync notifications
    console.log('\n6. Creating cleanup function...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_sync_notifications()
      RETURNS void AS $$
      BEGIN
        DELETE FROM sync_notifications 
        WHERE created_at < NOW() - INTERVAL '24 hours';
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Cleanup function created');

    // 9. Test the sync system with customer ID 27
    console.log('\n7. Testing sync system with customer ID 27...');
    
    // Check current enrollments for customer 27
    const customer27Enrollments = await pool.query(`
      SELECT * FROM customer_business_view WHERE customer_id = '27'
    `);
    
    console.log(`Found ${customer27Enrollments.rows.length} business relationships for customer 27`);
    
    if (customer27Enrollments.rows.length > 0) {
      console.log('Customer 27 business relationships:');
      customer27Enrollments.rows.forEach((rel, idx) => {
        console.log(`  ${idx + 1}. Business: ${rel.business_name} (ID: ${rel.business_id})`);
        console.log(`     Programs: ${rel.enrolled_programs_count}, Points: ${rel.total_loyalty_points}`);
      });
    }

    // Check loyalty cards for customer 27
    const customer27Cards = await pool.query(`
      SELECT * FROM customer_loyalty_cards WHERE customer_id = '27'
    `);
    
    console.log(`Found ${customer27Cards.rows.length} loyalty cards for customer 27`);
    
    if (customer27Cards.rows.length > 0) {
      console.log('Customer 27 loyalty cards:');
      customer27Cards.rows.forEach((card, idx) => {
        console.log(`  ${idx + 1}. ${card.business_name} - ${card.program_name}: ${card.points} points`);
      });
    }

    // 10. Create a function to refresh customer dashboard
    console.log('\n8. Creating dashboard refresh function...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION refresh_customer_dashboard(customer_id_param TEXT)
      RETURNS TABLE (
        total_cards INTEGER,
        total_points INTEGER,
        total_businesses INTEGER,
        recent_activity JSONB
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(DISTINCT c.id)::INTEGER as total_cards,
          COALESCE(SUM(c.points), 0)::INTEGER as total_points,
          COUNT(DISTINCT c.business_id)::INTEGER as total_businesses,
          json_agg(
            json_build_object(
              'business_name', c.business_name,
              'program_name', c.program_name,
              'points', c.points,
              'last_used', c.last_used
            )
            ORDER BY c.updated_at DESC
          ) as recent_activity
        FROM customer_loyalty_cards c
        WHERE c.customer_id = customer_id_param
        AND c.is_active = true;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Dashboard refresh function created');

    // 11. Test the dashboard function with customer 27
    const dashboardTest = await pool.query(`
      SELECT * FROM refresh_customer_dashboard('27')
    `);
    
    if (dashboardTest.rows.length > 0) {
      const dashboard = dashboardTest.rows[0];
      console.log('\nCustomer 27 Dashboard Summary:');
      console.log(`  Total Cards: ${dashboard.total_cards}`);
      console.log(`  Total Points: ${dashboard.total_points}`);
      console.log(`  Total Businesses: ${dashboard.total_businesses}`);
    }

    console.log('\n🎉 Real-Time Sync Infrastructure Setup Complete!');
    console.log('\nNext steps:');
    console.log('1. Customer dashboards will now show real-time updates');
    console.log('2. Business customer lists will automatically refresh');
    console.log('3. Notifications will trigger immediate UI updates');
    console.log('4. QR scanner actions will sync instantly');

  } catch (error) {
    console.error('❌ Error setting up real-time sync:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);