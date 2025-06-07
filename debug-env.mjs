import { config } from 'dotenv';
import fs from 'fs';

// Load environment variables from .env and .env.local
config();
config({ path: '.env.local' });

console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('VITE_DATABASE_URL:', process.env.VITE_DATABASE_URL);

// Check if files exist
console.log('\nFile existence:');
console.log('.env exists:', fs.existsSync('.env'));
console.log('.env.local exists:', fs.existsSync('.env.local'));

// Print file contents if they exist
if (fs.existsSync('.env')) {
  console.log('\n.env contents:');
  console.log(fs.readFileSync('.env', 'utf8'));
}

if (fs.existsSync('.env.local')) {
  console.log('\n.env.local contents:');
  console.log(fs.readFileSync('.env.local', 'utf8'));
} 