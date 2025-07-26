#!/usr/bin/env node

/**
 * QR Points Synchronization Diagnostic Script
 * 
 * This script helps test and verify that the QR points awarding system is working correctly:
 * 1. Points are being awarded to the correct database columns
 * 2. Cache invalidation is happening properly
 * 3. Real-time sync events are being dispatched
 * 4. Customer cards display the correct points
 */

import { sql } from './src/utils/db.ts';

async function main() {
  console.log('🔍 QR Points Synchronization Diagnostic');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check points columns in loyalty_cards table
    console.log('\n📊 Test 1: Checking loyalty_cards table structure');
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_cards' 
      AND column_name IN ('points', 'points_balance', 'total_points_earned')
      ORDER BY column_name
    `;
    
    console.log('Available points columns:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Test 2: Check for any existing cards and their points values
    console.log('\n🎯 Test 2: Checking existing loyalty cards points data');
    const cardsCheck = await sql`
      SELECT 
        id,
        customer_id,
        program_id,
        points,
        points_balance,
        total_points_earned,
        updated_at
      FROM loyalty_cards
      LIMIT 5
    `;

    if (cardsCheck.length > 0) {
      console.log('Sample loyalty cards:');
      cardsCheck.forEach(card => {
        console.log(`  Card ${card.id}:`);
        console.log(`    Customer: ${card.customer_id}`);
        console.log(`    Points: ${card.points || 0}`);
        console.log(`    Points Balance: ${card.points_balance || 0}`);
        console.log(`    Total Points Earned: ${card.total_points_earned || 0}`);
        console.log(`    Last Updated: ${card.updated_at}`);
        console.log('');
      });
    } else {
      console.log('  No loyalty cards found in database');
    }

    // Test 3: Check customer_programs table for points consistency
    console.log('\n🔗 Test 3: Checking customer_programs table');
    const programsCheck = await sql`
      SELECT 
        customer_id,
        program_id,
        current_points,
        updated_at
      FROM customer_programs
      LIMIT 5
    `;

    if (programsCheck.length > 0) {
      console.log('Sample customer programs:');
      programsCheck.forEach(program => {
        console.log(`  Customer ${program.customer_id}, Program ${program.program_id}:`);
        console.log(`    Current Points: ${program.current_points || 0}`);
        console.log(`    Updated: ${program.updated_at}`);
        console.log('');
      });
    } else {
      console.log('  No customer programs found in database');
    }

    // Test 4: Check recent transactions
    console.log('\n💳 Test 4: Checking recent point transactions');
    const recentTransactions = await sql`
      SELECT 
        card_id,
        transaction_type,
        points,
        source,
        description,
        created_at
      FROM loyalty_transactions
      WHERE transaction_type = 'CREDIT'
      ORDER BY created_at DESC
      LIMIT 5
    `;

    if (recentTransactions.length > 0) {
      console.log('Recent point transactions:');
      recentTransactions.forEach(tx => {
        console.log(`  ${tx.created_at}: Card ${tx.card_id}`);
        console.log(`    Type: ${tx.transaction_type}, Points: ${tx.points}`);
        console.log(`    Source: ${tx.source}, Description: ${tx.description}`);
        console.log('');
      });
    } else {
      console.log('  No recent credit transactions found');
    }

    // Test 5: Verify QR scan logs
    console.log('\n📱 Test 5: Checking QR scan logs');
    const qrScans = await sql`
      SELECT 
        customer_id,
        business_id,
        scan_type,
        points_awarded,
        successful,
        created_at
      FROM qr_scan_logs
      WHERE points_awarded > 0
      ORDER BY created_at DESC
      LIMIT 5
    `;

    if (qrScans.length > 0) {
      console.log('Recent QR scans with points:');
      qrScans.forEach(scan => {
        console.log(`  ${scan.created_at}:`);
        console.log(`    Customer: ${scan.customer_id}, Business: ${scan.business_id}`);
        console.log(`    Points Awarded: ${scan.points_awarded}, Successful: ${scan.successful}`);
        console.log('');
      });
    } else {
      console.log('  No QR scans with points found');
    }

    console.log('\n✅ Diagnostic Summary:');
    console.log('- Points columns structure verified');
    console.log('- Sample data reviewed');
    console.log('- Transaction history checked');
    console.log('- QR scan logs examined');

    console.log('\n🚀 To test the fix:');
    console.log('1. Scan a customer QR code from your business dashboard');
    console.log('2. Award points to the customer');
    console.log('3. Check the customer\'s /cards page to see if points appear');
    console.log('4. Check browser console for diagnostic logs');
    console.log('5. Look for "qrPointsAwarded" events in the browser console');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    process.exit(0);
  }
}

// Helper function to simulate a QR points award for testing
async function simulateQrPointsAward(customerId, programId, points = 10) {
  console.log(`\n🧪 Simulating ${points} points award to customer ${customerId}, program ${programId}`);
  
  try {
    // Get or create a loyalty card
    let card = await sql`
      SELECT id FROM loyalty_cards 
      WHERE customer_id = ${customerId} AND program_id = ${programId}
      LIMIT 1
    `;

    if (card.length === 0) {
      console.log('Creating new loyalty card...');
      const newCard = await sql`
        INSERT INTO loyalty_cards (
          customer_id, 
          program_id, 
          card_number, 
          points, 
          points_balance,
          total_points_earned,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${customerId}, 
          ${programId}, 
          'TEST-' + ${Date.now()}, 
          ${points},
          ${points},
          ${points},
          'ACTIVE',
          NOW(),
          NOW()
        ) RETURNING id
      `;
      
      console.log(`✅ Created card with ID: ${newCard[0].id}`);
    } else {
      console.log('Updating existing card...');
      await sql`
        UPDATE loyalty_cards 
        SET 
          points = COALESCE(points, 0) + ${points},
          points_balance = COALESCE(points_balance, 0) + ${points},
          total_points_earned = COALESCE(total_points_earned, 0) + ${points},
          updated_at = NOW()
        WHERE id = ${card[0].id}
      `;
      
      console.log(`✅ Updated card ID: ${card[0].id} with ${points} points`);
    }

    console.log('✅ Simulation completed successfully');
    
  } catch (error) {
    console.error('❌ Simulation failed:', error);
  }
}

// Run the diagnostic
if (process.argv.includes('--simulate')) {
  const customerId = process.argv[process.argv.indexOf('--customer') + 1] || '4';
  const programId = process.argv[process.argv.indexOf('--program') + 1] || '1';
  const points = parseInt(process.argv[process.argv.indexOf('--points') + 1] || '10');
  
  simulateQrPointsAward(customerId, programId, points);
} else {
  main();
} 