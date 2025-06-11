# QR Code Generation Improvements

This document outlines the improvements made to the QR code generation system to enhance reliability, standardization, and security.

## Overview of Changes

1. **Replaced Custom QR Code Generator with Standard Library**
   - Switched from a custom implementation to the industry-standard `qrcode` library
   - Eliminated mixed deterministic/random patterns that affected scan reliability
   - Improved error correction levels for more reliable scanning

2. **Standardized QR Code Data Format**
   - Created a consistent data structure for all QR code types
   - Added version tracking to support future format changes
   - Implemented uniform field naming across all QR code types

3. **Enhanced Security**
   - Added digital signatures to verify QR code authenticity
   - Implemented unique identifiers for each QR code
   - Utilized environment variables for security keys

## Implementation Details

### New Standardized Format

All QR codes now follow this standardized structure:

```typescript
interface StandardQrCodeData {
  // Common fields for all QR code types
  type: 'CUSTOMER_CARD' | 'LOYALTY_CARD' | 'PROMO_CODE';
  qrUniqueId: string;
  timestamp: number;
  version: string;
  
  // Specific fields based on type
  customerId?: string | number;
  customerName?: string;
  businessId?: string | number;
  programId?: string | number;
  cardId?: string | number;
  promoCode?: string;
  
  // Security fields
  signature?: string;
}
```

### QR Code Types

The system now supports three standardized QR code types:

1. **CUSTOMER_CARD**
   - Used for customer identification
   - Contains customer ID and optional name
   - Medium error correction level (M)

2. **LOYALTY_CARD**
   - Used for loyalty program cards
   - Contains card ID, program ID, business ID, and customer ID
   - Higher error correction level (Q)

3. **PROMO_CODE**
   - Used for promotional codes
   - Contains promo code and business ID
   - Higher error correction level (Q)

### Error Correction Levels

Each QR code type uses an appropriate error correction level:

- **L (Low)**: 7% of codewords can be restored
- **M (Medium)**: 15% of codewords can be restored
- **Q (Quartile)**: 25% of codewords can be restored
- **H (High)**: 30% of codewords can be restored

Customer cards use M-level error correction, while loyalty cards and promo codes use Q-level for better scan reliability even with minor damage or poor lighting.

## Security Features

### Digital Signatures

Each QR code includes a digital signature generated using HMAC-SHA256:

1. The QR code data (minus the signature field) is serialized to JSON
2. An HMAC is computed using the QR_SECRET_KEY
3. The signature is included in the QR code data

### Verification Process

When scanning a QR code:

1. The signature is extracted from the data
2. A new signature is computed using the same algorithm
3. The signatures are compared to verify authenticity
4. If verification fails, the QR code is rejected

## Files Changed

The following files were modified:

- `src/utils/standardQrCodeGenerator.ts` (new)
- `src/services/qrCodeService.ts`
- `src/services/userQrCodeService.ts`
- `src/components/QRCard.tsx`
- `src/pages/customer/QrCode.tsx`
- `src/pages/business/TestCodes.tsx`

## Benefits

- **Improved Scan Reliability**: Using a standard library and consistent error correction
- **Better Security**: Proper digital signatures and verification
- **Consistency**: Standardized data format across all QR code types
- **Future-Proofing**: Version field allows for future format changes

## Usage Examples

### Creating a Customer QR Code

```typescript
import { createStandardCustomerQRCode } from '../utils/standardQrCodeGenerator';

const qrCodeDataUrl = await createStandardCustomerQRCode(
  customerId,
  businessId,
  customerName
);
```

### Creating a Loyalty Card QR Code

```typescript
import { createStandardLoyaltyCardQRCode } from '../utils/standardQrCodeGenerator';

const qrCodeDataUrl = await createStandardLoyaltyCardQRCode(
  cardId,
  programId,
  businessId,
  customerId
);
```

### Creating a Promo Code QR Code

```typescript
import { createStandardPromoQRCode } from '../utils/standardQrCodeGenerator';

const qrCodeDataUrl = await createStandardPromoQRCode(
  promoCode,
  businessId
);
```

## Next Steps

1. **Database Updates**: Ensure all stored QR codes follow the new format
2. **Migration**: Create a script to migrate existing QR codes to the new format
3. **Testing**: Thoroughly test scanning of the new QR codes in various conditions
4. **Documentation**: Update all developer documentation to reflect these changes 