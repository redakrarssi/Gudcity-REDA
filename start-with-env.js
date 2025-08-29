import { spawn } from 'child_process';
import fs from 'fs';

// First, ensure we have .env.local with correct content
const envContent = 'VITE_DATABASE_URL=process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || ""';
fs.writeFileSync('.env.local', envContent);
console.log('.env.local file created/updated successfully!');

// Now start the Vite server with the environment variable
console.log('Starting Vite dev server...');
console.log('You can access the application at http://localhost:5173 (or another port if 5173 is in use)');

const env = {
  ...process.env,
  VITE_DATABASE_URL: 'process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || ""'
};

// Start the npm run dev command with the environment variable
const devProcess = spawn('npm', ['run', 'dev'], { 
  env,
  stdio: 'inherit',
  shell: true
});

devProcess.on('error', (error) => {
  console.error('Failed to start dev server:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  devProcess.kill('SIGINT');
  process.exit(0);
}); 