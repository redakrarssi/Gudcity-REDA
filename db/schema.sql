-- Database schema for Gudcity Loyalty Platform

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  author VARCHAR(100) DEFAULT 'Anonymous',
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Sample data (uncomment to use)
-- INSERT INTO users (name, email) VALUES 
--   ('John Doe', 'john@example.com'),
--   ('Jane Smith', 'jane@example.com'),
--   ('Bob Johnson', 'bob@example.com');

-- Sample comments (uncomment to use)
-- INSERT INTO comments (content) VALUES
--   ('This is a great feature!'),
--   ('I love using this platform.'),
--   ('When will mobile support be available?'); 