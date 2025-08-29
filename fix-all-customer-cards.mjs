import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

/**
 * Generates a consistent card number for a user
 * This ensures the same user always gets the same card number
 */
function generateConsistentCardNumber(userId) {
  // Convert userId to string if it's a number
  const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
  
  // Create a consistent prefix
  const prefix = 'GC';
  
  // Use the user ID as a seed for consistent generation
  const idPart = userIdStr.replace(/\D/g, ''); // Remove non-digits
  const shortId = idPart.substring(0, 6).padStart(6, '0');
  
  // Add a checksum digit (simple implementation)
  let sum = 0;
  for (let i = 0; i < shortId.length; i++) {
    sum += parseInt(shortId[i]);
  }
  const checksum = sum % 10;
  
  // Format as GC-XXXXXX-C
  return `${prefix}-${shortId}-${checksum}`;
}

/**
 * Create a digital signature for QR code data validation
 */
function createDigitalSignature(data) {
  try {
    const SECRET_KEY = process.env.QR_SECRET_KEY || 'gudcity-qr-security-key-with-additional-entropy-for-hmac-generation';
    
    // Convert data to string if it's not already
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Combine with secret key and current timestamp
    const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const signaturePayload = `${dataString}|${SECRET_KEY}|${timestamp}`;
    
    // Use a simpler hash for compatibility
    let hash = 0;
    for (let i = 0; i < signaturePayload.length; i++) {
      const char = signaturePayload.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Create a signature with the hash and timestamp for validation
    return `${hash.toString(16)}.${timestamp}`;
  } catch (error) {
    console.error('Error creating digital signature:', error);
    return '';
  }
}

/**
 * Generate a secure verification code
 */
function generateVerificationCode() {
  // Create a 6-character verification code
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusable characters
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

async function fixCustomerQrCode(customerId, customerName, customerEmail) {
  console.log(`Processing customer ID ${customerId}...`);
  
  try {
    // 1. Check if customer already has a primary QR code
    const existingQrCode = await pool.query(`
      SELECT * FROM customer_qrcodes
      WHERE customer_id = $1
      AND qr_type = 'CUSTOMER_CARD'
      AND is_primary = true
      AND status = 'ACTIVE'
    `, [customerId]);
    
    if (existingQrCode.rows.length > 0) {
      console.log(`✅ Customer ID ${customerId} already has an active primary QR code`);
      
      // Check if the QR code data has the correct structure
      let qrData;
      try {
        qrData = typeof existingQrCode.rows[0].qr_data === 'string' 
          ? JSON.parse(existingQrCode.rows[0].qr_data) 
          : existingQrCode.rows[0].qr_data;
      } catch (parseError) {
        console.error(`Error parsing QR data for customer ${customerId}:`, parseError);
        qrData = {};
      }
      
      // Check if the QR code data has the required fields
      const hasCorrectStructure = qrData && 
        qrData.type === 'customer' && 
        qrData.customerId && 
        qrData.cardNumber;
      
      if (!hasCorrectStructure) {
        console.log(`⚠️ Customer ID ${customerId}'s QR code has incorrect data structure. Fixing...`);
        
        // Update the QR code with the correct data structure
        const cardNumber = generateConsistentCardNumber(customerId);
        
        // Create the updated QR data
        const updatedQrData = {
          type: 'customer',
          customerId: customerId,
          name: customerName,
          email: customerEmail,
          cardNumber: cardNumber,
          cardType: 'STANDARD',
          timestamp: Date.now()
        };
        
        // Create a new digital signature
        const signature = createDigitalSignature(updatedQrData);
        
        // Update the QR code in the database
        await pool.query(`
          UPDATE customer_qrcodes
          SET qr_data = $1,
              digital_signature = $2,
              updated_at = NOW()
          WHERE id = $3
        `, [JSON.stringify(updatedQrData), signature, existingQrCode.rows[0].id]);
        
        console.log(`✅ Updated QR code data for customer ID ${customerId}`);
      }
    } else {
      console.log(`⚠️ Customer ID ${customerId} does not have an active primary QR code. Creating...`);
      
      // Generate a unique QR code ID (UUID)
      const qrUniqueId = uuidv4();
      
      // Generate a verification code (6 characters)
      const verificationCode = generateVerificationCode();
      
      // Generate a consistent card number
      const cardNumber = generateConsistentCardNumber(customerId);
      
      // Create the QR data
      const qrData = {
        type: 'customer',
        customerId: customerId,
        name: customerName,
        email: customerEmail,
        cardNumber: cardNumber,
        cardType: 'STANDARD',
        timestamp: Date.now()
      };
      
      // Create a digital signature
      const signature = createDigitalSignature(qrData);
      
      // Set expiry date to 1 year from now
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      // Insert the new QR code into the database
      await pool.query(`
        INSERT INTO customer_qrcodes (
          qr_unique_id,
          customer_id,
          qr_data,
          qr_type,
          status,
          verification_code,
          is_primary,
          expiry_date,
          digital_signature,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, 'CUSTOMER_CARD', 'ACTIVE', $4, true, $5, $6, NOW(), NOW()
        )
      `, [qrUniqueId, customerId, JSON.stringify(qrData), verificationCode, expiryDate, signature]);
      
      console.log(`✅ Created new primary QR code for customer ID ${customerId}`);
      
      // Set any other QR codes for this customer to non-primary
      await pool.query(`
        UPDATE customer_qrcodes
        SET is_primary = false
        WHERE customer_id = $1
        AND qr_unique_id != $2
        AND qr_type = 'CUSTOMER_CARD'
      `, [customerId, qrUniqueId]);
    }
    
    // 2. Check if customer has loyalty cards
    const loyaltyCards = await pool.query(`
      SELECT lc.*, lp.name as program_name, b.name as business_name
      FROM loyalty_cards lc
      LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
      LEFT JOIN businesses b ON lc.business_id = b.id
      WHERE lc.customer_id = $1
      AND lc.is_active = true
    `, [customerId]);
    
    if (loyaltyCards.rows.length > 0) {
      console.log(`✅ Customer ID ${customerId} has ${loyaltyCards.rows.length} active loyalty cards`);
      
      // Ensure each loyalty card has a QR code
      for (const card of loyaltyCards.rows) {
        // Check if card already has a QR code
        const cardQrCode = await pool.query(`
          SELECT * FROM customer_qrcodes
          WHERE customer_id = $1
          AND qr_type = 'LOYALTY_CARD'
          AND qr_data::text LIKE '%"cardId":' || $2 || '%'
          AND status = 'ACTIVE'
        `, [customerId, card.id]);
        
        if (cardQrCode.rows.length === 0) {
          console.log(`⚠️ Creating QR code for loyalty card ID ${card.id}`);
          
          // Generate a unique QR code ID (UUID)
          const qrUniqueId = uuidv4();
          
          // Generate a verification code (6 characters)
          const verificationCode = generateVerificationCode();
          
          // Create the QR data
          const qrData = {
            type: 'loyaltyCard',
            cardId: card.id,
            customerId: customerId,
            programId: card.program_id,
            businessId: card.business_id,
            cardNumber: generateConsistentCardNumber(customerId),
            programName: card.program_name,
            businessName: card.business_name,
            points: card.points,
            timestamp: Date.now()
          };
          
          // Create a digital signature
          const signature = createDigitalSignature(qrData);
          
          // Set expiry date to 1 year from now
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          
          // Insert the new QR code into the database
          await pool.query(`
            INSERT INTO customer_qrcodes (
              qr_unique_id,
              customer_id,
              business_id,
              qr_data,
              qr_type,
              status,
              verification_code,
              is_primary,
              expiry_date,
              digital_signature,
              created_at,
              updated_at
            ) VALUES (
              $1, $2, $3, $4, 'LOYALTY_CARD', 'ACTIVE', $5, false, $6, $7, NOW(), NOW()
            )
          `, [qrUniqueId, customerId, card.business_id, JSON.stringify(qrData), verificationCode, expiryDate, signature]);
          
          console.log(`✅ Created QR code for loyalty card ID ${card.id}`);
        } else {
          console.log(`✅ Loyalty card ID ${card.id} already has a QR code`);
        }
      }
    } else {
      console.log(`ℹ️ Customer ID ${customerId} has no active loyalty cards`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error fixing QR code for customer ID ${customerId}:`, error);
    return false;
  }
}

async function main() {
  try {
    console.log('Starting fix for all customer QR cards...');
    
    // Get all customers
    const customers = await pool.query(`
      SELECT c.id, c.name, c.email
      FROM customers c
      JOIN users u ON c.user_id = u.id
      WHERE u.status = 'active'
    `);
    
    console.log(`Found ${customers.rows.length} active customers`);
    
    // Process each customer
    let successCount = 0;
    let failCount = 0;
    
    for (const customer of customers.rows) {
      const success = await fixCustomerQrCode(customer.id, customer.name, customer.email);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log('\nFix completed:');
    console.log(`✅ Successfully processed ${successCount} customers`);
    if (failCount > 0) {
      console.log(`❌ Failed to process ${failCount} customers`);
    }
  } catch (error) {
    console.error('Error fixing customer QR cards:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 