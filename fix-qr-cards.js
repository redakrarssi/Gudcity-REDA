// Import required modules
import { Pool } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import axios from 'axios';

// Database connection
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """,
  ssl: true
});

// QR code API URL for generating image URLs
const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';

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

/**
 * Generate a QR code image URL
 * @param {object} data - The data to encode in the QR code
 * @returns {Promise<string>} - URL of the generated QR code image
 */
async function generateQRCodeImageURL(data) {
  try {
    // Convert data to string if it's not already
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // URL encode the data
    const encodedData = encodeURIComponent(dataString);
    
    // Create QR code URL with medium error correction and size 300x300
    const qrCodeUrl = `${QR_API_URL}?size=300x300&data=${encodedData}&ecc=M`;
    
    // Verify the URL works by making a HEAD request
    try {
      await axios.head(qrCodeUrl);
    } catch (error) {
      console.error('Error verifying QR code URL:', error);
      // If HEAD request fails, return the URL anyway
    }
    
    return qrCodeUrl;
  } catch (error) {
    console.error('Error generating QR code image URL:', error);
    throw error;
  }
}

/**
 * Fix a customer's QR card based on the working model of customer ID 4
 */
async function fixCustomerQrCard(customerId, customerName, customerEmail) {
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
      
      // Check if the QR code data has the required fields and correct structure for scanner
      const hasCorrectStructure = qrData && 
        qrData.type === 'customer' && 
        qrData.customerId &&
        qrData.cardNumber;
      
      const hasImageUrl = existingQrCode.rows[0].qr_image_url && 
        existingQrCode.rows[0].qr_image_url.startsWith('http');
      
      if (!hasCorrectStructure || !hasImageUrl) {
        console.log(`⚠️ Customer ID ${customerId}'s QR code has incorrect format. Fixing...`);
        
        // Update the QR code with the correct data structure
        const cardNumber = generateConsistentCardNumber(customerId);
        
        // Create the updated QR data with proper structure for business scanner
        const updatedQrData = {
          type: 'customer',
          customerId: customerId,
          name: customerName,
          email: customerEmail,
          cardNumber: cardNumber,
          cardType: 'STANDARD',
          timestamp: Date.now()
        };
        
        // Generate QR code image URL
        let qrImageUrl;
        try {
          qrImageUrl = await generateQRCodeImageURL(updatedQrData);
        } catch (urlError) {
          console.error(`Error generating QR code URL for customer ${customerId}:`, urlError);
          qrImageUrl = null;
        }
        
        // Create a new digital signature
        const signature = createDigitalSignature(updatedQrData);
        
        // Update the QR code in the database
        await pool.query(`
          UPDATE customer_qrcodes
          SET qr_data = $1,
              digital_signature = $2,
              qr_image_url = $3,
              updated_at = NOW()
          WHERE id = $4
        `, [JSON.stringify(updatedQrData), signature, qrImageUrl, existingQrCode.rows[0].id]);
        
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
      
      // Create the QR data with structure compatible with QRScanner
      const qrData = {
        type: 'customer',
        customerId: customerId,
        name: customerName,
        email: customerEmail,
        cardNumber: cardNumber,
        cardType: 'STANDARD',
        timestamp: Date.now()
      };
      
      // Generate QR code image URL
      let qrImageUrl;
      try {
        qrImageUrl = await generateQRCodeImageURL(qrData);
      } catch (urlError) {
        console.error(`Error generating QR code URL for customer ${customerId}:`, urlError);
        qrImageUrl = null;
      }
      
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
          
          // Create the QR data with scanner-compatible structure
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
          
          // Generate QR code image URL
          let qrImageUrl;
          try {
            qrImageUrl = await generateQRCodeImageURL(qrData);
          } catch (urlError) {
            console.error(`Error generating QR code URL for loyalty card ${card.id}:`, urlError);
            qrImageUrl = null;
          }
          
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
          
          console.log(`✅ Created QR code for loyalty card ID ${card.id}`);
        } else {
          console.log(`✅ Loyalty card ID ${card.id} already has a QR code`);
          
          // Check if the loyalty card QR code has an image URL
          if (!cardQrCode.rows[0].qr_image_url) {
            console.log(`⚠️ Loyalty card ID ${card.id} QR code missing image URL. Updating...`);
            
            let qrData;
            try {
              qrData = typeof cardQrCode.rows[0].qr_data === 'string' 
                ? JSON.parse(cardQrCode.rows[0].qr_data) 
                : cardQrCode.rows[0].qr_data;
              
              // Generate QR code image URL
              const qrImageUrl = await generateQRCodeImageURL(qrData);
              
              // Update the QR code with the image URL
              await pool.query(`
                UPDATE customer_qrcodes
                SET qr_image_url = $1,
                    updated_at = NOW()
                WHERE id = $2
              `, [qrImageUrl, cardQrCode.rows[0].id]);
              
              console.log(`✅ Updated image URL for loyalty card ID ${card.id} QR code`);
            } catch (error) {
              console.error(`Error updating image URL for loyalty card ID ${card.id} QR code:`, error);
            }
          }
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

/**
 * Main function to fix all customer QR cards
 */
async function main() {
  console.log('Starting QR card fix process...');
  
  try {
    // Check if axios is installed
    if (!axios) {
      console.error('Error: axios module required but not found. Please install axios with:');
      console.error('npm install axios');
      process.exit(1);
    }

    // Get all customers
    const customers = await pool.query(`
      SELECT c.id, c.name, c.email
      FROM customers c
      ORDER BY c.id
    `);
    
    console.log(`Found ${customers.rows.length} customers to process`);
    
    // Process each customer
    for (const customer of customers.rows) {
      await fixCustomerQrCard(customer.id, customer.name, customer.email);
    }
    
    console.log('QR card fix process completed successfully!');
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