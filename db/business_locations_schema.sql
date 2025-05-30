-- Business Locations Database Schema

-- Check if the business_locations table exists, create if not
CREATE TABLE IF NOT EXISTS business_locations (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zip VARCHAR(20),
  country VARCHAR(100),
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  website_url VARCHAR(255),
  
  -- Opening hours as JSON
  opening_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "thursday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "friday": {"open": "09:00", "close": "17:00", "isClosed": false},
    "saturday": {"open": "10:00", "close": "14:00", "isClosed": false},
    "sunday": {"open": "00:00", "close": "00:00", "isClosed": true}
  }',
  
  is_active BOOLEAN DEFAULT TRUE,
  is_main_location BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_business_locations_business_id ON business_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_locations_location ON business_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_business_locations_city ON business_locations(city);
CREATE INDEX IF NOT EXISTS idx_business_locations_is_active ON business_locations(is_active);

-- Sample data for testing
INSERT INTO business_locations (
  business_id, 
  name, 
  address_line1, 
  city, 
  state, 
  zip, 
  country, 
  latitude, 
  longitude,
  phone,
  is_active,
  is_main_location
)
VALUES
  (1, 'Coffee Haven - Downtown', '123 Main St', 'Seattle', 'WA', '98101', 'USA', 47.608013, -122.335167, '+1-555-123-4567', TRUE, TRUE),
  (2, 'Tech Gadgets - Central', '456 Market St', 'San Francisco', 'CA', '94105', 'USA', 37.7749, -122.4194, '+1-555-234-5678', TRUE, TRUE),
  (3, 'Fitness Zone - West', '789 Gym Ave', 'Los Angeles', 'CA', '90001', 'USA', 34.052235, -118.243683, '+1-555-345-6789', TRUE, TRUE),
  (4, 'Sweet Bakery', '101 Sugar St', 'Portland', 'OR', '97201', 'USA', 45.5051, -122.6750, '+1-555-456-7890', TRUE, TRUE),
  (5, 'Bookworm Paradise', '202 Read Blvd', 'Chicago', 'IL', '60601', 'USA', 41.8781, -87.6298, '+1-555-567-8901', TRUE, TRUE),
  (1, 'Coffee Haven - Eastside', '789 Lake Ave', 'Seattle', 'WA', '98102', 'USA', 47.620013, -122.305167, '+1-555-987-6543', TRUE, FALSE); 