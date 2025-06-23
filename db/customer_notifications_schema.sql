-- Customer Notifications and Approvals Schema

-- Notification Table
CREATE TABLE IF NOT EXISTS customer_notifications (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- ENROLLMENT, POINTS_ADDED, POINTS_DEDUCTED, PROMO_CODE
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- For additional context data
  reference_id VARCHAR(255), -- ID of related entity (card_id, program_id, etc.)
  requires_action BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_business_id ON customer_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_type ON customer_notifications(type);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_requires_action ON customer_notifications(requires_action) WHERE requires_action = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_notifications_is_read ON customer_notifications(is_read) WHERE is_read = FALSE;

-- Customer Approval Requests Table
CREATE TABLE IF NOT EXISTS customer_approval_requests (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES customer_notifications(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- ENROLLMENT, POINTS_DEDUCTION
  entity_id VARCHAR(255) NOT NULL, -- Related entity ID (card_id, program_id)
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  data JSONB, -- For storing request details
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  response_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_customer_id ON customer_approval_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_business_id ON customer_approval_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_notification_id ON customer_approval_requests(notification_id);
CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_status ON customer_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_expires_at ON customer_approval_requests(expires_at);

-- Customer Notification Preferences
CREATE TABLE IF NOT EXISTS customer_notification_preferences (
  customer_id INTEGER PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  email BOOLEAN DEFAULT TRUE,
  push BOOLEAN DEFAULT TRUE,
  in_app BOOLEAN DEFAULT TRUE,
  sms BOOLEAN DEFAULT FALSE,
  enrollment_notifications BOOLEAN DEFAULT TRUE,
  points_earned_notifications BOOLEAN DEFAULT TRUE,
  points_deducted_notifications BOOLEAN DEFAULT TRUE,
  promo_code_notifications BOOLEAN DEFAULT TRUE,
  reward_available_notifications BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a view to get all pending approval requests
CREATE OR REPLACE VIEW pending_approval_requests AS
SELECT 
  ar.id,
  ar.customer_id,
  ar.business_id,
  ar.request_type,
  ar.entity_id,
  ar.data,
  ar.requested_at,
  ar.expires_at,
  b.name as business_name,
  c.first_name || ' ' || c.last_name as customer_name
FROM customer_approval_requests ar
JOIN users b ON ar.business_id = b.id
JOIN customers c ON ar.customer_id = c.id
WHERE ar.status = 'PENDING' AND ar.expires_at > CURRENT_TIMESTAMP; 