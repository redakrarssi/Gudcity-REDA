-- Staff Management Schema for GudCity REDA
-- Adds support for staff user management with role-based access control

-- Add staff management columns to users table
DO $$
BEGIN
    -- Add business_owner_id column for staff users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'business_owner_id'
    ) THEN
        ALTER TABLE users ADD COLUMN business_owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_users_business_owner_id ON users(business_owner_id);
    END IF;

    -- Add permissions column for staff-specific permissions (JSON)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'permissions'
    ) THEN
        ALTER TABLE users ADD COLUMN permissions JSONB DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);
    END IF;

    -- Add created_by column to track who created staff users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
    END IF;
END $$;

-- Create staff activity log table for audit purposes
CREATE TABLE IF NOT EXISTS staff_activity_log (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50), -- 'program', 'promotion', 'customer', etc.
    resource_id INTEGER,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for staff activity log
CREATE INDEX IF NOT EXISTS idx_staff_activity_log_staff_id ON staff_activity_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_log_owner_id ON staff_activity_log(business_owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_log_action ON staff_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_staff_activity_log_created_at ON staff_activity_log(created_at);

-- Create staff permissions audit table
CREATE TABLE IF NOT EXISTS staff_permissions_audit (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_permissions JSONB,
    new_permissions JSONB NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for permissions audit
CREATE INDEX IF NOT EXISTS idx_staff_permissions_audit_staff_id ON staff_permissions_audit(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_audit_owner_id ON staff_permissions_audit(business_owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_audit_changed_by ON staff_permissions_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_audit_created_at ON staff_permissions_audit(created_at);

-- Function to log staff activity
CREATE OR REPLACE FUNCTION log_staff_activity(
    p_staff_id INTEGER,
    p_business_owner_id INTEGER,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO staff_activity_log (
        staff_id,
        business_owner_id,
        action,
        resource_type,
        resource_id,
        description,
        ip_address,
        user_agent
    ) VALUES (
        p_staff_id,
        p_business_owner_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_description,
        p_ip_address,
        p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- Function to log staff permission changes
CREATE OR REPLACE FUNCTION log_staff_permissions_change(
    p_staff_id INTEGER,
    p_business_owner_id INTEGER,
    p_old_permissions JSONB,
    p_new_permissions JSONB,
    p_changed_by INTEGER,
    p_change_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO staff_permissions_audit (
        staff_id,
        business_owner_id,
        old_permissions,
        new_permissions,
        changed_by,
        change_reason
    ) VALUES (
        p_staff_id,
        p_business_owner_id,
        p_old_permissions,
        p_new_permissions,
        p_changed_by,
        p_change_reason
    );
END;
$$ LANGUAGE plpgsql;

-- Update existing business users to have owner role instead of business role
-- This distinguishes between business owners and staff
UPDATE users 
SET role = 'owner' 
WHERE user_type = 'business' AND role = 'business' AND business_owner_id IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.business_owner_id IS 'References the business owner for staff users';
COMMENT ON COLUMN users.permissions IS 'JSON object containing staff-specific permissions';
COMMENT ON COLUMN users.created_by IS 'References the user who created this staff account';
COMMENT ON TABLE staff_activity_log IS 'Logs all activities performed by staff users for audit purposes';
COMMENT ON TABLE staff_permissions_audit IS 'Tracks changes to staff permissions for security and compliance';
