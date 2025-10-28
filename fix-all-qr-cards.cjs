// Import required modules
const { Pool } = require('@neondatabase/serverless');
const { v4: uuidv4 } = require('uuid');

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}


// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DATABASE_URL,
  ssl: true
});

/**
 * Generates a consistent card number for a user
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

/**
 * Generate a QR code image URL
 * This is a simple implementation that returns a data URL
 */
async function generateQrCodeImage(data) {
  try {
    // Import QRCode dynamically
    const QRCode = require('qrcode');
    
    // Convert data to string if it's not already
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Generate QR code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(dataString, {
      width: 300,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code image:', error);
    return null;
  }
}

/**
 * Fix a customer's QR card
 */
async function fixCustomerQrCard(customerId, customerName, customerEmail) {
  console.log(`Processing customer ID ${customerId}...`);
  
  try {
    // Generate a consistent card number
    const cardNumber = generateConsistentCardNumber(customerId);
    
    // Create the QR data with the correct structure
    const qrData = {
      type: 'customer',
      customerId: customerId,
      name: customerName,
      email: customerEmail,
      cardNumber: cardNumber,
      cardType: 'STANDARD',
      timestamp: Date.now()
    };
    
    // Generate QR code image
    const qrImageUrl = await generateQrCodeImage(qrData);
    
    if (!qrImageUrl) {
      throw new Error('Failed to generate QR code image');
    }
    
    // Create a digital signature
    const signature = createDigitalSignature(qrData);
    
    // Check if customer already has a primary QR code
    const existingQrCode = await pool.query(`
      SELECT * FROM customer_qrcodes
      WHERE customer_id = $1
      AND qr_type = 'CUSTOMER_CARD'
      AND is_primary = true
    `, [customerId]);
    
    if (existingQrCode.rows.length > 0) {
      // Update the existing QR code
      await pool.query(`
        UPDATE customer_qrcodes
        SET qr_data = $1,
            qr_image_url = $2,
            digital_signature = $3,
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE id = $4
      `, [JSON.stringify(qrData), qrImageUrl, signature, existingQrCode.rows[0].id]);
      
      console.log(`✅ Updated QR code for customer ID ${customerId}`);
    } else {
      // Generate a unique QR code ID (UUID)
      const qrUniqueId = uuidv4();
      
      // Generate a verification code (6 characters)
      const verificationCode = generateVerificationCode();
      
      // Set expiry date to 1 year from now
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      
      // Insert a new QR code
      await pool.query(`
        INSERT INTO customer_qrcodes (
          qr_unique_id,
          customer_id,
          qr_data,
          qr_image_url,
          qr_type,
          status,
          verification_code,
          is_primary,
          expiry_date,
          digital_signature,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, 'CUSTOMER_CARD', 'ACTIVE', $5, true, $6, $7, NOW(), NOW()
        )
      `, [qrUniqueId, customerId, JSON.stringify(qrData), qrImageUrl, verificationCode, expiryDate, signature]);
      
      console.log(`✅ Created new QR code for customer ID ${customerId}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error fixing QR card for customer ${customerId}:`, error);
    return false;
  }
}

/**
 * Fix all loyalty cards for a customer
 */
async function fixCustomerLoyaltyCards(customerId) {
  try {
    // Get all loyalty cards for the customer
    const loyaltyCards = await pool.query(`
      SELECT lc.*, lp.name as program_name, b.name as business_name
      FROM loyalty_cards lc
      LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
      LEFT JOIN businesses b ON lc.business_id = b.id
      WHERE lc.customer_id = $1
      AND lc.is_active = true
    `, [customerId]);
    
    if (loyaltyCards.rows.length === 0) {
      console.log(`No active loyalty cards found for customer ID ${customerId}`);
      return true;
    }
    
    console.log(`Found ${loyaltyCards.rows.length} active loyalty cards for customer ID ${customerId}`);
    
    // Fix each loyalty card
    for (const card of loyaltyCards.rows) {
      // Generate a consistent card number
      const cardNumber = generateConsistentCardNumber(customerId);
      
      // Create the QR data with the correct structure
      const qrData = {
        type: 'loyaltyCard',
        cardId: card.id,
        customerId: customerId,
        programId: card.program_id,
        businessId: card.business_id,
        cardNumber: cardNumber,
        programName: card.program_name,
        businessName: card.business_name,
        points: card.points || 0,
        timestamp: Date.now()
      };
      
      // Generate QR code image
      const qrImageUrl = await generateQrCodeImage(qrData);
      
      if (!qrImageUrl) {
        console.error(`Failed to generate QR code image for loyalty card ID ${card.id}`);
        continue;
      }
      
      // Create a digital signature
      const signature = createDigitalSignature(qrData);
      
      // Check if the loyalty card already has a QR code
      const existingQrCode = await pool.query(`
        SELECT * FROM customer_qrcodes
        WHERE customer_id = $1
        AND qr_type = 'LOYALTY_CARD'
        AND qr_data::text LIKE '%"cardId":' || $2 || '%'
      `, [customerId, card.id]);
      
      if (existingQrCode.rows.length > 0) {
        // Update the existing QR code
        await pool.query(`
          UPDATE customer_qrcodes
          SET qr_data = $1,
              qr_image_url = $2,
              digital_signature = $3,
              status = 'ACTIVE',
              updated_at = NOW()
          WHERE id = $4
        `, [JSON.stringify(qrData), qrImageUrl, signature, existingQrCode.rows[0].id]);
        
        console.log(`✅ Updated QR code for loyalty card ID ${card.id}`);
      } else {
        // Generate a unique QR code ID (UUID)
        const qrUniqueId = uuidv4();
        
        // Generate a verification code (6 characters)
        const verificationCode = generateVerificationCode();
        
        // Set expiry date to 1 year from now
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        
        // Insert a new QR code
        await pool.query(`
          INSERT INTO customer_qrcodes (
            qr_unique_id,
            customer_id,
            business_id,
            qr_data,
            qr_image_url,
            qr_type,
            status,
            verification_code,
            is_primary,
            expiry_date,
            digital_signature,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, 'LOYALTY_CARD', 'ACTIVE', $6, false, $7, $8, NOW(), NOW()
          )
        `, [qrUniqueId, customerId, card.business_id, JSON.stringify(qrData), qrImageUrl, verificationCode, expiryDate, signature]);
        
        console.log(`✅ Created new QR code for loyalty card ID ${card.id}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error fixing loyalty cards for customer ${customerId}:`, error);
    return false;
  }
}

/**
 * Main function to fix all customer QR cards
 */
async function main() {
  console.log('Starting QR card fix process...');
  
  try {
    // Get all customers
    const customers = await pool.query(`
      SELECT c.id, c.name, c.email
      FROM customers c
      ORDER BY c.id
    `);
    
    console.log(`Found ${customers.rows.length} customers to process`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Process each customer
    for (const customer of customers.rows) {
      // Fix customer's primary QR card
      const cardSuccess = await fixCustomerQrCard(customer.id, customer.name, customer.email);
      
      // Fix customer's loyalty cards
      const loyaltySuccess = await fixCustomerLoyaltyCards(customer.id);
      
      if (cardSuccess && loyaltySuccess) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log('\nQR card fix process completed:');
    console.log(`✅ Successfully processed ${successCount} customers`);
    
    if (failCount > 0) {
      console.log(`❌ Failed to process ${failCount} customers`);
    }
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
}); 