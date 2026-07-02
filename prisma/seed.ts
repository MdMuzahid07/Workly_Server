import prisma from "../src/utils/prismaClient.js";
import bcrypt from "bcrypt";

const seedDatabase = async () => {
  // P0.1 / B3 — Production guard for prisma/seed.ts
  // This file runs standalone via `yarn db:seed` / `prisma db seed` and can
  // target ANY database that DATABASE_URL points to. Without this guard,
  // running the seed against a production database would:
  //   1. DELETE ALL ROWS in every table (the clean-reset block below), and
  //   2. Insert the three hardcoded dev credentials plus 35 fake users.
  //
  // Uses process.env directly (not the app's zod `env`) because this file
  // is invoked by the Prisma CLI before the app boots. process.exit(1) is
  // the correct response — we never want to silently skip and succeed.
  if (process.env.NODE_ENV === "production") {
    console.error(
      "❌  [Seed] Refusing to run: NODE_ENV=production.\n" +
        "    Aborting to protect the production database from being wiped and seeded with dev data.",
    );
    process.exit(1);
  }

  try {
    console.log("🌱 Connecting to the database...");

    // ======= 1. Clean Reset =======
    console.log("🧹 Dropping existing database data in reverse relation order...");
    await prisma.paymentTransaction.deleteMany();
    await prisma.pushReceipt.deleteMany();
    await prisma.pushToken.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.jobReport.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.savedCandidate.deleteMany();
    await prisma.savedJob.deleteMany();
    await prisma.application.deleteMany();
    await prisma.jobSkill.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.job.deleteMany();
    await prisma.benefits.deleteMany();
    await prisma.socialLink.deleteMany();
    await prisma.companySettings.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.company.deleteMany();
    await prisma.industry.deleteMany();
    await prisma.preference.deleteMany();
    await prisma.education.deleteMany();
    await prisma.workExperience.deleteMany();
    await prisma.certification.deleteMany();
    await prisma.project.deleteMany();
    await prisma.volunteer.deleteMany();
    await prisma.award.deleteMany();
    await prisma.publication.deleteMany();
    await prisma.reference.deleteMany();
    await prisma.language.deleteMany();
    await prisma.address.deleteMany();
    await prisma.profileView.deleteMany();
    await prisma.jobView.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.userSettings.deleteMany();
    await prisma.resume.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.rateLimit.deleteMany();
    await prisma.legalDocument.deleteMany();
    await prisma.systemSettings.deleteMany();
    await prisma.userSubscription.deleteMany();
    await prisma.usageCounter.deleteMany();

    // Break user -> profile circular dependency before deleting
    await prisma.user.updateMany({ data: { profileId: null } });
    await prisma.user.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.plan.deleteMany();
    console.log("✨ Database reset complete!");

    // ======= 2. Seed Subscription Plans (6 Plans) =======
    console.log("💳 Seeding subscription plans...");
    const plansData = [
      // Employer plans
      {
        name: "Free",
        planType: "EMPLOYER" as const,
        description: "Standard local recruiting package at zero cost.",
        price: 0.0,
        currency: "BDT",
        interval: "month",
        features: {
          maxActiveJobs: 1,
          maxUsers: 1,
          maxMonthlyApplications: 0,
          maxResumes: 0,
          canMessage: false,
          canViewAnalytics: false,
          canViewProfileAnalytics: false,
          isFeaturedProfile: false,
          canMessageEmployer: false,
        },
        maxActiveJobs: 1,
        maxUsers: 1,
        isActive: true,
      },
      {
        name: "Growth",
        planType: "EMPLOYER" as const,
        description: "Best for growing teams and active recruitment campaigns.",
        price: 7999.0,
        currency: "BDT",
        interval: "month",
        features: {
          maxActiveJobs: 10,
          maxUsers: 4,
          maxMonthlyApplications: 0,
          maxResumes: 0,
          canMessage: true,
          canViewAnalytics: true,
          canViewProfileAnalytics: false,
          isFeaturedProfile: false,
          canMessageEmployer: false,
        },
        maxActiveJobs: 10,
        maxUsers: 4,
        isActive: true,
      },
      {
        name: "Enterprise",
        planType: "EMPLOYER" as const,
        description: "Unlimited options and custom solutions for large corporate teams.",
        price: 24999.0,
        currency: "BDT",
        interval: "month",
        features: {
          maxActiveJobs: 9999,
          maxUsers: 9999,
          maxMonthlyApplications: 0,
          maxResumes: 0,
          canMessage: true,
          canViewAnalytics: true,
          canViewProfileAnalytics: false,
          isFeaturedProfile: false,
          canMessageEmployer: false,
        },
        maxActiveJobs: 9999,
        maxUsers: 9999,
        isActive: true,
      },
      // Job Seeker plans
      {
        name: "Free",
        planType: "JOB_SEEKER" as const,
        description: "Basic job search and profile builder for seekers.",
        price: 0.0,
        currency: "BDT",
        interval: "month",
        features: {
          maxActiveJobs: 0,
          maxUsers: 0,
          maxMonthlyApplications: 40,
          maxResumes: 1,
          canMessage: false,
          canViewAnalytics: false,
          canViewProfileAnalytics: false,
          isFeaturedProfile: false,
          canMessageEmployer: false,
        },
        maxActiveJobs: 0,
        maxUsers: 0,
        isActive: true,
      },
      {
        name: "Pro",
        planType: "JOB_SEEKER" as const,
        description: "Accelerate your career search with higher limits and messaging.",
        price: 399.0,
        currency: "BDT",
        interval: "month",
        features: {
          maxActiveJobs: 0,
          maxUsers: 0,
          maxMonthlyApplications: 120,
          maxResumes: 5,
          canMessage: false,
          canViewAnalytics: false,
          canViewProfileAnalytics: true,
          isFeaturedProfile: false,
          canMessageEmployer: true,
        },
        maxActiveJobs: 0,
        maxUsers: 0,
        isActive: true,
      },
      {
        name: "Premium",
        planType: "JOB_SEEKER" as const,
        description: "The ultimate package with maximum visibility and unlimited features.",
        price: 999.0,
        currency: "BDT",
        interval: "month",
        features: {
          maxActiveJobs: 0,
          maxUsers: 0,
          maxMonthlyApplications: 9999,
          maxResumes: 9999,
          canMessage: false,
          canViewAnalytics: false,
          canViewProfileAnalytics: true,
          isFeaturedProfile: true,
          canMessageEmployer: true,
        },
        maxActiveJobs: 0,
        maxUsers: 0,
        isActive: true,
      },
    ];

    const plans: Record<string, any> = {};
    for (const p of plansData) {
      plans[`${p.planType}_${p.name}`] = await prisma.plan.create({ data: p });
    }
    console.log(`✅ Seeded ${Object.keys(plans).length} plans successfully.`);

    // ======= 3. Seed Industries (20 Industries) =======
    console.log("🏢 Seeding 20 industries...");
    const industriesData = [
      { name: "Software & IT", slug: "software-it", icon: "code" },
      { name: "Financial Services", slug: "financial-services", icon: "banknote" },
      { name: "Healthcare & Biotech", slug: "healthcare-biotech", icon: "activity" },
      { name: "Education & E-Learning", slug: "education-elearning", icon: "graduation-cap" },
      { name: "Logistics & Supply Chain", slug: "logistics-supply-chain", icon: "truck" },
      { name: "Digital Marketing & Agency", slug: "digital-marketing-agency", icon: "megaphone" },
      { name: "Creative Arts & Design", slug: "creative-arts-design", icon: "palette" },
      { name: "Telecommunications", slug: "telecommunications", icon: "phone" },
      { name: "E-Commerce & Retail", slug: "ecommerce-retail", icon: "shopping-bag" },
      { name: "Construction & Real Estate", slug: "construction-real-estate", icon: "building" },
      { name: "Hospitality & Tourism", slug: "hospitality-tourism", icon: "plane" },
      { name: "Energy & Utilities", slug: "energy-utilities", icon: "zap" },
      { name: "Automotive", slug: "automotive", icon: "car" },
      { name: "Media & Entertainment", slug: "media-entertainment", icon: "tv" },
      { name: "Agriculture & Farming", slug: "agriculture-farming", icon: "leaf" },
      { name: "Manufacturing & Production", slug: "manufacturing-production", icon: "wrench" },
      { name: "Aerospace & Defense", slug: "aerospace-defense", icon: "plane-takeoff" },
      { name: "Non-Profit & NGO", slug: "non-profit-ngo", icon: "heart" },
      { name: "Legal Services", slug: "legal-services", icon: "scale" },
      { name: "Human Resources & Staffing", slug: "human-resources-staffing", icon: "users" },
    ];

    const industries: Record<string, any> = {};
    for (const ind of industriesData) {
      industries[ind.slug] = await prisma.industry.create({ data: ind });
    }
    console.log(`✅ Seeded ${Object.keys(industries).length} industries.`);

    // ======= 4. Seed Legal Documents (20 Documents) & System Settings (20 rows) & Rate Limits (20 rows) =======
    console.log("📄 Seeding 20 legal documents, 20 system settings, 20 rate limits...");
    const legalDocs = [
      {
        slug: "terms-of-service",
        title: "Terms of Service",
        intro: "Please read these terms carefully before accessing Workly Job portal services.",
        content: "By using our platform, you agree to fulfill our job application standards...",
        lastUpdated: "June 2026",
      },
      {
        slug: "privacy-policy",
        title: "Privacy Policy",
        intro:
          "This Privacy Policy describes how Workly manages your private profile and credentials data.",
        content:
          "We secure all resumes and data profiles under high-level TLS and SSL protocols...",
        lastUpdated: "June 2026",
      },
      {
        slug: "cookie-policy",
        title: "Cookie Policy",
        intro: "Workly uses cookies to optimize your platform dashboard navigation.",
        content: "Cookies store regional configurations and layout preferences...",
        lastUpdated: "June 2026",
      },
      {
        slug: "refund-policy",
        title: "Refund Policy",
        intro: "Details on refund qualifications for employer plans and seeker premiums.",
        content: "Refund requests must be initiated within 7 days of validation transactions...",
        lastUpdated: "June 2026",
      },
      {
        slug: "gdpr-compliance",
        title: "GDPR Compliance",
        intro: "How European Union residents' rights are protected on Workly.",
        content: "Seekers have complete rights to request data profile wipeout...",
        lastUpdated: "June 2026",
      },
      {
        slug: "ccpa-privacy",
        title: "CCPA Privacy Statement",
        intro: "California Consumer Privacy Act disclosure statement.",
        content: "Workly does not monetize or trade candidate resumes to third parties...",
        lastUpdated: "June 2026",
      },
      {
        slug: "security-disclosure",
        title: "Responsible Disclosure",
        intro: "Guidance on reporting cybersecurity vulnerabilities to our IT team.",
        content: "Contact safety@workly.com for penetration leaks or credentials hazards...",
        lastUpdated: "June 2026",
      },
      {
        slug: "community-rules",
        title: "Community Guidelines",
        intro: "Expected codes of conduct for candidates and recruiting employers.",
        content:
          "Spamming cover letters or fake company profiles will result in immediate suspension...",
        lastUpdated: "June 2026",
      },
      {
        slug: "billing-terms",
        title: "Subscription Billing Agreement",
        intro: "Terms of recurring billing payments on Workly.",
        content: "Billing renewals repeat automatically unless cancelled 24 hours prior...",
        lastUpdated: "June 2026",
      },
      {
        slug: "service-sla",
        title: "Service Level Agreement (SLA)",
        intro: "Uptime commitments for corporate premium dashboards.",
        content: "We guarantee 99.9% availability of recruitment portal tools...",
        lastUpdated: "June 2026",
      },
      {
        slug: "anti-spam-policy",
        title: "Anti-Spam Policy",
        intro: "Workly has a zero tolerance policy for messaging spam.",
        content:
          "Accounts sending unsolicited advertising or repeating duplicate pitches will be banned...",
        lastUpdated: "June 2026",
      },
      {
        slug: "dmca-notice",
        title: "DMCA Copyright Notice",
        intro: "Procedures to report copyright infringement claims.",
        content:
          "Submit DMCA takedown requests with full proof of original work ownership to dmca@workly.com...",
        lastUpdated: "June 2026",
      },
      {
        slug: "trademark-policy",
        title: "Trademark Guidelines",
        intro: "Proper usage of Workly logos and names.",
        content:
          "Do not use the Workly name in any way that implies sponsorship or endorsement without approval...",
        lastUpdated: "June 2026",
      },
      {
        slug: "accessibility-statement",
        title: "Web Accessibility Statement",
        intro: "Our commitment to making our recruitment app accessible for everyone.",
        content:
          "We target WCAG 2.1 Level AA compliance across all primary dashboard interfaces...",
        lastUpdated: "June 2026",
      },
      {
        slug: "data-processing-agreement",
        title: "Data Processing Addendum (DPA)",
        intro: "Standard contractual clauses for employer customer data.",
        content:
          "This DPA governs the processing of candidate resumes under European privacy regulations...",
        lastUpdated: "June 2026",
      },
      {
        slug: "conflict-of-interest-policy",
        title: "Conflict of Interest Policy",
        intro: "Standards of recruiting neutrality.",
        content:
          "Employers must disclose any family or financial relationships with applicants during interviews...",
        lastUpdated: "June 2026",
      },
      {
        slug: "background-check-policy",
        title: "Background Verification Guidelines",
        intro: "Terms for company background checks.",
        content:
          "Background verification checks require explicit consent from applicants before initiation...",
        lastUpdated: "June 2026",
      },
      {
        slug: "whistleblowing-policy",
        title: "Whistleblower Protection",
        intro: "Reporting unethical corporate recruiting behavior.",
        content:
          "Employees and candidates can report discrimination or fraudulent posts anonymously...",
        lastUpdated: "June 2026",
      },
      {
        slug: "equal-opportunity-policy",
        title: "Equal Opportunity Employer Policy",
        intro: "Commitment to non-discriminatory hiring processes.",
        content:
          "All candidates must be evaluated solely based on skills and experiences without bias...",
        lastUpdated: "June 2026",
      },
      {
        slug: "referral-program-terms",
        title: "Recruitment Referral Terms",
        intro: "Terms for candidate refer and earn programs.",
        content:
          "Referral bonuses are paid only after the referred candidate stays at the company for 90 days...",
        lastUpdated: "June 2026",
      },
    ];
    for (const doc of legalDocs) {
      await prisma.legalDocument.create({ data: doc });
    }

    // Seed System Settings (Singleton Pattern)
    await prisma.systemSettings.create({
      data: {
        id: "singleton",
        aiMatchmaking: true,
        publicRegistration: true,
        globalNotifications: true,
        extendedAuditLogging: true,
        maintenanceMode: false,
        siteName: "Workly",
        siteSlogan: "Connecting Talent with Opportunity",
        supportEmail: "support@workly.com",
      },
    });

    // Seed 20 Rate Limit rows
    for (let idx = 0; idx < 20; idx++) {
      await prisma.rateLimit.create({
        data: {
          identifier: `192.168.1.${10 + idx}`,
          endpoint: "/api/v1/auth/login",
          requests: idx + 1,
          resets: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
    }

    // ======= 5. Seed Users & Profiles (1 Admin, 17 Employers, 20 Seekers = 38 Users) =======
    console.log("👤 Seeding 38 Users & Profiles...");
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const commonUserPassword = await bcrypt.hash("Workly@User123", saltRounds);

    const devUsersRaw = [
      {
        email: "mydevcafe@gmail.com",
        passwordHash: await bcrypt.hash("Admin#$12345@", saltRounds),
        fullName: "Admin Dev",
        role: "ADMIN" as const,
      },
      {
        email: "mdmuzahid7396@gmail.com",
        passwordHash: await bcrypt.hash("HDiotuIDG85678%7%$#KjgDJG", saltRounds),
        fullName: "Muzahid Employer",
        role: "EMPLOYER" as const,
      },
      {
        email: "mdmuzahid.dev@gmail.com",
        passwordHash: await bcrypt.hash("FKJhOFIt985^&54#$%#", saltRounds),
        fullName: "Muzahid Seeker",
        role: "JOB_SEEKER" as const,
        isPremium: true,
      },
    ];

    const employersRaw = [
      { email: "employer.tech@company.com", fullName: "Zahid Ahmed", role: "EMPLOYER" as const },
      {
        email: "employer.finance@company.com",
        fullName: "Tanvir Chowdury",
        role: "EMPLOYER" as const,
      },
      { email: "employer.health@company.com", fullName: "Arif Karim", role: "EMPLOYER" as const },
      { email: "employer.edu@company.com", fullName: "Naimur Siddique", role: "EMPLOYER" as const },
      {
        email: "employer.logistics@company.com",
        fullName: "Kamrul Hasan",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.marketing@company.com",
        fullName: "Sabbir Miah",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.creative@company.com",
        fullName: "Imran Siddique",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.telecom@company.com",
        fullName: "Mahbubur Rashid",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.ecommerce@company.com",
        fullName: "Ashraful Karim",
        role: "EMPLOYER" as const,
      },
      { email: "employer.retail@company.com", fullName: "Rahat Kabir", role: "EMPLOYER" as const },
      {
        email: "employer.consulting@company.com",
        fullName: "Mizanur Rahman",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.media@company.com",
        fullName: "Fahim Shahriar",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.hospitality@company.com",
        fullName: "Niaz Morshed",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.automotive@company.com",
        fullName: "Rashedul Islam",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.realestate@company.com",
        fullName: "Tariqul Islam",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.sheba@company.com",
        fullName: "Shehab Uddin",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.daraz@company.com",
        fullName: "Daraz HR Admin",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.ipdc@company.com",
        fullName: "IPDC Recruiting",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.beximco@company.com",
        fullName: "Beximco HR Department",
        role: "EMPLOYER" as const,
      },
    ];

    const seekersRaw = [
      // 10 Males (will use male Unsplash avatars)
      {
        email: "seeker.zahid@gmail.com",
        fullName: "Zahid Hasan",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.tanvir@gmail.com",
        fullName: "Tanvir Rahman",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.arif@gmail.com",
        fullName: "Arif Khan",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.john@gmail.com",
        fullName: "John Doe",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.david@gmail.com",
        fullName: "David Smith",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.michael@gmail.com",
        fullName: "Michael Johnson",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.liam@gmail.com",
        fullName: "Liam Wilson",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.alex@gmail.com",
        fullName: "Alex Rivera",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.james@gmail.com",
        fullName: "James Carter",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.robert@gmail.com",
        fullName: "Robert Brown",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      // 10 Females (will strictly use cat Unsplash avatars to satisfy NO girl images policy)
      {
        email: "seeker.sarah@gmail.com",
        fullName: "Sarah Connor",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
      {
        email: "seeker.sophia@gmail.com",
        fullName: "Sophia Garcia",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
      {
        email: "seeker.emily@gmail.com",
        fullName: "Emily Davis",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
      {
        email: "seeker.jessica@gmail.com",
        fullName: "Jessica Miller",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
      {
        email: "seeker.emma@gmail.com",
        fullName: "Emma Watson",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
      {
        email: "seeker.olivia@gmail.com",
        fullName: "Olivia Taylor",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
      {
        email: "seeker.ava@gmail.com",
        fullName: "Ava Thomas",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
      {
        email: "seeker.isabella@gmail.com",
        fullName: "Isabella White",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
      {
        email: "seeker.mia@gmail.com",
        fullName: "Mia Martinez",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
      {
        email: "seeker.charlotte@gmail.com",
        fullName: "Charlotte Robinson",
        role: "JOB_SEEKER" as const,
        gender: "female",
      },
    ];

    const maleAvatars = [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=256&h=256&auto=format&fit=crop",
    ];

    const catAvatars = [
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1513360309081-36f5e878fc11?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?q=80&w=256&h=256&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1548247416-ec66f4900b2e?q=80&w=256&h=256&auto=format&fit=crop",
    ];

    const natureCovers = [
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&h=300&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=800&h=300&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&h=300&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1472214222541-d510753a4907?q=80&w=800&h=300&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=800&h=300&auto=format&fit=crop",
    ];

    const users: Record<string, any> = {};
    const profiles: Record<string, any> = {};

    let userIdx = 0;
    const insertUserWithProfile = async (
      email: string,
      fullName: string,
      role: any,
      passwordHash: string,
      gender?: string,
      isPremium: boolean = false,
    ) => {
      const isFemale = gender === "female";
      const avatarUrl = isFemale
        ? catAvatars[userIdx % catAvatars.length]
        : maleAvatars[userIdx % maleAvatars.length];
      const coverUrl = natureCovers[userIdx % natureCovers.length];
      userIdx++;

      const profile = await prisma.profile.create({
        data: {
          bio: `Professional ${role.toLowerCase().replace("_", " ")} profile for ${fullName}. Focused on quality results and team dynamics.`,
          location: "Dhaka, Bangladesh",
          avatarUrl,
          coverUrl,
          headline:
            role === "JOB_SEEKER"
              ? "Senior Software Engineer | React & Node.js Expert"
              : "HR Recruiting Specialist",
          totalExperienceYears: role === "JOB_SEEKER" ? 4.5 : 8.0,
          userId: "TEMP_UUID",
          resumeUrl: "https://workly.com/resumes/sample-resume.pdf",
          videoResumeUrl: "https://workly.com/video-resumes/sample-video.mp4",
          linkedInUrl: `https://linkedin.com/in/${fullName.toLowerCase().replace(/\s+/g, "-")}`,
          websiteUrl: `https://${fullName.toLowerCase().replace(/\s+/g, "")}.dev`,
          githubUrl: `https://github.com/in/${fullName.toLowerCase().replace(/\s+/g, "-")}`,
          twitterUrl: `https://twitter.com/${fullName.toLowerCase().replace(/\s+/g, "")}`,
          facebookUrl: `https://facebook.com/${fullName.toLowerCase().replace(/\s+/g, "")}`,
        },
      });

      const user = await prisma.user.create({
        data: {
          email,
          fullName,
          role,
          passwordHash,
          isVerified: true,
          isActive: true,
          isPremium,
          profileId: profile.id,
        },
      });

      const updatedProfile = await prisma.profile.update({
        where: { id: profile.id },
        data: { userId: user.id },
      });

      await prisma.userSettings.create({
        data: {
          userId: user.id,
          profileVisibility: "PUBLIC",
          showEmail: true,
          showPhone: false,
        },
      });

      if (role === "JOB_SEEKER") {
        const planName = isPremium ? (Math.random() > 0.5 ? "Premium" : "Pro") : "Free";
        const seekerPlan = plans[`JOB_SEEKER_${planName}`];
        await prisma.userSubscription.create({
          data: {
            userId: user.id,
            planId: seekerPlan.id,
            status: "ACTIVE",
            startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          },
        });
      }

      users[email] = user;
      profiles[email] = updatedProfile;
    };

    // Dev users (3 Users)
    for (const u of devUsersRaw) {
      await insertUserWithProfile(
        u.email,
        u.fullName,
        u.role,
        u.passwordHash,
        u.role === "JOB_SEEKER" ? "male" : undefined,
        u.isPremium,
      );
    }
    // Additional Employers (15 Users)
    for (const u of employersRaw) {
      await insertUserWithProfile(u.email, u.fullName, u.role, commonUserPassword);
    }
    // Seekers (20 Users)
    for (const u of seekersRaw) {
      await insertUserWithProfile(
        u.email,
        u.fullName,
        u.role,
        commonUserPassword,
        u.gender,
        Math.random() > 0.5,
      );
    }

    console.log(`✅ Seeded ${Object.keys(users).length} users and profiles.`);

    // ======= 6. Seed Companies (20 Companies) & Subscriptions & CompanySettings =======
    console.log("🏢 Seeding 20 Companies, Settings & Subscriptions...");
    const companiesData = [
      {
        name: "BrainStation IT",
        slug: "brainstation-it",
        description: "BrainStation IT is a leading global software solutions provider.",
        websiteUrl: "https://brainstation.it",
        location: "Dhaka, Bangladesh",
        size: "100-500 employees",
        ownerEmail: "mdmuzahid7396@gmail.com",
        industrySlug: "software-it",
        planName: "emp_pro",
      },
      {
        name: "LankaBangla Finance",
        slug: "lankabangla-finance",
        description: "A premier financial institution providing investment broker services.",
        websiteUrl: "https://lankabangla.com",
        location: "Chittagong, Bangladesh",
        size: "500-1000 employees",
        ownerEmail: "employer.finance@company.com",
        industrySlug: "financial-services",
        planName: "emp_starter",
      },
      {
        name: "Arogga Healthcare",
        slug: "arogga-healthcare",
        description: "Arogga is an online pharmacy delivery app.",
        websiteUrl: "https://arogga.com",
        location: "Dhaka, Bangladesh",
        size: "50-100 employees",
        ownerEmail: "employer.health@company.com",
        industrySlug: "healthcare-biotech",
        planName: "emp_free",
      },
      {
        name: "10 Minute School",
        slug: "10-minute-school",
        description: "The largest online school platform in Bangladesh.",
        websiteUrl: "https://10minuteschool.com",
        location: "Dhaka, Bangladesh",
        size: "100-200 employees",
        ownerEmail: "employer.edu@company.com",
        industrySlug: "education-elearning",
        planName: "emp_starter",
      },
      {
        name: "Pathao Logistics",
        slug: "pathao-logistics",
        description: "Pathao logistics coordinates fast delivery and ride-sharing operations.",
        websiteUrl: "https://pathao.com",
        location: "Dhaka, Bangladesh",
        size: "200-500 employees",
        ownerEmail: "employer.logistics@company.com",
        industrySlug: "logistics-supply-chain",
        planName: "emp_pro",
      },
      {
        name: "Analyzen Digital",
        slug: "analyzen-digital",
        description: "Analyzen is a data-driven creative marketing agency.",
        websiteUrl: "https://analyzen.com",
        location: "Dhaka, Bangladesh",
        size: "50-100 employees",
        ownerEmail: "employer.marketing@company.com",
        industrySlug: "digital-marketing-agency",
        planName: "emp_starter",
      },
      {
        name: "Studio Dhaka",
        slug: "studio-dhaka",
        description: "A top-tier design agency focusing on UI/UX mockups and animation grids.",
        websiteUrl: "https://studiodhaka.com",
        location: "Dhaka, Bangladesh",
        size: "10-50 employees",
        ownerEmail: "employer.creative@company.com",
        industrySlug: "creative-arts-design",
        planName: "emp_free",
      },
      {
        name: "Grameenphone",
        slug: "grameenphone",
        description: "The leading telecommunications service provider in Bangladesh.",
        websiteUrl: "https://grameenphone.com",
        location: "Dhaka, Bangladesh",
        size: "1000+ employees",
        ownerEmail: "employer.telecom@company.com",
        industrySlug: "telecommunications",
        planName: "emp_pro",
      },
      {
        name: "Chaldal Grocery",
        slug: "chaldal-grocery",
        description: "An on-demand online grocery store service.",
        websiteUrl: "https://chaldal.com",
        location: "Dhaka, Bangladesh",
        size: "200-500 employees",
        ownerEmail: "employer.ecommerce@company.com",
        industrySlug: "ecommerce-retail",
        planName: "emp_starter",
      },
      {
        name: "bti Development",
        slug: "bti-development",
        description: "Building Technology & Ideas is a premier real estate construction group.",
        websiteUrl: "https://btibd.com",
        location: "Dhaka, Bangladesh",
        size: "100-500 employees",
        ownerEmail: "employer.tech@company.com",
        industrySlug: "construction-real-estate",
        planName: "emp_starter",
      },
      {
        name: "Apex Retail",
        slug: "apex-retail",
        description: "Apex is the leading footwear manufacturer and retailer.",
        websiteUrl: "https://apexfootwearltd.com",
        location: "Dhaka, Bangladesh",
        size: "1000+ employees",
        ownerEmail: "employer.retail@company.com",
        industrySlug: "ecommerce-retail",
        planName: "emp_starter",
      },
      {
        name: "Boston Consulting",
        slug: "boston-consulting",
        description: "Global management consulting firm advising local corporates.",
        websiteUrl: "https://bcg.com",
        location: "Dhaka, Bangladesh",
        size: "50-100 employees",
        ownerEmail: "employer.consulting@company.com",
        industrySlug: "human-resources-staffing",
        planName: "emp_enterprise",
      },
      {
        name: "Somoy Media",
        slug: "somoy-media",
        description: "Somoy TV is a 24-hour Bengali television channel.",
        websiteUrl: "https://somoynews.tv",
        location: "Dhaka, Bangladesh",
        size: "200-500 employees",
        ownerEmail: "employer.media@company.com",
        industrySlug: "media-entertainment",
        planName: "emp_ultimate",
      },
      {
        name: "InterContinental Dhaka",
        slug: "intercontinental-dhaka",
        description: "Luxury hotel offering international hospitality.",
        websiteUrl: "https://intercontinental.com",
        location: "Dhaka, Bangladesh",
        size: "100-200 employees",
        ownerEmail: "employer.hospitality@company.com",
        industrySlug: "hospitality-tourism",
        planName: "emp_starter",
      },
      {
        name: "Runner Automotive",
        slug: "runner-automotive",
        description: "Runner is a prominent motorcycle manufacturer.",
        websiteUrl: "https://runnerbd.com",
        location: "Dhaka, Bangladesh",
        size: "500-1000 employees",
        ownerEmail: "employer.automotive@company.com",
        industrySlug: "automotive",
        planName: "emp_pro",
      },
      {
        name: "Shanta Holdings",
        slug: "shanta-holdings",
        description: "Premier real estate developer in Bangladesh.",
        websiteUrl: "https://shantaholdings.com",
        location: "Dhaka, Bangladesh",
        size: "100-200 employees",
        ownerEmail: "employer.realestate@company.com",
        industrySlug: "construction-real-estate",
        planName: "emp_starter",
      },
      {
        name: "Sheba Platform",
        slug: "sheba-platform",
        description: "Service marketplace platform.",
        websiteUrl: "https://sheba.xyz",
        location: "Dhaka, Bangladesh",
        size: "100-200 employees",
        ownerEmail: "employer.sheba@company.com",
        industrySlug: "software-it",
        planName: "emp_pro",
      },
      {
        name: "Daraz E-commerce",
        slug: "daraz-ecommerce",
        description: "Largest online shopping mall in Bangladesh.",
        websiteUrl: "https://daraz.com.bd",
        location: "Dhaka, Bangladesh",
        size: "1000+ employees",
        ownerEmail: "employer.daraz@company.com",
        industrySlug: "ecommerce-retail",
        planName: "emp_enterprise",
      },
      {
        name: "IPDC Finance",
        slug: "ipdc-finance",
        description: "First private financial institution in the country.",
        websiteUrl: "https://ipdcbd.com",
        location: "Dhaka, Bangladesh",
        size: "100-500 employees",
        ownerEmail: "employer.ipdc@company.com",
        industrySlug: "financial-services",
        planName: "emp_starter",
      },
      {
        name: "Beximco Pharma",
        slug: "beximco-pharma",
        description: "Leading pharmaceutical manufacturer and exporter.",
        websiteUrl: "https://beximcopharma.com",
        location: "Dhaka, Bangladesh",
        size: "1000+ employees",
        ownerEmail: "employer.beximco@company.com",
        industrySlug: "healthcare-biotech",
        planName: "emp_pro",
      },
    ];

    const companies: Record<string, any> = {};
    const planMapping: Record<string, string> = {
      emp_free: "Free",
      emp_starter: "Growth",
      emp_growth: "Growth",
      emp_pro: "Growth",
      emp_enterprise: "Enterprise",
      emp_ultimate: "Enterprise",
    };

    for (let idx = 0; idx < companiesData.length; idx++) {
      const c = companiesData[idx];
      const owner = users[c.ownerEmail];
      const industry = industries[c.industrySlug];

      const company = await prisma.company.create({
        data: {
          name: c.name,
          slug: c.slug,
          description: c.description,
          websiteUrl: c.websiteUrl,
          location: c.location,
          size: c.size,
          logoUrl:
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=128&h=128&auto=format&fit=crop",
          coverUrl: natureCovers[idx % natureCovers.length],
          isVerified: true,
          industryId: industry.id,
          employees: { connect: { id: owner.id } },
          mission: `Empowering ${c.name} to achieve global excellence and innovation.`,
          values: ["Innovation", "Collaboration", "Integrity", "Excellence"],
          contactEmail: c.ownerEmail,
          contactPhone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
          founded: String(2010 + (idx % 15)),
        },
      });

      await prisma.user.update({
        where: { id: owner.id },
        data: { companyId: company.id },
      });

      await prisma.companySettings.create({
        data: {
          companyId: company.id,
          emailNotifications: true,
          applicationAlerts: true,
        },
      });

      const mappedName = planMapping[c.planName] || "Free";
      const plan = plans[`EMPLOYER_${mappedName}`];
      await prisma.subscription.create({
        data: {
          companyId: company.id,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        },
      });

      companies[c.slug] = company;
    }
    console.log(`✅ Seeded ${Object.keys(companies).length} companies and subscriptions.`);

    // ======= 7. Seed 20 Company SocialLinks & 20 Invoices =======
    console.log("🔗 Seeding 20 SocialLinks & 20 Invoices...");
    const companyList = Object.values(companies);
    for (let idx = 0; idx < companyList.length; idx++) {
      const comp = companyList[idx];
      await prisma.socialLink.create({
        data: {
          platform: "LinkedIn",
          url: `https://linkedin.com/company/${comp.slug}`,
          companyId: comp.id,
        },
      });

      await prisma.invoice.create({
        data: {
          companyId: comp.id,
          invoiceNumber: `INV-${comp.slug.toUpperCase()}-2026-${idx + 1}`,
          amount: 4999.0 + idx * 1000,
          status: "PAID",
          paidAt: new Date(),
        },
      });
    }

    // ======= 8. Seed 20 PaymentTransactions =======
    console.log("💳 Seeding 20 Payment Transactions...");
    for (let idx = 0; idx < 20; idx++) {
      const company = companyList[idx % companyList.length];
      const employer = await prisma.user.findFirst({ where: { companyId: company.id } });
      if (employer) {
        await prisma.paymentTransaction.create({
          data: {
            tranId: `TRAN-ID-ONYX-${1000 + idx}`,
            valId: `VAL-ID-${1000 + idx}`,
            sessionKey: `SESSION-KEY-ONYX-${1000 + idx}`,
            userId: employer.id,
            companyId: company.id,
            amount: 4999.0,
            currency: "BDT",
            status: "VALIDATED",
            category: "EMPLOYER_PLAN",
            planId: plans["EMPLOYER_Growth"].id,
            bankTranId: `BANK-TX-${2000 + idx}`,
            cardType: "VISA",
            storeAmount: 4999.0,
          },
        });
      }
    }

    // ======= 9. Seed Seeker Profile details (20 Seekers) =======
    console.log(
      "📜 Seeding Seeker profiles detail tables (Education, WorkExperience, Certification, Preference, Resume, Project, Address, Volunteer, Award, Publication, Reference, Language, VerificationToken, Skill)...",
    );
    const activeSeekers = Object.values(users).filter((u) => u.role === "JOB_SEEKER");

    for (let idx = 0; idx < activeSeekers.length; idx++) {
      const seeker = activeSeekers[idx];
      const p = profiles[seeker.email];

      // Educations
      await prisma.education.create({
        data: {
          profileId: p.id,
          institution: "University of Dhaka (DU)",
          degree: "B.Sc. in Software Engineering",
          fieldOfStudy: "Computer Science",
          startDate: new Date(2018, 1, 1),
          endDate: new Date(2022, 5, 1),
          grade: "3.72",
        },
      });

      // WorkExperiences
      await prisma.workExperience.create({
        data: {
          profileId: p.id,
          jobTitle: "Software Developer",
          company: "Pathao Ltd",
          startDate: new Date(2022, 6, 1),
          endDate: new Date(2024, 1, 1),
          description:
            "Responsible for full stack JavaScript development and API endpoints integration.",
        },
      });

      // Certifications (20 Certifications)
      await prisma.certification.create({
        data: {
          profileId: p.id,
          name: "AWS Certified Developer - Associate",
          issuingOrg: "Amazon Web Services (AWS)",
          issueDate: new Date(2024, 2, 15),
          credentialId: `AWS-DEV-CERT-${idx + 1000}`,
        },
      });

      // Preferences (20 Preferences)
      await prisma.preference.create({
        data: {
          profileId: p.id,
          jobType: "FULL_TIME",
          expectedSalary: 75000 + idx * 5000,
          preferredLocation: "Dhaka",
          remoteWork: idx % 2 === 0,
        },
      });

      // Resumes (20 Resumes)
      await prisma.resume.create({
        data: {
          userId: seeker.id,
          fileName: `${seeker.fullName.replace(" ", "_")}_Resume.pdf`,
          fileUrl: `https://workly-resumes.s3.amazonaws.com/${seeker.id}/resume.pdf`,
          fileSize: 1024 * 345, // 345 KB
          isDefault: true,
        },
      });

      // Projects (20 Projects)
      await prisma.project.create({
        data: {
          profileId: p.id,
          title: `Project ${idx + 1}: Workly Recruitment App`,
          description:
            "A professional platform for hiring recruiters and connecting talents with jobs.",
          technologies: ["React", "Express", "Prisma", "PostgreSQL"],
        },
      });

      // Address (20 Addresses)
      await prisma.address.create({
        data: {
          profileId: p.id,
          city: "Dhaka",
          state: "Dhaka Division",
          country: "Bangladesh",
        },
      });

      // Volunteer (20 Volunteers)
      await prisma.volunteer.create({
        data: {
          profileId: p.id,
          role: "Co-organizer / Mentor",
          organization: "Dhaka JS Community",
          description: "Mentoring junior Node.js and React developers.",
        },
      });

      // Award (20 Awards)
      await prisma.award.create({
        data: {
          profileId: p.id,
          title: "Top Innovator Award",
          issuer: "Basis SoftExpo",
          description: "Awarded for designing a low-latency microservice architecture.",
        },
      });

      // Publication (20 Publications)
      await prisma.publication.create({
        data: {
          profileId: p.id,
          title: `Journal of Software Science Vol. ${idx + 1}`,
          publisher: "IEEE Publication",
          description: "Research paper focused on scalable relational databases.",
        },
      });

      // Reference (20 References)
      await prisma.reference.create({
        data: {
          profileId: p.id,
          name: `Manager Reference ${idx + 1}`,
          relationship: "Former Supervisor",
          company: "Brain Station 23",
          email: `reference.${idx}@company.com`,
        },
      });

      // Language (20 Languages)
      await prisma.language.create({
        data: {
          profileId: p.id,
          language: "English",
          proficiency: "Professional Working Proficiency",
        },
      });

      // Verification Tokens (20 VerificationTokens)
      await prisma.verificationToken.create({
        data: {
          token: `token-secret-xyz-${idx}`,
          type: "EMAIL_VERIFICATION",
          userId: seeker.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Skills (60 Skills)
      const skills = ["React", "Node.js", "TypeScript"];
      for (const s of skills) {
        await prisma.skill.create({
          data: {
            skillName: s,
            experienceYears: 2.5,
            profileId: p.id,
          },
        });
      }
    }

    // ======= 10. Seed Jobs (20 Jobs), JobSkills (60) & Benefits (20) =======
    console.log("💼 Seeding 20 Jobs and JobSkills...");
    const jobsConfig = [
      {
        title: "Senior React Architect",
        discipline: "Engineering",
        slug: "senior-react-architect",
        company: "brainstation-it",
      },
      {
        title: "Backend Team Lead (Node.js)",
        discipline: "Engineering",
        slug: "backend-team-lead",
        company: "brainstation-it",
      },
      {
        title: "Risk Analyst Officer",
        discipline: "Finance",
        slug: "risk-analyst-officer",
        company: "lankabangla-finance",
      },
      {
        title: "Financial Investment Advisor",
        discipline: "Finance",
        slug: "investment-advisor",
        company: "lankabangla-finance",
      },
      {
        title: "Pharmacist & Medical Support",
        discipline: "Healthcare",
        slug: "pharmacist-support",
        company: "arogga-healthcare",
      },
      {
        title: "Medical Operations Specialist",
        discipline: "Healthcare",
        slug: "medical-operations",
        company: "arogga-healthcare",
      },
      {
        title: "Academic Content Creator",
        discipline: "Education",
        slug: "academic-content",
        company: "10-minute-school",
      },
      {
        title: "Senior Logistics Coordinator",
        discipline: "Logistics",
        slug: "logistics-coordinator",
        company: "pathao-logistics",
      },
      {
        title: "Creative Designer & Animator",
        discipline: "Marketing",
        slug: "creative-designer",
        company: "analyzen-digital",
      },
      {
        title: "Civil Project Engineer",
        discipline: "Construction",
        slug: "civil-engineer",
        company: "bti-development",
      },
      {
        title: "E-Commerce Growth Executive",
        discipline: "Marketing",
        slug: "growth-executive",
        company: "chaldal-grocery",
      },
      {
        title: "Core Network Systems Administrator",
        discipline: "Engineering",
        slug: "network-admin",
        company: "grameenphone",
      },
      {
        title: "Senior Flutter Mobile Developer",
        discipline: "Engineering",
        slug: "flutter-developer",
        company: "brainstation-it",
      },
      {
        title: "Digital Campaign Strategist",
        discipline: "Marketing",
        slug: "campaign-strategist",
        company: "analyzen-digital",
      },
      {
        title: "Creative Art Lead",
        discipline: "Design",
        slug: "art-lead",
        company: "studio-dhaka",
      },
      {
        title: "Supply Chain Manager",
        discipline: "Logistics",
        slug: "supply-chain-mgr",
        company: "pathao-logistics",
      },
      {
        title: "QA Engineer Automation",
        discipline: "Engineering",
        slug: "qa-automation",
        company: "sheba-platform",
      },
      {
        title: "Marketing Lead",
        discipline: "Marketing",
        slug: "marketing-lead",
        company: "daraz-ecommerce",
      },
      {
        title: "Investment Banking Associate",
        discipline: "Finance",
        slug: "ib-associate",
        company: "ipdc-finance",
      },
      {
        title: "Chemical Lab Researcher",
        discipline: "Healthcare",
        slug: "chemical-researcher",
        company: "beximco-pharma",
      },
    ];

    const disciplineDetails: Record<
      string,
      {
        description: string;
        requirements: string[];
        benefits: string[];
        skills: string[];
      }
    > = {
      Engineering: {
        description:
          "Excellent opportunity for a Senior/Lead engineer. Join a fast-growing tech team to build high-performance, scalable web and mobile applications using modern frameworks and cloud platforms.",
        requirements: [
          "5+ years of software development experience.",
          "Solid knowledge of relational databases and system design.",
          "Proficiency in modern programming paradigms and version control.",
          "Strong communication and engineering leadership potential.",
        ],
        benefits: ["Remote work support", "Premium medical coverage", "Yearly education allowance"],
        skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"],
      },
      Finance: {
        description:
          "Seeking a detail-oriented professional to guide financial assessments, evaluate market risk, and manage corporate asset portfolios.",
        requirements: [
          "Bachelor's degree in Finance, Economics, or related fields.",
          "Proven analytical skills with complex spreadsheets and accounting software.",
          "Familiarity with national bank compliance and regulatory frameworks.",
          "Strong reporting and numerical modeling capabilities.",
        ],
        benefits: ["Performance bonuses", "Provident fund", "Paid maternity/paternity leave"],
        skills: ["Excel", "Risk Management", "Financial Analysis", "Accounting", "SQL"],
      },
      Healthcare: {
        description:
          "Join our healthcare team to coordinate patient support operations, handle pharmaceutical inventory, and run bio-medical lab research.",
        requirements: [
          "Graduate degree in Pharmacy, Nursing, or related sciences.",
          "Deep understanding of pharmaceutical safety and drug interactions.",
          "Strong patient-first service mindset and clinical skills.",
          "Willingness to work flexible shifts in medical centers.",
        ],
        benefits: ["Health insurance for family", "Overtime allowance", "Annual health screenings"],
        skills: [
          "Pharmacy Operations",
          "Clinical Care",
          "Patient Relations",
          "Medical Safety",
          "EHR Systems",
        ],
      },
      Education: {
        description:
          "Help shape the future of learning by creating high-quality e-learning materials, designing academic curriculums, and mentoring online class groups.",
        requirements: [
          "Strong academic record in science, math, or language fields.",
          "Experience presenting and teaching complex topics clearly to large audiences.",
          "Proficiency with online teaching platforms and screen capture software.",
          "Passion for democratizing education access.",
        ],
        benefits: [
          "Flexible teaching hours",
          "Home studio setup allowance",
          "Performance-based bonuses",
        ],
        skills: [
          "Content Creation",
          "Teaching",
          "Curriculum Design",
          "Video Editing",
          "Presentation",
        ],
      },
      Logistics: {
        description:
          "We are looking for a coordinator to streamline supply chain flows, optimize distribution routing, and manage heavy transport/delivery tracking systems.",
        requirements: [
          "Bachelor's degree in Business Administration or Supply Chain Management.",
          "Experience coordinating third-party courier services and drivers.",
          "High adaptability in solving real-time shipping delays and issues.",
          "Experience using inventory and GPS tracking software.",
        ],
        benefits: ["Transport allowance", "Subsidized lunch", "Festival bonuses"],
        skills: [
          "Supply Chain",
          "Route Planning",
          "Inventory Management",
          "ERP Software",
          "Vendor Relations",
        ],
      },
      Marketing: {
        description:
          "Lead our creative brand campaigns, coordinate social media outreach, run analytics audit loops, and plan paid media acquisition strategies.",
        requirements: [
          "3+ years managing digital marketing budgets and ads.",
          "Proficiency in Google Analytics, SEO tools, and Facebook Ads Manager.",
          "Excellent copywriting, visual storytelling, and communication skills.",
          "Data-driven mindset focusing on customer acquisition cost (CAC).",
        ],
        benefits: ["Performance commissions", "Gym membership", "Modern workspace tools"],
        skills: ["SEO", "Google Analytics", "Paid Acquisition", "Copywriting", "Social Media"],
      },
      Construction: {
        description:
          "Manage civil development works, review architectural schematics, oversee contractor progress on site, and enforce strict safety standards.",
        requirements: [
          "Degree in Civil Engineering or Construction Management.",
          "Familiarity with AutoCAD, BIM modeling, and site planning tools.",
          "Solid leadership skills to direct labor crews on site.",
          "Knowledge of local safety codes and zoning laws.",
        ],
        benefits: [
          "Mobile phone package",
          "On-site accommodation support",
          "Annual incentive bonus",
        ],
        skills: [
          "AutoCAD",
          "Structural Engineering",
          "Project Management",
          "Site Safety",
          "Estimating",
        ],
      },
      Design: {
        description:
          "Help craft visual experiences. Design beautiful app layouts, draw vector brand assets, and collaborate closely with product management teams.",
        requirements: [
          "Exceptional portfolio of UI/UX layouts or graphic designs.",
          "Expert command of Figma, Adobe Illustrator, and Photoshop.",
          "Good intuition for typography, grid systems, and component micro-animations.",
          "Strong communication to present and defend design choices.",
        ],
        benefits: [
          "Premium hardware (MacBook)",
          "Design team offsites",
          "Flexible working location",
        ],
        skills: ["Figma", "UI/UX Design", "Illustrator", "Brand Design", "Wireframing"],
      },
    };

    const jobs: Record<string, any> = {};

    for (let idx = 0; idx < jobsConfig.length; idx++) {
      const jConf = jobsConfig[idx];
      const comp = companies[jConf.company];
      const poster = await prisma.user.findFirst({ where: { companyId: comp.id } });
      if (!poster) continue;

      const details = disciplineDetails[jConf.discipline] || {
        description: `Excellent opportunity for a ${jConf.title}. Work with modern technologies, enjoy competitive salaries, and join a high-performing collaborative team.`,
        requirements: [
          "Proven experience in the respective field.",
          "Strong teamwork and communication abilities.",
        ],
        benefits: ["Medical Insurance", "Performance Bonus", "Flexible Hours"],
        skills: ["React", "PostgreSQL", "Figma"],
      };

      const job = await prisma.job.create({
        data: {
          title: jConf.title,
          slug: `${jConf.slug}-${comp.slug}`,
          discipline: jConf.discipline,
          description: details.description,
          requirements: details.requirements,
          jobType: idx % 4 === 0 ? "CONTRACT" : idx % 5 === 0 ? "PART_TIME" : "FULL_TIME",
          location: idx % 3 === 0 ? "Chittagong, Bangladesh" : "Dhaka, Bangladesh",
          experienceLevel:
            idx % 3 === 0 ? "Senior Level" : idx % 2 === 0 ? "Mid Level" : "Entry Level",
          isRemote: idx % 3 === 0,
          salaryMin: 45000 + idx * 5000,
          salaryMax: 80000 + idx * 7000,
          currency: "BDT",
          status: "ACTIVE",
          isFeatured: idx % 2 === 0,
          companyId: comp.id,
          postedById: poster.id,
          industryId: comp.industryId,
          contactEmail: poster.email,
          applicationDeadline: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), // 2.5 months in future (at least 2 months)
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months in future (at least 2 months)
          maxApplications: 100,
          autoCloseApplications: false,
          benefits: details.benefits,
        },
      });

      // Benefits entries
      for (const b of details.benefits) {
        await prisma.benefits.create({
          data: {
            title: b,
            description: `Top-tier benefit option for ${job.title} roles.`,
            jobId: job.id,
          },
        });
      }

      // Job Skills entries
      for (const s of details.skills) {
        await prisma.jobSkill.create({
          data: {
            skillName: s,
            experienceYears: 2.0 + (idx % 3),
            isRequired: true,
            priority: idx % 2 === 0 ? "HIGH" : "MEDIUM",
            jobId: job.id,
          },
        });
      }

      jobs[job.slug] = job;
    }
    console.log(`✅ Seeded ${Object.keys(jobs).length} jobs, job skills, and benefits.`);

    const jobsList = Object.values(jobs);

    // ======= 11. Seed SavedJobs (20 SavedJobs) =======
    console.log("💾 Seeding 20 Saved Jobs...");
    for (let idx = 0; idx < activeSeekers.length; idx++) {
      const seeker = activeSeekers[idx];
      const job = jobsList[idx % jobsList.length];
      await prisma.savedJob.create({
        data: {
          userId: seeker.id,
          jobId: job.id,
          notes: "Need to review cover letter before submitting.",
        },
      });
    }

    // ======= 12. Seed Applications (60 applications) & Notifications (60) =======
    console.log("📝 Seeding 60 applications...");
    let appCount = 0;

    for (let sIdx = 0; sIdx < activeSeekers.length; sIdx++) {
      const seeker = activeSeekers[sIdx];
      // Apply to 3 jobs per seeker (20 * 3 = 60 applications)
      for (let jIdx = 0; jIdx < 3; jIdx++) {
        const job = jobsList[(sIdx + jIdx) % jobsList.length];
        const statuses = [
          "SUBMITTED",
          "REVIEWING",
          "SHORTLISTED",
          "INTERVIEWED",
          "REJECTED",
          "ACCEPTED",
        ];
        const status = statuses[(sIdx + jIdx) % statuses.length];

        const app = await prisma.application
          .create({
            data: {
              status: status as any,
              coverLetter: `Hi, I am excited to submit my resume for the ${job.title} vacancy. I have a strong background in software deployment.`,
              fullName: seeker.fullName,
              email: seeker.email,
              applicantId: seeker.id,
              jobId: job.id,
            },
          })
          .catch(() => null);

        if (app) {
          appCount++;

          // Notifications
          await prisma.notification.create({
            data: {
              type: "APPLICATION_RECEIVED",
              title: "Job Application",
              message: `Your application to ${job.title} was submitted.`,
              userId: seeker.id,
              applicationId: app.id,
            },
          });
        }
      }
    }
    console.log(`✅ Seeded ${appCount} job applications and notification logs.`);

    // ======= 13. Seed 20 SavedCandidates & 40 Follows =======
    console.log("💾 Seeding Candidate Saves & Follows...");
    let saveCandCount = 0;
    let followCount = 0;

    for (let idx = 0; idx < activeSeekers.length; idx++) {
      const seeker = activeSeekers[idx];
      const comp = companyList[idx % companyList.length];
      const employer = await prisma.user.findFirst({ where: { companyId: comp.id } });

      if (employer) {
        // Saved Candidates (20 SavedCandidate records)
        await prisma.savedCandidate.create({
          data: {
            employerId: employer.id,
            candidateId: seeker.id,
            notes: "Strong candidate with great backend knowledge.",
          },
        });
        saveCandCount++;
      }

      // Follows (20 follows)
      await prisma.follow.create({
        data: {
          userId: seeker.id,
          companyId: comp.id,
        },
      });
      followCount++;
    }

    // Additional follows to make it 40 follows
    for (let idx = 0; idx < 20; idx++) {
      const seeker = activeSeekers[idx % activeSeekers.length];
      const comp = companyList[(idx + 3) % companyList.length];
      await prisma.follow
        .create({
          data: { userId: seeker.id, companyId: comp.id },
        })
        .catch(() => {}); // ignore duplicates
      followCount++;
    }

    console.log(`✅ Seeded ${saveCandCount} saved candidates, ${followCount} follows.`);

    // ======= 14. Seed 20 Conversations, 40 Participants & 60 Messages =======
    console.log("💬 Seeding 20 Conversations & 60 Messages...");
    const applications = await prisma.application.findMany({ take: 20 });
    let messageCount = 0;

    for (let idx = 0; idx < applications.length; idx++) {
      const app = applications[idx];
      const job = await prisma.job.findUnique({ where: { id: app.jobId } });
      if (job) {
        const conversation = await prisma.conversation.create({
          data: { applicationId: app.id },
        });

        // Add participants (40 total)
        await prisma.conversationParticipant.create({
          data: { conversationId: conversation.id, userId: app.applicantId },
        });
        await prisma.conversationParticipant.create({
          data: { conversationId: conversation.id, userId: job.postedById },
        });

        // Add 3 messages per conversation (60 total)
        const msg1 = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: app.applicantId,
            content: "Hello! I am following up on my application.",
          },
        });
        const msg2 = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: job.postedById,
            content: "Thank you for reaching out. We are currently reviewing resumes.",
          },
        });
        const msg3 = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: app.applicantId,
            content: "Great, I look forward to hearing from you.",
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageId: msg3.id },
        });

        messageCount += 3;
      }
    }
    console.log(`✅ Seeded ${applications.length} conversations and ${messageCount} messages.`);

    // ======= 15. Seed Telemetry Views (80 JobViews, 40 ProfileViews) & 20 AuditLogs & 20 JobReports =======
    console.log("📈 Seeding Telemetry views, audit logs, job reports...");
    // Job Views (80 total)
    for (let idx = 0; idx < 80; idx++) {
      const job = jobsList[idx % jobsList.length];
      const seeker = activeSeekers[idx % activeSeekers.length];
      await prisma.jobView.create({
        data: {
          jobId: job.id,
          userId: idx % 4 === 0 ? null : seeker.id,
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        },
      });
    }

    // Profile Views (40 total)
    for (let idx = 0; idx < 40; idx++) {
      const seeker = activeSeekers[idx % activeSeekers.length];
      const company = companyList[idx % companyList.length];
      const employer = await prisma.user.findFirst({ where: { companyId: company.id } });
      await prisma.profileView.create({
        data: {
          viewedUserId: seeker.id,
          viewerId: employer ? employer.id : null,
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        },
      });
    }

    // Audit logs (20 total)
    for (let idx = 0; idx < 20; idx++) {
      await prisma.auditLog.create({
        data: {
          entityType: "USER",
          entityId: activeSeekers[idx % activeSeekers.length].id,
          action: "PROFILE_UPDATE",
          ipAddress: "127.0.0.1",
          userAgent: "Workly Seeder",
        },
      });
    }

    // Job Reports (20 total)
    for (let idx = 0; idx < 20; idx++) {
      const job = jobsList[idx % jobsList.length];
      const seeker = activeSeekers[idx % activeSeekers.length];
      await prisma.jobReport.create({
        data: {
          jobId: job.id,
          reporterId: seeker.id,
          reason: "Spam / Misleading information",
          comment:
            "The salary range listed in the job description is different from what was discussed.",
          severity: "MEDIUM",
          status: "OPEN",
        },
      });
    }

    console.log("🎉 Database seeding data insertion completed!");

    // ======= 16. Verify & Display Database Model Counts =======
    console.log("\n📊 Verification Table (Database Counts):");
    const counts = [
      { Model: "User", Count: await prisma.user.count() },
      { Model: "Profile", Count: await prisma.profile.count() },
      { Model: "Education", Count: await prisma.education.count() },
      { Model: "WorkExperience", Count: await prisma.workExperience.count() },
      { Model: "Certification", Count: await prisma.certification.count() },
      { Model: "Skill", Count: await prisma.skill.count() },
      { Model: "Project", Count: await prisma.project.count() },
      { Model: "Preference", Count: await prisma.preference.count() },
      { Model: "Company", Count: await prisma.company.count() },
      { Model: "Benefits", Count: await prisma.benefits.count() },
      { Model: "SocialLink", Count: await prisma.socialLink.count() },
      { Model: "Industry", Count: await prisma.industry.count() },
      { Model: "Job", Count: await prisma.job.count() },
      { Model: "JobSkill", Count: await prisma.jobSkill.count() },
      { Model: "Application", Count: await prisma.application.count() },
      { Model: "SavedJob", Count: await prisma.savedJob.count() },
      { Model: "SavedCandidate", Count: await prisma.savedCandidate.count() },
      { Model: "Conversation", Count: await prisma.conversation.count() },
      { Model: "ConversationParticipant", Count: await prisma.conversationParticipant.count() },
      { Model: "Message", Count: await prisma.message.count() },
      { Model: "Notification", Count: await prisma.notification.count() },
      { Model: "ProfileView", Count: await prisma.profileView.count() },
      { Model: "JobView", Count: await prisma.jobView.count() },
      { Model: "Follow", Count: await prisma.follow.count() },
      { Model: "Plan", Count: await prisma.plan.count() },
      { Model: "Subscription", Count: await prisma.subscription.count() },
      { Model: "Invoice", Count: await prisma.invoice.count() },
      { Model: "CompanySettings", Count: await prisma.companySettings.count() },
      { Model: "UserSettings", Count: await prisma.userSettings.count() },
      { Model: "Resume", Count: await prisma.resume.count() },
      { Model: "VerificationToken", Count: await prisma.verificationToken.count() },
      { Model: "AuditLog", Count: await prisma.auditLog.count() },
      { Model: "RateLimit", Count: await prisma.rateLimit.count() },
      { Model: "Address", Count: await prisma.address.count() },
      { Model: "Volunteer", Count: await prisma.volunteer.count() },
      { Model: "Award", Count: await prisma.award.count() },
      { Model: "Publication", Count: await prisma.publication.count() },
      { Model: "Reference", Count: await prisma.reference.count() },
      { Model: "Language", Count: await prisma.language.count() },
      { Model: "LegalDocument", Count: await prisma.legalDocument.count() },
      { Model: "JobReport", Count: await prisma.jobReport.count() },
      { Model: "SystemSettings", Count: await prisma.systemSettings.count() },
      { Model: "PaymentTransaction", Count: await prisma.paymentTransaction.count() },
    ];

    console.table(counts);

    const checkFailed = counts.some((m) => m.Model !== "Plan" && m.Count < 20);
    if (checkFailed) {
      console.warn("⚠️ Warning: Some tables have fewer than 20 elements!");
    } else {
      console.log(
        "✨ All 43 tables successfully seeded with a minimum of 20 elements (excluding Plan)!",
      );
    }

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("🔌 Database connection closed.");
    process.exit(0);
  }
};

seedDatabase();
