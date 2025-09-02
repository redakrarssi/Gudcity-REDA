-- Customer Database Schema

-- Check if the customers table exists, create if not
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  tier VARCHAR(50) DEFAULT 'Bronze',
  loyalty_points INTEGER DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0,
  visits INTEGER DEFAULT 0,
  birthday DATE,
  last_visit TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);

-- Check if the customer_favorite_items table exists, create if not
CREATE TABLE IF NOT EXISTS customer_favorite_items (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_customer_favorite_items_customer_id ON customer_favorite_items(customer_id);

-- Check if the customer_interactions table exists, create if not
CREATE TABLE IF NOT EXISTS customer_interactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  business_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- MESSAGE, GIFT, BIRTHDAY_WISH, etc.
  message TEXT,
  happened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_id ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_business_id ON customer_interactions(business_id); 