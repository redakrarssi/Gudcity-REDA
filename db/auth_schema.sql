-- Add authentication fields to the users table

-- Check if password column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password'
  ) THEN
    ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';
  END IF;
END
$$;

-- Check if role column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'customer';
  END IF;
END
$$;

-- Check if user_type column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE users ADD COLUMN user_type VARCHAR(50) NOT NULL DEFAULT 'customer';
  END IF;
END
$$;

-- Check if business_name column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE users ADD COLUMN business_name VARCHAR(255);
  END IF;
END
$$;

-- Check if business_phone column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'business_phone'
  ) THEN
    ALTER TABLE users ADD COLUMN business_phone VARCHAR(50);
  END IF;
END
$$;

-- Check if avatar_url column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);
  END IF;
END
$$;

-- Check if reset_token column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'reset_token'
  ) THEN
    ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
  END IF;
END
$$;

-- Check if reset_token_expires column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'reset_token_expires'
  ) THEN
    ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP WITH TIME ZONE;
  END IF;
END
$$;

-- Check if last_login column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
  END IF;
END
$$; 