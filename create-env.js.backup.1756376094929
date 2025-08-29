import fs from 'fs';

const envContent = `# Database configuration
VITE_DATABASE_URL=postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Security
JWT_SECRET=your-jwt-secret-key-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-here
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Application
NODE_ENV=development
PORT=3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
APP_URL=http://localhost:5173

# Email (for user verification)
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=`;

fs.writeFileSync('.env', envContent);
console.log('.env file created successfully!');

// Also create .env.example file
const exampleContent = `# Database configuration
DATABASE_URL=postgres://username:password@hostname:port/database?sslmode=require

# Security
JWT_SECRET=your-jwt-secret-key-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-here
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Application
NODE_ENV=development
PORT=3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
APP_URL=http://localhost:5173

# Email (for user verification)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=user@example.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=noreply@example.com`;

fs.writeFileSync('.env.example', exampleContent);
console.log('.env.example file created successfully!');

// Create .env.local file explicitly for Vite
const localEnvContent = `VITE_DATABASE_URL=postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`;

fs.writeFileSync('.env.local', localEnvContent);
console.log('.env.local file created successfully!'); 