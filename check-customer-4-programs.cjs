const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCustomer4Programs() {
  try {
    // Find all loyalty cards for customer ID 4
    const cards = await prisma.loyaltyCard.findMany({
      where: { customerId: 4 },
      include: { 
        loyaltyProgram: true,
        customer: true
      }
    });

    console.log("Customer ID 4 Loyalty Programs:");
    if (cards.length === 0) {
      console.log("Customer ID 4 is not enrolled in any loyalty programs.");
    } else {
      console.log(`Found ${cards.length} program enrollments:`);
      cards.forEach((card, index) => {
        console.log(`\nProgram ${index + 1}:`);
        console.log(`- Program ID: ${card.loyaltyProgramId}`);
        console.log(`- Program Name: ${card.loyaltyProgram?.name || 'Unknown'}`);
        console.log(`- Business Name: ${card.loyaltyProgram?.businessName || 'Unknown'}`);
        console.log(`- Card ID: ${card.id}`);
        console.log(`- Points Balance: ${card.pointsBalance}`);
        console.log(`- Tier: ${card.tier}`);
        console.log(`- Created: ${card.createdAt}`);
      });
    }
  } catch (error) {
    console.error("Error checking customer programs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomer4Programs(); 