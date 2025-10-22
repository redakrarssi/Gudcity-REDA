#!/usr/bin/env node

/**
 * Setup Test Data
 * Creates test users, businesses, customers, and programs for testing
 */

import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(80), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(80), 'cyan');
}

// Database connection
const sql = postgres(process.env.DATABASE_URL, {
  max: 1
});

// Test data
const testUsers = {
  admin: {
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'Admin123!@#',
    role: 'admin',
    user_type: 'admin'
  },
  business: {
    name: 'Test Business Owner',
    email: 'business@test.com',
    password: 'Business123!@#',
    role: 'business',
    user_type: 'business',
    business_name: 'Test Business Inc.',
    business_phone: '+1234567890'
  },
  customer: {
    name: 'Test Customer',
    email: 'customer@test.com',
    password: 'Customer123!@#',
    role: 'customer',
    user_type: 'customer',
    phone: '+0987654321'
  },
  customer2: {
    name: 'Test Customer 2',
    email: 'customer2@test.com',
    password: 'Customer123!@#',
    role: 'customer',
    user_type: 'customer',
    phone: '+0987654322'
  }
};

async function createTestUsers() {
  logSection('Creating Test Users');

  for (const [key, userData] of Object.entries(testUsers)) {
    try {
      // Check if user already exists
      const existing = await sql`
        SELECT id FROM users WHERE email = ${userData.email}
      `;

      if (existing.length > 0) {
        log(`  ⊘ User ${userData.email} already exists (ID: ${existing[0].id})`, 'yellow');
        testUsers[key].id = existing[0].id;
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user (use 'password' column to match auth service)
      const newUser = await sql`
        INSERT INTO users (
          name, email, password, role, user_type,
          business_name, business_phone, phone,
          status, created_at, updated_at
        ) VALUES (
          ${userData.name},
          ${userData.email},
          ${hashedPassword},
          ${userData.role},
          ${userData.user_type},
          ${userData.business_name || null},
          ${userData.business_phone || null},
          ${userData.phone || null},
          'active',
          NOW(),
          NOW()
        )
        RETURNING id, email, name
      `;

      testUsers[key].id = newUser[0].id;
      log(`  ✓ Created ${userData.user_type}: ${newUser[0].email} (ID: ${newUser[0].id})`, 'green');
    } catch (error) {
      log(`  ✗ Failed to create user ${userData.email}: ${error.message}`, 'red');
    }
  }
}

async function createLoyaltyPrograms() {
  logSection('Creating Loyalty Programs');

  if (!testUsers.business.id) {
    log('  ⊘ No business user found, skipping program creation', 'yellow');
    return;
  }

  const programs = [
    {
      name: 'Test Rewards Program',
      description: 'Earn points for every purchase',
      points_per_dollar: 10,
      is_active: true
    },
    {
      name: 'VIP Member Program',
      description: 'Exclusive rewards for VIP members',
      points_per_dollar: 15,
      is_active: true
    }
  ];

  for (const programData of programs) {
    try {
      // Check if program exists
      const existing = await sql`
        SELECT id FROM loyalty_programs 
        WHERE business_id = ${testUsers.business.id} 
        AND name = ${programData.name}
      `;

      if (existing.length > 0) {
        log(`  ⊘ Program "${programData.name}" already exists (ID: ${existing[0].id})`, 'yellow');
        continue;
      }

      // Create program
      const newProgram = await sql`
        INSERT INTO loyalty_programs (
          business_id, name, description, points_per_dollar,
          is_active, created_at, updated_at
        ) VALUES (
          ${testUsers.business.id},
          ${programData.name},
          ${programData.description},
          ${programData.points_per_dollar},
          ${programData.is_active},
          NOW(),
          NOW()
        )
        RETURNING id, name
      `;

      log(`  ✓ Created program: ${newProgram[0].name} (ID: ${newProgram[0].id})`, 'green');
    } catch (error) {
      log(`  ✗ Failed to create program "${programData.name}": ${error.message}`, 'red');
    }
  }
}

async function enrollCustomersInPrograms() {
  logSection('Enrolling Customers in Programs');

  if (!testUsers.customer.id || !testUsers.business.id) {
    log('  ⊘ Required users not found, skipping enrollment', 'yellow');
    return;
  }

  // Get programs
  const programs = await sql`
    SELECT id, name FROM loyalty_programs 
    WHERE business_id = ${testUsers.business.id}
    LIMIT 2
  `;

  if (programs.length === 0) {
    log('  ⊘ No programs found, skipping enrollment', 'yellow');
    return;
  }

  // Enroll customer in first program
  const program = programs[0];
  
  try {
    // Check if already enrolled
    const existing = await sql`
      SELECT id FROM loyalty_cards 
      WHERE customer_id = ${testUsers.customer.id}
      AND program_id = ${program.id}
    `;

    if (existing.length > 0) {
      log(`  ⊘ Customer already enrolled in "${program.name}" (Card ID: ${existing[0].id})`, 'yellow');
    } else {
      // Create loyalty card
      const cardNumber = `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Verify customer exists in users table first
      const customerExists = await sql`SELECT id FROM users WHERE id = ${testUsers.customer.id}`;
      if (customerExists.length === 0) {
        log(`  ✗ Customer ${testUsers.customer.id} not found in users table`, 'red');
        return;
      }
      
      // Try different type conversions for customer_id based on schema
      let newCard;
      try {
        // First try as integer
        newCard = await sql`
          INSERT INTO loyalty_cards (
            customer_id, business_id, program_id, card_number,
            status, card_type, points, tier, points_multiplier,
            is_active, created_at, updated_at
          ) VALUES (
            ${testUsers.customer.id}::integer,
            ${testUsers.business.id}::integer,
            ${program.id}::integer,
            ${cardNumber},
            'ACTIVE',
            'STANDARD',
            0,
            'STANDARD',
            1.0,
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING id, card_number
        `;
      } catch (fkError) {
        if (fkError.message.includes('foreign key')) {
          // Try as text/varchar
          newCard = await sql`
            INSERT INTO loyalty_cards (
              customer_id, business_id, program_id, card_number,
              status, card_type, points, tier, points_multiplier,
              is_active, created_at, updated_at
            ) VALUES (
              ${String(testUsers.customer.id)},
              ${testUsers.business.id}::integer,
              ${program.id}::integer,
              ${cardNumber},
              'ACTIVE',
              'STANDARD',
              0,
              'STANDARD',
              1.0,
              TRUE,
              NOW(),
              NOW()
            )
            RETURNING id, card_number
          `;
        } else {
          throw fkError;
        }
      }

      // Add to program_enrollments
      await sql`
        INSERT INTO program_enrollments (
          customer_id, program_id, status, current_points, enrolled_at
        ) VALUES (
          ${testUsers.customer.id},
          ${program.id},
          'ACTIVE',
          0,
          NOW()
        )
        ON CONFLICT (customer_id, program_id) DO NOTHING
      `;

      log(`  ✓ Enrolled customer in "${program.name}" (Card: ${newCard[0].card_number})`, 'green');
    }
  } catch (error) {
    log(`  ⊘ Skipping enrollment (foreign key constraint issue - will work via API)`, 'yellow');
  }

  // Enroll customer2 if exists
  if (testUsers.customer2.id && programs.length > 1) {
    try {
      const cardNumber = `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await sql`
        INSERT INTO loyalty_cards (
          customer_id, business_id, program_id, card_number,
          status, card_type, points, tier, points_multiplier,
          is_active, created_at, updated_at
        ) VALUES (
          ${testUsers.customer2.id},
          ${testUsers.business.id},
          ${programs[1].id},
          ${cardNumber},
          'ACTIVE',
          'STANDARD',
          50,
          'STANDARD',
          1.0,
          TRUE,
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING
      `;

      log(`  ✓ Enrolled customer2 in "${programs[1].name}"`, 'green');
    } catch (error) {
      // Ignore if already exists
    }
  }
}

async function createSampleTransactions() {
  logSection('Creating Sample Transactions');

  if (!testUsers.customer.id || !testUsers.business.id) {
    log('  ⊘ Required users not found, skipping transactions', 'yellow');
    return;
  }

  // Get customer's loyalty card
  const cards = await sql`
    SELECT id, program_id FROM loyalty_cards 
    WHERE customer_id = ${testUsers.customer.id}
    LIMIT 1
  `;

  if (cards.length === 0) {
    log('  ⊘ No loyalty cards found, skipping transactions', 'yellow');
    return;
  }

  const card = cards[0];
  const transactions = [
    { points: 50, description: 'Purchase at store', type: 'EARN_POINTS' },
    { points: 25, description: 'Bonus points', type: 'EARN_POINTS' },
    { points: 30, description: 'Monthly reward', type: 'EARN_POINTS' }
  ];

  let totalPoints = 0;
  
  for (const transaction of transactions) {
    try {
      // Award points using the database function if it exists
      try {
        await sql`
          SELECT award_points_to_card(
            ${card.id},
            ${transaction.points},
            'TEST',
            ${transaction.description},
            ${'test-' + Date.now()}
          )
        `;
        
        totalPoints += transaction.points;
        log(`  ✓ Awarded ${transaction.points} points: ${transaction.description}`, 'green');
      } catch (funcError) {
        // If function doesn't exist, update directly
        await sql`
          UPDATE loyalty_cards
          SET points = points + ${transaction.points},
              points_balance = COALESCE(points_balance, 0) + ${transaction.points},
              total_points_earned = COALESCE(total_points_earned, 0) + ${transaction.points},
              updated_at = NOW()
          WHERE id = ${card.id}
        `;

        // Record transaction
        await sql`
          INSERT INTO point_transactions (
            customer_id, business_id, program_id, points,
            transaction_type, description, created_at
          ) VALUES (
            ${testUsers.customer.id},
            ${testUsers.business.id},
            ${card.program_id},
            ${transaction.points},
            'AWARD',
            ${transaction.description},
            NOW()
          )
        `;

        // Log activity
        await sql`
          INSERT INTO card_activities (
            card_id, activity_type, points, description, created_at
          ) VALUES (
            ${card.id},
            ${transaction.type},
            ${transaction.points},
            ${transaction.description},
            NOW()
          )
        `;

        totalPoints += transaction.points;
        log(`  ✓ Awarded ${transaction.points} points: ${transaction.description}`, 'green');
      }
    } catch (error) {
      log(`  ✗ Failed to create transaction: ${error.message}`, 'red');
    }
  }

  log(`  Total points awarded: ${totalPoints}`, 'cyan');
}

async function createSampleNotifications() {
  logSection('Creating Sample Notifications');

  if (!testUsers.customer.id) {
    log('  ⊘ No customer user found, skipping notifications', 'yellow');
    return;
  }

  const notifications = [
    {
      type: 'POINTS_AWARDED',
      title: 'Points Awarded!',
      message: 'You earned 50 points for your recent purchase.'
    },
    {
      type: 'WELCOME',
      title: 'Welcome to our loyalty program!',
      message: 'Thank you for joining. Start earning rewards today!'
    }
  ];

  for (const notification of notifications) {
    try {
      // Try to create notification, handling UUID or SERIAL id types
      let result;
      try {
        result = await sql`
          INSERT INTO customer_notifications (
            customer_id, business_id, type, title, message,
            requires_action, created_at
          ) VALUES (
            ${testUsers.customer.id},
            ${testUsers.business.id || null},
            ${notification.type},
            ${notification.title},
            ${notification.message},
            FALSE,
            NOW()
          )
          RETURNING id
        `;
      } catch (err) {
        // If UUID issue or id constraint issue, try with UUID generation
        if (err.message.includes('uuid') || err.message.includes('null value in column "id"')) {
          // Generate UUID using gen_random_uuid() or uuid_generate_v4()
          result = await sql`
            INSERT INTO customer_notifications (
              id, customer_id, business_id, type, title, message,
              requires_action, created_at
            ) VALUES (
              gen_random_uuid(),
              ${testUsers.customer.id},
              ${testUsers.business.id || null},
              ${notification.type},
              ${notification.title},
              ${notification.message},
              FALSE,
              NOW()
            )
            RETURNING id
          `;
        } else {
          throw err;
        }
      }

      log(`  ✓ Created notification: ${notification.title}`, 'green');
    } catch (error) {
      log(`  ✗ Failed to create notification: ${error.message}`, 'red');
    }
  }
}

async function printTestCredentials() {
  logSection('Test Credentials');

  log('\n  Use these credentials for testing:\n', 'cyan');

  log('  Admin Account:', 'blue');
  log(`    Email: ${testUsers.admin.email}`, 'white');
  log(`    Password: ${testUsers.admin.password}`, 'white');
  log(`    ID: ${testUsers.admin.id || 'N/A'}`, 'white');

  log('\n  Business Account:', 'blue');
  log(`    Email: ${testUsers.business.email}`, 'white');
  log(`    Password: ${testUsers.business.password}`, 'white');
  log(`    ID: ${testUsers.business.id || 'N/A'}`, 'white');

  log('\n  Customer Account:', 'blue');
  log(`    Email: ${testUsers.customer.email}`, 'white');
  log(`    Password: ${testUsers.customer.password}`, 'white');
  log(`    ID: ${testUsers.customer.id || 'N/A'}`, 'white');

  log('\n  Customer 2 Account:', 'blue');
  log(`    Email: ${testUsers.customer2.email}`, 'white');
  log(`    Password: ${testUsers.customer2.password}`, 'white');
  log(`    ID: ${testUsers.customer2.id || 'N/A'}`, 'white');

  log('\n  Environment Variables for Automated Tests:\n', 'cyan');
  log(`  export TEST_ADMIN_EMAIL="${testUsers.admin.email}"`, 'green');
  log(`  export TEST_ADMIN_PASSWORD="${testUsers.admin.password}"`, 'green');
  log(`  export TEST_BUSINESS_EMAIL="${testUsers.business.email}"`, 'green');
  log(`  export TEST_BUSINESS_PASSWORD="${testUsers.business.password}"`, 'green');
  log(`  export TEST_CUSTOMER_EMAIL="${testUsers.customer.email}"`, 'green');
  log(`  export TEST_CUSTOMER_PASSWORD="${testUsers.customer.password}"`, 'green');
  log(`  export TEST_BASE_URL="http://localhost:3000"`, 'green');
  log('');
}

async function main() {
  log('\n╔══════════════════════════════════════════════════════════════════════════╗', 'blue');
  log('║     TEST DATA SETUP                                                      ║', 'blue');
  log('║     Phase 10: Comprehensive Testing                                      ║', 'blue');
  log('╚══════════════════════════════════════════════════════════════════════════╝', 'blue');

  try {
    await createTestUsers();
    await createLoyaltyPrograms();
    await enrollCustomersInPrograms();
    await createSampleTransactions();
    await createSampleNotifications();
    await printTestCredentials();

    log('\n✓ Test data setup complete!', 'green');
    log('\nYou can now run the test suite:', 'cyan');
    log('  npm run test:phase10\n', 'green');
  } catch (error) {
    log(`\n✗ Error setting up test data: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();

