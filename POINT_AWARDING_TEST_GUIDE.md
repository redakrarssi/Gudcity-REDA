# Point Awarding System Test Guide

## Overview
This guide helps you test the complete flow of business owners awarding points to customers and customers seeing those points reflected immediately on their loyalty cards.

## Prerequisites
- Business account with at least one loyalty program
- Customer account enrolled in the business's loyalty program
- Both business and customer should be logged into their respective dashboards

## Test Scenarios

### Scenario 1: Quick Award Points from Business Dashboard

**Business Side:**
1. Login to business dashboard
2. Click the purple "Award Points" button in the top action bar
3. In the Quick Award Points modal:
   - Search for a customer by name or email
   - Select the customer from the dropdown
   - Choose a loyalty program
   - Enter points to award (try 10 points)
   - Click "Award 10 Points"
4. Verify success message appears
5. Modal should auto-close after 2-3 seconds

**Customer Side:**
1. Navigate to `/cards` page
2. You should see:
   - Green notification toast: "You've received 10 points in [Program Name]!"
   - The loyalty card should highlight with a green ring and scale slightly
   - Points number should pulse with green color
   - Updated points total on the card
   - New activity in the card's activity section (when expanded)

### Scenario 2: Award Points via QR Scanner

**Business Side:**
1. Login to business dashboard
2. Click "Scan QR" button
3. Scan a customer QR code (or upload QR image)
4. Click "Award Points" button
5. Select program and enter points
6. Click "Award Points"

**Customer Side:**
1. Check `/cards` page for the same visual effects as Scenario 1

### Scenario 3: Award Points via Customer Details

**Business Side:**
1. Go to `/business/customers`
2. Click on a customer to open CustomerDetailsModal
3. In the "Award Points" section:
   - Select a program
   - Enter points to award
   - Click "Award [X] Points"

**Customer Side:**
1. Check `/cards` page for updated points and visual feedback

## Expected Visual Effects on Customer Cards

When points are successfully awarded, customers should see:

1. **Immediate Notification**: Green toast notification with points and program name
2. **Card Highlighting**: 
   - Green ring around the entire card
   - Card scales to 105% size for 3 seconds
   - Subtle shadow enhancement
3. **Points Animation**: 
   - Points number pulses with green color
   - Points value updates immediately
4. **Real-time Updates**: 
   - No page refresh needed
   - Cards update automatically
   - Progress bar updates if applicable

## Verification Checklist

- [ ] Business can award points via dashboard Quick Award
- [ ] Business can award points via QR scanner
- [ ] Business can award points via customer details
- [ ] Customer receives immediate notification
- [ ] Customer cards highlight when points are added
- [ ] Points values update in real-time
- [ ] Card activities show new point transactions
- [ ] No page refresh required for updates
- [ ] Visual effects (highlighting) disappear after 3 seconds
- [ ] Multiple point awards work consecutively

## Troubleshooting

### Points Not Showing on Customer Cards
1. Check browser console for errors
2. Verify customer is enrolled in the correct program
3. Try refreshing the customer cards page
4. Check if points appear in card activities section

### Visual Effects Not Working
1. Ensure browser supports CSS animations
2. Check if loyalty cards are loaded properly
3. Verify the card ID matching between business award and customer display

### Real-time Updates Not Working
1. Check network connectivity
2. Verify localStorage for sync events
3. Check browser console for event listener errors
4. Try manual refresh using the "Refresh Cards" button

## Technical Details

### Point Awarding Flow
1. Business → `guaranteedAwardPoints()` → Database
2. Database → Customer notifications via events
3. Customer cards page → Event listeners → UI updates
4. Visual effects → Automatic highlighting → Auto-remove after 3s

### Event System
- Uses custom browser events for real-time communication
- localStorage polling as backup mechanism
- React Query for data synchronization
- Framer Motion for smooth animations

## Success Criteria

The system works correctly when:
- Business owners can easily award points through multiple interfaces
- Customers see immediate visual feedback when receiving points
- No manual refresh is required
- All point transactions are properly recorded
- Visual effects enhance user experience without being intrusive 