-- Customer Settings Update Schema

-- Add notification_preferences column to customers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE customers ADD COLUMN notification_preferences JSONB DEFAULT '{
      "email": true,
      "push": true,
      "sms": false,
      "promotions": true,
      "rewards": true,
      "system": true
    }';
  END IF;
END
$$;

-- Add regional_settings column to customers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'regional_settings'
  ) THEN
    ALTER TABLE customers ADD COLUMN regional_settings JSONB DEFAULT '{
      "language": "en",
      "country": "United States",
      "currency": "USD",
      "timezone": "UTC"
    }';
  END IF;
END
$$; 