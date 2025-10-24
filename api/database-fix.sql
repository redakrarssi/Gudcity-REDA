-- Database Schema Fix for Customer Dashboard
-- This script fixes the database schema issues causing the errors

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS customer_notifications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    business_id INTEGER,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    requires_action BOOLEAN DEFAULT FALSE,
    action_taken BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'NORMAL',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    action_taken_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_activities (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    points INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redemptions (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL,
    points_used INTEGER NOT NULL,
    reward_description TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_scan_logs (
    id SERIAL PRIMARY KEY,
    scan_type VARCHAR(50) NOT NULL,
    scanned_by INTEGER NOT NULL,
    scanned_data JSONB NOT NULL,
    customer_id INTEGER,
    points_awarded INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fix existing tables structure
ALTER TABLE loyalty_cards 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_business_id ON customer_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_type ON customer_notifications(type);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_is_read ON customer_notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event ON security_audit_logs(event);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_card_activities_card_id ON card_activities(card_id);
CREATE INDEX IF NOT EXISTS idx_card_activities_activity_type ON card_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_card_activities_created_at ON card_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_redemptions_card_id ON redemptions(card_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_by ON qr_scan_logs(scanned_by);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_customer_id ON qr_scan_logs(customer_id);

-- Fix loyalty_cards table structure
ALTER TABLE loyalty_cards 
ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS points_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing loyalty_cards to have proper structure
UPDATE loyalty_cards 
SET 
    points_balance = COALESCE(points_balance, points),
    total_points_earned = COALESCE(total_points_earned, points),
    card_type = COALESCE(card_type, 'STANDARD'),
    tier = COALESCE(tier, 'STANDARD'),
    is_active = COALESCE(is_active, TRUE)
WHERE points_balance IS NULL OR total_points_earned IS NULL;

-- Create function to check if table exists
CREATE OR REPLACE FUNCTION table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = table_exists.table_name
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to award points to card
CREATE OR REPLACE FUNCTION award_points_to_card(
    card_id_param INTEGER,
    points_param INTEGER,
    source_param VARCHAR(100),
    description_param TEXT,
    transaction_id_param VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    card_exists BOOLEAN;
BEGIN
    -- Check if card exists and is active
    SELECT EXISTS(
        SELECT 1 FROM loyalty_cards 
        WHERE id = card_id_param AND status = 'ACTIVE'
    ) INTO card_exists;
    
    IF NOT card_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update card points
    UPDATE loyalty_cards 
    SET 
        points = points + points_param,
        points_balance = COALESCE(points_balance, 0) + points_param,
        total_points_earned = COALESCE(total_points_earned, 0) + points_param,
        updated_at = NOW()
    WHERE id = card_id_param;
    
    -- Record transaction
    INSERT INTO point_transactions (
        customer_id, business_id, program_id, points, 
        transaction_type, description, source, transaction_id, created_at
    )
    SELECT 
        lc.customer_id, lc.business_id, lc.program_id, points_param,
        'AWARD', description_param, source_param, transaction_id_param, NOW()
    FROM loyalty_cards lc
    WHERE lc.id = card_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO customer_notifications (customer_id, business_id, type, title, message, created_at)
SELECT 
    u.id as customer_id,
    lp.business_id,
    'WELCOME' as type,
    'Welcome to ' || u2.name || ' Loyalty Program!' as title,
    'You have successfully enrolled in our loyalty program. Start earning points today!' as message,
    NOW() as created_at
FROM users u
CROSS JOIN loyalty_programs lp
JOIN users u2 ON lp.business_id = u2.id
WHERE u.user_type = 'customer'
AND NOT EXISTS (
    SELECT 1 FROM customer_notifications cn 
    WHERE cn.customer_id = u.id 
    AND cn.type = 'WELCOME'
)
LIMIT 10;

-- Update loyalty_cards with QR codes if missing
UPDATE loyalty_cards 
SET qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' || 
    encode(('loyalty_card:' || id || ':' || customer_id || ':' || business_id)::bytea, 'base64')
WHERE qr_code_url IS NULL OR qr_code_url = '';

-- Create sample card activities
INSERT INTO card_activities (card_id, activity_type, points, description, created_at)
SELECT 
    lc.id as card_id,
    'POINTS_AWARDED' as activity_type,
    lc.points as points,
    'Welcome bonus points' as description,
    lc.created_at
FROM loyalty_cards lc
WHERE lc.points > 0
AND NOT EXISTS (
    SELECT 1 FROM card_activities ca 
    WHERE ca.card_id = lc.id 
    AND ca.activity_type = 'POINTS_AWARDED'
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_notifications TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON security_audit_logs TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON card_activities TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON redemptions TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_scan_logs TO PUBLIC;
GRANT EXECUTE ON FUNCTION table_exists(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION award_points_to_card(INTEGER, INTEGER, VARCHAR, TEXT, VARCHAR) TO PUBLIC;

-- Update sequence values
SELECT setval('customer_notifications_id_seq', COALESCE(MAX(id), 1)) FROM customer_notifications;
SELECT setval('security_audit_logs_id_seq', COALESCE(MAX(id), 1)) FROM security_audit_logs;
SELECT setval('card_activities_id_seq', COALESCE(MAX(id), 1)) FROM card_activities;
SELECT setval('redemptions_id_seq', COALESCE(MAX(id), 1)) FROM redemptions;
SELECT setval('qr_scan_logs_id_seq', COALESCE(MAX(id), 1)) FROM qr_scan_logs;