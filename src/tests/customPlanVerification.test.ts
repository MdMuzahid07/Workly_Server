import prisma from '../utils/prismaClient.js';
import planService from '../app/modules/plan/plan.service.js';
import { createPlanZodSchema } from '../app/modules/plan/plan.validation.js';
import { EntitlementService } from '../services/entitlement.service.js';
import { PlanType, UserRole, SubscriptionStatus } from '../generated/prisma/index.js';

async function runCustomPlanVerificationTests() {
  console.log('🚀 Starting Custom Plan Verification Tests...\n');
  let failed = false;

  let createdEmpPlanId: string | null = null;
  let createdCandPlanId: string | null = null;
  let testUserId: string | null = null;
  let testCompanyId: string | null = null;
  let testSubId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // 1. Integration Test: Create Employer and Seeker Custom Tiers via Backend
    // -------------------------------------------------------------------------
    console.log('[Test 1] Integration: Creating Employer Custom Tier via backend service...');
    const empPlan = await planService.createPlan({
      name: 'emp_test_enterprise_corp_' + Date.now(),
      planType: 'EMPLOYER',
      isCustom: true,
      description: 'Custom Enterprise Tier for Corporate Client',
      price: 15000,
      currency: 'BDT',
      interval: 'month',
      maxActiveJobs: 95,
      maxUsers: 20,
      features: {
        maxActiveJobs: 95,
        maxUsers: 20,
        canMessage: true,
        canViewAnalytics: true,
      },
    });
    createdEmpPlanId = empPlan.id;

    if (
      empPlan.planType !== PlanType.EMPLOYER ||
      empPlan.isCustom !== true ||
      empPlan.maxActiveJobs !== 95 ||
      empPlan.maxUsers !== 20
    ) {
      console.error('❌ Employer Custom Plan creation assertion failed!', empPlan);
      failed = true;
    } else {
      console.log('✅ Employer Custom Plan created and verified in DB:', {
        id: empPlan.id,
        planType: empPlan.planType,
        isCustom: empPlan.isCustom,
        maxActiveJobs: empPlan.maxActiveJobs,
        maxUsers: empPlan.maxUsers,
      });
    }

    console.log('[Test 1] Integration: Creating Job Seeker Custom Tier via backend service...');
    const candPlan = await planService.createPlan({
      name: 'cand_test_vip_seeker_' + Date.now(),
      planType: 'JOB_SEEKER',
      isCustom: true,
      description: 'Custom Seeker VIP Package',
      price: 500,
      currency: 'BDT',
      interval: 'month',
      maxActiveJobs: 0,
      maxUsers: 0,
      features: {
        maxMonthlyApplications: 9999,
        maxResumes: 9999,
        canMessageEmployer: true,
        isFeaturedProfile: true,
      },
    });
    createdCandPlanId = candPlan.id;

    if (candPlan.planType !== PlanType.JOB_SEEKER || candPlan.isCustom !== true) {
      console.error('❌ Candidate Custom Plan creation assertion failed!', candPlan);
      failed = true;
    } else {
      console.log('✅ Candidate Custom Plan created and verified in DB:', {
        id: candPlan.id,
        planType: candPlan.planType,
        isCustom: candPlan.isCustom,
      });
    }

    // -------------------------------------------------------------------------
    // 2. Regression Test: Backend Validation Rejects Omitted Required Fields
    // -------------------------------------------------------------------------
    console.log(
      '\n[Test 2] Regression: Verifying Zod validation rejects missing planType or isCustom...',
    );

    // Test missing planType
    const missingPlanTypeParse = createPlanZodSchema.safeParse({
      name: 'invalid_no_type',
      isCustom: true,
      price: 100,
    });
    if (missingPlanTypeParse.success) {
      console.error('❌ Zod validation allowed payload with missing planType!');
      failed = true;
    } else {
      console.log('✅ Zod correctly rejected missing planType with 400 validation error.');
    }

    // Test missing isCustom
    const missingIsCustomParse = createPlanZodSchema.safeParse({
      name: 'invalid_no_iscustom',
      planType: 'EMPLOYER',
      price: 100,
    });
    if (missingIsCustomParse.success) {
      console.error('❌ Zod validation allowed payload with missing isCustom!');
      failed = true;
    } else {
      console.log('✅ Zod correctly rejected missing isCustom with 400 validation error.');
    }

    // Test service layer direct rejection
    try {
      await planService.createPlan({
        name: 'invalid_service_call',
        price: 100,
      } as any);
      console.error('❌ planService allowed creation without planType!');
      failed = true;
    } catch (err: any) {
      console.log('✅ planService layer correctly threw error on missing planType:', err.message);
    }

    // -------------------------------------------------------------------------
    // 3. End-to-End Entitlement Check: Assign Custom Tier to Test Account
    // -------------------------------------------------------------------------
    console.log(
      '\n[Test 3] End-to-End: Assigning custom tier to test company and verifying EntitlementService...',
    );

    // Create temporary test user & company
    const testEmail = `custom_tier_test_${Date.now()}@example.com`;
    const testCompany = await prisma.company.create({
      data: {
        name: 'Test Enterprise Corp ' + Date.now(),
        slug: 'test-corp-' + Date.now(),
      },
    });
    testCompanyId = testCompany.id;

    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hashed_pw',
        fullName: 'Custom Tier Tester',
        role: UserRole.EMPLOYER,
        companyId: testCompany.id,
      },
    });
    testUserId = testUser.id;

    // Link subscription with custom enterprise plan
    const sub = await prisma.subscription.create({
      data: {
        companyId: testCompany.id,
        planId: empPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
      },
    });
    testSubId = sub.id;

    // Flush cache & resolve entitlements
    EntitlementService.invalidateCache(testUser.id);
    const entitlements = await EntitlementService.getUserEntitlements(testUser.id);

    console.log('Resolved Entitlements for Custom Enterprise Tier User:', {
      maxActiveJobs: entitlements.maxActiveJobs,
      maxUsers: entitlements.maxUsers,
      canMessage: entitlements.canMessage,
      canViewAnalytics: entitlements.canViewAnalytics,
    });

    if (
      entitlements.maxActiveJobs !== 95 ||
      entitlements.maxUsers !== 20 ||
      entitlements.canMessage !== true ||
      entitlements.canViewAnalytics !== true
    ) {
      console.error(
        '❌ EntitlementService failed to resolve custom tier features correctly!',
        entitlements,
      );
      failed = true;
    } else {
      console.log(
        '✅ EntitlementService successfully resolved Custom Enterprise Tier features end-to-end!',
      );
    }

    // -------------------------------------------------------------------------
    // 4. SEED Tiers Verification & Starter/Business Quota Test
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] SEED Tiers Verification: Checking restructured default plans...');
    const fetchedPlans = await planService.getPlans({ type: 'employer' });
    const planNames = fetchedPlans.map((p) => p.name);
    console.log('Available Employer Plans in DB:', planNames);

    const starterPlan = fetchedPlans.find((p) => p.name === 'Starter');
    const businessPlan = fetchedPlans.find((p) => p.name === 'Business');
    const freePlan = fetchedPlans.find((p) => p.name === 'Free');

    if (
      !starterPlan ||
      starterPlan.price !== 1999 ||
      starterPlan.maxActiveJobs !== 5 ||
      starterPlan.maxUsers !== 2
    ) {
      console.error('❌ Starter Plan verification failed!', starterPlan);
      failed = true;
    } else {
      console.log('✅ Starter Plan verified (৳1,999, 5 jobs, 2 users).');
    }

    if (
      !businessPlan ||
      businessPlan.price !== 14999 ||
      businessPlan.maxActiveJobs !== 30 ||
      businessPlan.maxUsers !== 10
    ) {
      console.error('❌ Business Plan verification failed!', businessPlan);
      failed = true;
    } else {
      console.log('✅ Business Plan verified (৳14,999, 30 jobs, 10 users).');
    }

    if (!freePlan || freePlan.maxActiveJobs !== 3) {
      console.error('❌ Free Plan verification failed!', freePlan);
      failed = true;
    } else {
      console.log('✅ Free Plan verified (3 jobs).');
    }
  } catch (err) {
    console.error('💥 Test execution error:', err);
    failed = true;
  } finally {
    // Clean up created DB records
    console.log('\n🧹 Cleaning up test artifacts from database...');
    if (testSubId) await prisma.subscription.delete({ where: { id: testSubId } }).catch(() => {});
    if (testUserId) await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    if (testCompanyId)
      await prisma.company.delete({ where: { id: testCompanyId } }).catch(() => {});
    if (createdEmpPlanId)
      await prisma.plan.delete({ where: { id: createdEmpPlanId } }).catch(() => {});
    if (createdCandPlanId)
      await prisma.plan.delete({ where: { id: createdCandPlanId } }).catch(() => {});
    console.log('Done cleanup.');
  }

  if (failed) {
    console.error('\n❌ Custom Plan Verification Tests FAILED.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL Custom Plan Verification Tests PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runCustomPlanVerificationTests();
