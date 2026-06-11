import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function checkUser() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Error: Please provide an email or User ID as an argument.');
    console.log('Usage: npx tsx src/scripts/checkUser.ts <email_or_user_id>');
    process.exit(1);
  }

  try {
    let user = null;
    if (arg.includes('@')) {
      // Find by email
      user = await prisma.user.findUnique({
        where: { email: arg.trim().toLowerCase() }
      });
    } else {
      // Find by ID
      user = await prisma.user.findUnique({
        where: { id: arg.trim() }
      });
    }

    if (!user) {
      console.log(`\nUser with search key "${arg}" not found in User table.`);
      
      // Let's also check if it exists as a Guest in UserState
      const guestState = await prisma.userState.findUnique({
        where: { userId: arg.trim() }
      });
      
      if (guestState) {
        console.log(`\nFound UserState record for anonymous guest user:`);
        console.log(`  - User ID: ${guestState.userId} (Guest)`);
        console.log(`  - Subscription: ${guestState.subscription}`);
        console.log(`  - Onboarding Complete: ${guestState.onboardingComplete}`);
      }
      return;
    }

    const userState = await prisma.userState.findUnique({
      where: { userId: user.id }
    });

    console.log(`\n================ USER PROFILE DETAILS ================`);
    console.log(`  - Email:        ${user.email}`);
    console.log(`  - User ID:      ${user.id}`);
    console.log(`  - Verified:     ${user.isVerified ? 'Yes' : 'No'}`);
    console.log(`  - Created At:   ${user.createdAt}`);
    console.log(`=======================================================`);

    if (!userState) {
      console.log(`Warning: UserState record does not exist in the database for this user.`);
      console.log(`    (It gets created when the user completes onboarding or verifies their email).`);
      return;
    }

    const now = new Date();
    const expiresAt = userState.subscriptionExpiresAt;
    const isExpired = expiresAt ? now > expiresAt : true;

    console.log(`================ SUBSCRIPTION METRICS ================`);
    console.log(`  - Current Level:          ${userState.subscription === 'premium' ? 'Premium' : 'Free'}`);
    console.log(`  - Sub Type:               ${userState.subscriptionType || 'N/A'}`);
    console.log(`  - Auto Renew:             ${userState.autoRenew ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Saved Payment Method:   ${userState.yookassaPaymentMethodId ? 'Linked (Token Saved)' : 'None'}`);
    
    if (userState.subscription === 'premium') {
      console.log(`  - Expiration Date:        ${expiresAt ? expiresAt.toLocaleString() : 'Never'}`);
      if (expiresAt) {
        if (isExpired) {
          console.log(`  - Expiry Status:          EXPIRED (Passed by ${Math.round((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60))} hours)`);
        } else {
          console.log(`  - Expiry Status:          Active (Expires in ${Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))} hours)`);
        }
      }
    }
    console.log(`=======================================================`);

    console.log(`\nTroubleshooting Checklist:`);
    console.log(`1. Is the email address they use in the app EXACTLY "${user.email}"?`);
    console.log(`2. If the user paid, but their status is active here and they don't see it:`);
    console.log(`   - Have they logged out and logged back in? (JWT tokens store subscription status and can be stale for up to 30 days).`);
    console.log(`   - Check their LocalStorage for "cook_assistant_token" and "cook_assistant_state".`);
    console.log(`3. Did they pay on a Guest account (anonymous ID starting with "user_") but are now logged into their registered account?`);

  } catch (error: any) {
    console.error('An error occurred while running the script:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
