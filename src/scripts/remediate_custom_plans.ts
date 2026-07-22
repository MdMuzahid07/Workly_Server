import prisma from '../utils/prismaClient.js';
import { PlanType } from '../generated/prisma/index.js';

interface RemediationReportItem {
  planId: string;
  name: string;
  currentPlanType: PlanType;
  expectedPlanType: PlanType | null;
  isCustom: boolean;
  maxActiveJobs: number | null;
  maxUsers: number | null;
  activeCompanySubscriptions: number;
  activeUserSubscriptions: number;
  issues: string[];
  proposedFixes: Record<string, any>;
}

export async function runRemediation(apply: boolean = false) {
  console.log(`=============================================================`);
  console.log(`  CUSTOM PLAN DATA REMEDIATION SCRIPT (${apply ? 'APPLY MODE' : 'READ-ONLY MODE'})`);
  console.log(`=============================================================\n`);

  // Fetch all custom plans or plans created dynamically (e.g. prefix emp_/cand_ or isCustom: true)
  const plans = await prisma.plan.findMany({
    include: {
      subscriptions: { select: { id: true, companyId: true, status: true } },
      userSubscriptions: { select: { id: true, userId: true, status: true } },
    },
  });

  const report: RemediationReportItem[] = [];

  for (const plan of plans) {
    const issues: string[] = [];
    const proposedFixes: Record<string, any> = {};

    let expectedPlanType: PlanType | null = null;
    if (plan.name.startsWith('emp_')) {
      expectedPlanType = PlanType.EMPLOYER;
    } else if (plan.name.startsWith('cand_')) {
      expectedPlanType = PlanType.JOB_SEEKER;
    }

    // Check 1: Mismatched planType
    if (expectedPlanType && plan.planType !== expectedPlanType) {
      issues.push(
        `Plan name prefix '${plan.name}' implies ${expectedPlanType}, but DB planType is ${plan.planType}`,
      );
      proposedFixes.planType = expectedPlanType;
    }

    // Check 2: Active subscriptions role mismatch
    if (plan.subscriptions.length > 0 && plan.planType !== PlanType.EMPLOYER) {
      issues.push(
        `Has ${plan.subscriptions.length} active company subscriptions but planType is ${plan.planType}`,
      );
      proposedFixes.planType = PlanType.EMPLOYER;
    }
    if (plan.userSubscriptions.length > 0 && plan.planType !== PlanType.JOB_SEEKER) {
      issues.push(
        `Has ${plan.userSubscriptions.length} active user subscriptions but planType is ${plan.planType}`,
      );
      proposedFixes.planType = PlanType.JOB_SEEKER;
    }

    // Check 3: Zero limits where unlimited (0) was passed
    if (plan.isCustom) {
      if (plan.maxActiveJobs === 0) {
        issues.push(`Custom plan maxActiveJobs is set to 0 (hard lock instead of unlimited 9999)`);
        proposedFixes.maxActiveJobs = 9999;
      }
      if (plan.maxUsers === 0) {
        issues.push(`Custom plan maxUsers is set to 0 (hard lock instead of unlimited 9999)`);
        proposedFixes.maxUsers = 9999;
      }
    }

    if (issues.length > 0) {
      report.push({
        planId: plan.id,
        name: plan.name,
        currentPlanType: plan.planType,
        expectedPlanType,
        isCustom: plan.isCustom,
        maxActiveJobs: plan.maxActiveJobs,
        maxUsers: plan.maxUsers,
        activeCompanySubscriptions: plan.subscriptions.length,
        activeUserSubscriptions: plan.userSubscriptions.length,
        issues,
        proposedFixes,
      });
    }
  }

  console.log(`[Report] Total plans analyzed: ${plans.length}`);
  console.log(`[Report] Corrupted/Inconsistent plans found: ${report.length}\n`);

  if (report.length === 0) {
    console.log(`✅ No corrupted custom plan rows found in DB.`);
    return report;
  }

  for (const item of report) {
    console.log(`-------------------------------------------------------------`);
    console.log(`Plan ID       : ${item.planId}`);
    console.log(`Plan Name     : ${item.name}`);
    console.log(`isCustom      : ${item.isCustom}`);
    console.log(`Current Type  : ${item.currentPlanType}`);
    console.log(`Max Jobs/Users: ${item.maxActiveJobs} / ${item.maxUsers}`);
    console.log(
      `Active Subs   : Employer=${item.activeCompanySubscriptions}, Seeker=${item.activeUserSubscriptions}`,
    );
    console.log(`Issues Found  :`);
    item.issues.forEach((iss) => console.log(`  - ❌ ${iss}`));
    console.log(`Proposed Fix  :`, JSON.stringify(item.proposedFixes));

    if (apply) {
      const updated = await prisma.plan.update({
        where: { id: item.planId },
        data: item.proposedFixes,
      });
      console.log(`[Applied Fix] Plan ${item.planId} updated successfully:`, {
        oldPlanType: item.currentPlanType,
        newPlanType: updated.planType,
        oldMaxJobs: item.maxActiveJobs,
        newMaxJobs: updated.maxActiveJobs,
        oldMaxUsers: item.maxUsers,
        newMaxUsers: updated.maxUsers,
      });
    }
  }

  return report;
}

// Execute if called directly from CLI
if (process.argv[1] && process.argv[1].endsWith('remediate_custom_plans.ts')) {
  const shouldApply = process.argv.includes('--apply=true');
  runRemediation(shouldApply)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error running remediation script:', err);
      process.exit(1);
    });
}
