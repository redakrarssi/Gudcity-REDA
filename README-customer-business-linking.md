# Customer-Business Linking Fix

This document outlines the steps to fix the customer-business linking issues in the loyalty app.

## Overview of the Solution

We've created several files to fix the customer-business relationship in your loyalty app:

1. `fix-customer-business-linking.mjs` - Script to link existing customers with businesses
2. `setup-customer-business-schema.mjs` - Script to set up or fix the database schema
3. `src/components/business/CustomerBusinessLinker.tsx` - UI component for linking customers with businesses
4. Updated `src/services/customerService.ts` - Improved customer service with business relationship methods

## Database Relationship

The customer-business relationship is a many-to-many relationship implemented through:

- `program_enrollments` table - Connects customers to loyalty programs (which belong to businesses)
- `loyalty_transactions` table - Records transactions between customers and businesses
- `loyalty_cards` table - Stores loyalty cards that connect customers with businesses

## Steps to Fix the Issue

### 1. Set up proper database schema

```bash
node setup-customer-business-schema.mjs
```

This script will:
- Check if all required tables exist and create them if needed
- Verify column data types and constraints
- Add necessary indices for performance

### 2. Link existing customers with businesses

```bash
node fix-customer-business-linking.mjs
```

This script will:
- Find all businesses in the system
- For each business, find or create a loyalty program
- Link all customers to each business through program enrollments
- Create initial loyalty transactions to establish the relationship
- Set up loyalty cards for each customer-business pair

### 3. UI Integration

After running the scripts, the updated UI components will:
- Show all customers linked to a business in the Customers page
- Provide a "Link Customers" button to manually associate new customers
- Correctly display customer loyalty information specific to each business

## Verification

To verify the fix worked:

1. Log in as a business user
2. Navigate to the Customers page
3. Check that customers are displayed correctly
4. Use the "Link Customers" button to add more customers
5. Verify that newly linked customers appear in the list

If you encounter any issues, check the console logs for error messages. 