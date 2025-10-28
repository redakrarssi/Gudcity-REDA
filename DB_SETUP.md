# Neon Database Setup for Gudcity Loyalty Platform

This guide explains how to set up and connect your Vite React application to a Neon PostgreSQL database.

## 1. Create a Neon Account and Project

1. Go to [Neon](https://neon.tech) and sign up for an account
2. Create a new project (use `gudcity_loyalty_db` as the database name)
3. Once your project is created, go to the "Connection Details" section
4. Copy your connection string (it should look like `postgres://user:password@endpoint.neon.tech/gudcity_loyalty_db`)

## 2. Set Up Environment Variables

Create a `.env.local` file in the root of your project with the following content:

```
VITE_DATABASE_URL=postgres://user:password@endpoint.neon.tech/gudcity_loyalty_db
```

Replace the connection string with the one you copied from Neon.

## 3. Initialize the Database Schema

1. Go to the SQL Editor in your Neon dashboard
2. Copy the contents of the `db/schema.sql` file from this project
3. Paste the SQL into the editor and run the query to create the necessary tables

## 4. Run the Application

1. Install dependencies if you haven't already:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Navigate to the Users management page to test the database connection

## Important Files

- `src/utils/db.ts` - The database connection utility
- `src/services/userService.ts` - Functions for interacting with the users table
- `src/components/UserForm.tsx` - Form for adding new users
- `src/components/UserList.tsx` - Component for displaying users
- `src/pages/admin/Users.tsx` - Page that combines the form and list components

## Troubleshooting

- If you see "DATABASE_URL is not defined" error, make sure your `.env.local` file is set up correctly
- If you have connection issues, verify that your connection string is correct and that your IP is allowed in Neon's connection pooling settings
- For development, make sure you're using Neon's connection pooling option to avoid SSL certificate issues

## Security Notes

- Never commit your `.env.local` file to version control
- For production, consider using environment variables through your hosting platform (like Vercel)
- Use proper authentication and authorization in your application to secure access to your data 