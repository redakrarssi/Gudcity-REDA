-- Analytics Database Schema

-- Business Analytics
CREATE TABLE IF NOT EXISTS business_analytics (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  active_customers INTEGER NOT NULL DEFAULT 0,
  churn_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  repeat_visit_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  avg_visit_frequency DECIMAL(10, 2) NOT NULL DEFAULT 0,
  customer_lifetime_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  revenue_growth DECIMAL(10, 4) NOT NULL DEFAULT 0,
  avg_order_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  transactions INTEGER NOT NULL DEFAULT 0,
  redemptions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, period_type, period_start)
);

-- Program Performance
CREATE TABLE IF NOT EXISTS program_analytics (
  id SERIAL PRIMARY KEY,
  program_id VARCHAR(50) NOT NULL,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  program_name VARCHAR(100) NOT NULL,
  total_customers INTEGER NOT NULL DEFAULT 0,
  active_customers INTEGER NOT NULL DEFAULT 0,
  points_issued INTEGER NOT NULL DEFAULT 0,
  points_redeemed INTEGER NOT NULL DEFAULT 0,
  redemption_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  avg_transaction_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(program_id, period_type, period_start)
);

-- Customer Segments
CREATE TABLE IF NOT EXISTS customer_segments (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  segment_name VARCHAR(50) NOT NULL,
  segment_size INTEGER NOT NULL DEFAULT 0,
  avg_spend DECIMAL(10, 2) NOT NULL DEFAULT 0,
  visit_frequency DECIMAL(10, 2) NOT NULL DEFAULT 0,
  loyalty_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, segment_name, period_type, period_start)
);

-- Segment-Program Engagement (Intersection table)
CREATE TABLE IF NOT EXISTS segment_program_engagement (
  id SERIAL PRIMARY KEY,
  segment_id INTEGER NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  program_id VARCHAR(50) NOT NULL,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  engagement_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(segment_id, program_id, period_type, period_start)
);

-- Customer Analytics (to track individual customers)
CREATE TABLE IF NOT EXISTS customer_analytics (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  segment_id INTEGER REFERENCES customer_segments(id),
  total_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_visit_date DATE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  loyalty_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, business_id)
);

-- Top Products
CREATE TABLE IF NOT EXISTS top_products (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, product_name, period_type, period_start)
);

-- Platform Analytics
CREATE TABLE IF NOT EXISTS platform_analytics (
  id SERIAL PRIMARY KEY,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_users INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  user_growth DECIMAL(10, 4) NOT NULL DEFAULT 0,
  business_growth DECIMAL(10, 4) NOT NULL DEFAULT 0,
  program_growth DECIMAL(10, 4) NOT NULL DEFAULT 0,
  total_revenue DECIMAL(14, 2) NOT NULL DEFAULT 0,
  revenue_growth DECIMAL(10, 4) NOT NULL DEFAULT 0,
  transaction_volume INTEGER NOT NULL DEFAULT 0,
  avg_user_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(period_type, period_start)
);

-- Regional Analytics
CREATE TABLE IF NOT EXISTS regional_analytics (
  id SERIAL PRIMARY KEY,
  region VARCHAR(50) NOT NULL,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  businesses INTEGER NOT NULL DEFAULT 0,
  customers INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(14, 2) NOT NULL DEFAULT 0,
  business_growth DECIMAL(10, 4) NOT NULL DEFAULT 0,
  customer_growth DECIMAL(10, 4) NOT NULL DEFAULT 0,
  revenue_growth DECIMAL(10, 4) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(region, period_type, period_start)
);

-- Top Regional Programs
CREATE TABLE IF NOT EXISTS regional_top_programs (
  id SERIAL PRIMARY KEY,
  region VARCHAR(50) NOT NULL,
  program_id VARCHAR(50) NOT NULL,
  program_name VARCHAR(100) NOT NULL,
  customers INTEGER NOT NULL DEFAULT 0,
  revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(region, program_id, period_type, period_start)
);

-- User Engagement
CREATE TABLE IF NOT EXISTS user_engagement (
  id SERIAL PRIMARY KEY,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  daily_active_users INTEGER NOT NULL DEFAULT 0,
  monthly_active_users INTEGER NOT NULL DEFAULT 0,
  avg_session_duration INTEGER NOT NULL DEFAULT 0, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(period_type, period_start)
);

-- Feature Interactions
CREATE TABLE IF NOT EXISTS feature_interactions (
  id SERIAL PRIMARY KEY,
  feature_name VARCHAR(50) NOT NULL,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(feature_name, period_type, period_start)
);

-- Retention Data
CREATE TABLE IF NOT EXISTS retention_data (
  id SERIAL PRIMARY KEY,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
  period_start DATE NOT NULL,
  day_number INTEGER NOT NULL, -- day 0, 1, 2, etc.
  retention_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(period_type, period_start, day_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_analytics_business_id ON business_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_program_analytics_business_id ON program_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_program_analytics_program_id ON program_analytics(program_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_business_id ON customer_segments(business_id);
CREATE INDEX IF NOT EXISTS idx_top_products_business_id ON top_products(business_id);
CREATE INDEX IF NOT EXISTS idx_regional_analytics_region ON regional_analytics(region);
CREATE INDEX IF NOT EXISTS idx_regional_top_programs_region ON regional_top_programs(region);
CREATE INDEX IF NOT EXISTS idx_feature_interactions_feature ON feature_interactions(feature_name);
CREATE INDEX IF NOT EXISTS idx_segment_program_engagement_segment_id ON segment_program_engagement(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_program_engagement_program_id ON segment_program_engagement(program_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_customer_id ON customer_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_business_id ON customer_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_segment_id ON customer_analytics(segment_id); 