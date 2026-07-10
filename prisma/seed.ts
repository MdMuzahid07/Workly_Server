import prisma from "../src/utils/prismaClient.js";
import bcrypt from "bcrypt";

const seedDatabase = async () => {
  // P0.1 / B3 — Production guard for prisma/seed.ts
  // This file runs standalone via `pnpm db:seed` / `prisma db seed` and can
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
          durationMonths: 0,
          displayFeatures: [
            "1 active job listing",
            "1 user account",
            "Standard applicant tracking",
          ],
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
          durationMonths: 1,
          displayFeatures: [
            "10 active job listings",
            "4 user accounts",
            "Direct candidate messaging",
            "Basic analytics dashboard",
          ],
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
          durationMonths: 1,
          displayFeatures: [
            "Unlimited active jobs",
            "Unlimited user accounts",
            "Direct candidate messaging",
            "Advanced analytics dashboard",
            "Priority customer support",
          ],
        },
        maxActiveJobs: 9999,
        maxUsers: 9999,
        isActive: true,
      },
      // Job Seeker plans
      {
        name: "Free",
        planType: "JOB_SEEKER" as const,
        description: "Start your job search with essential tools at no cost.",
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
          durationMonths: 0,
          displayFeatures: [
            "40 job applications per month",
            "1 active CV upload",
            "Standard algorithmic ranking",
            "7-day view history",
            "Standard in-app alerts",
            "Basic application status",
          ],
        },
        maxActiveJobs: 0,
        maxUsers: 0,
        isActive: true,
      },
      {
        name: "Starter",
        planType: "JOB_SEEKER" as const,
        description: "1-month premium access. Great entry point for active job seekers.",
        price: 90.0,
        currency: "BDT",
        interval: "month",
        features: {
          maxActiveJobs: 0,
          maxUsers: 0,
          maxMonthlyApplications: 200,
          maxResumes: 5,
          canMessage: false,
          canViewAnalytics: false,
          canViewProfileAnalytics: true,
          isFeaturedProfile: false,
          canMessageEmployer: true,
          durationMonths: 1,
          firstTimeDiscountPercent: 45,
          displayFeatures: [
            "200 job applications per month",
            "5 active CV uploads",
            "Direct messaging to HR",
            "30-day view history",
            "Priority real-time alerts",
            "Detailed stage tracking",
          ],
        },
        maxActiveJobs: 0,
        maxUsers: 0,
        isActive: true,
      },
      {
        name: "Pro",
        planType: "JOB_SEEKER" as const,
        description: "2-month premium access. Better value for sustained job searching.",
        price: 160.0,
        currency: "BDT",
        interval: "month",
        features: {
          maxActiveJobs: 0,
          maxUsers: 0,
          maxMonthlyApplications: 300,
          maxResumes: 10,
          canMessage: false,
          canViewAnalytics: false,
          canViewProfileAnalytics: true,
          isFeaturedProfile: false,
          canMessageEmployer: true,
          durationMonths: 2,
          firstTimeDiscountPercent: 35,
          displayFeatures: [
            "300 job applications per month",
            "10 active CV uploads",
            "Direct messaging to HR",
            "30-day view history",
            "Priority real-time alerts",
            "Detailed stage tracking",
            "Advanced search optimization",
          ],
        },
        maxActiveJobs: 0,
        maxUsers: 0,
        isActive: true,
      },
      {
        name: "Premium",
        planType: "JOB_SEEKER" as const,
        description: "3-month premium access. Maximum visibility with Featured Candidate status.",
        price: 225.0,
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
          durationMonths: 3,
          firstTimeDiscountPercent: 25,
          displayFeatures: [
            "Unlimited job applications",
            "Unlimited CV uploads",
            "Direct messaging to HR",
            "Full view history (90 days)",
            "Priority real-time alerts",
            "Detailed stage tracking",
            "Featured candidate profile",
          ],
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
    console.log("🏢 Seeding 20 industries with taxonomy skills...");
    const industriesData = [
      {
        name: "Software & IT",
        slug: "software-it",
        icon: "code",
        subcategories: [
          "Frontend Development",
          "Backend Development",
          "Mobile App Development",
          "DevOps & Cloud",
          "Data Science & AI",
          "Cybersecurity",
        ],
        skills: [
          "React.js",
          "Node.js",
          "TypeScript",
          "Python",
          "SQL",
          "Docker",
          "AWS",
          "Next.js",
          "Go",
          "Java",
          "Kubernetes",
          "Git",
        ],
      },
      {
        name: "Financial Services",
        slug: "financial-services",
        icon: "banknote",
        subcategories: [
          "Investment Banking",
          "Corporate Finance",
          "Wealth Management",
          "Risk Management",
          "Accounting & Audit",
          "Fintech",
        ],
        skills: [
          "Financial Modeling",
          "Portfolio Management",
          "Risk Analysis",
          "Excel",
          "Accounting",
          "Bloomberg Terminal",
          "Taxation",
          "Valuation",
        ],
      },
      {
        name: "Healthcare & Biotech",
        slug: "healthcare-biotech",
        icon: "activity",
        subcategories: [
          "Clinical Medicine",
          "Nursing",
          "Pharmaceuticals",
          "Biotechnology",
          "Medical Research",
          "Healthcare Admin",
        ],
        skills: [
          "Clinical Research",
          "Bioinformatics",
          "Data Analysis",
          "Laboratory Safety",
          "PCR",
          "EMR/EHR Systems",
          "Medical Devices",
          "Genomics",
        ],
      },
      {
        name: "Education & E-Learning",
        slug: "education-elearning",
        icon: "graduation-cap",
        subcategories: [
          "K-12 Education",
          "Higher Education",
          "Online Tutoring",
          "Corporate Training",
          "Special Education",
          "EdTech",
        ],
        skills: [
          "Curriculum Design",
          "Instructional Design",
          "LMS (Moodle)",
          "Public Speaking",
          "Classroom Management",
          "E-Learning Content Creation",
        ],
      },
      {
        name: "Logistics & Supply Chain",
        slug: "logistics-supply-chain",
        icon: "truck",
        subcategories: [
          "Warehousing & Storage",
          "Freight Forwarding",
          "Procurement & Sourcing",
          "Fleet Management",
          "Supply Chain Planning",
        ],
        skills: [
          "Inventory Management",
          "Supply Chain Optimization",
          "Procurement",
          "Warehouse Management",
          "SAP ERP",
          "Logistics Planning",
        ],
      },
      {
        name: "Digital Marketing & Agency",
        slug: "digital-marketing-agency",
        icon: "megaphone",
        subcategories: [
          "SEO & SEM",
          "Social Media Management",
          "Content Marketing",
          "Email Marketing",
          "Brand Strategy",
          "Affiliate Marketing",
        ],
        skills: [
          "SEO",
          "Google Analytics",
          "Content Writing",
          "Social Media Marketing",
          "Copywriting",
          "Email Marketing",
          "PPC Advertising",
        ],
      },
      {
        name: "Creative Arts & Design",
        slug: "creative-arts-design",
        icon: "palette",
        subcategories: [
          "Graphic Design",
          "UI/UX Design",
          "Motion Graphics",
          "3D Animation",
          "Fashion Design",
          "Interior Design",
        ],
        skills: [
          "UI/UX Design",
          "Figma",
          "Adobe Photoshop",
          "Adobe Illustrator",
          "Graphic Design",
          "3D Modeling",
          "Video Editing",
          "Motion Graphics",
        ],
      },
      {
        name: "Telecommunications",
        slug: "telecommunications",
        icon: "phone",
        subcategories: [
          "Network Engineering",
          "Wireless Communications",
          "VoIP Services",
          "Fiber Optics Infrastructure",
          "Telecom Admin",
        ],
        skills: [
          "Network Protocols",
          "5G Technology",
          "VoIP",
          "Wireless Systems",
          "Fibre Optics",
          "Cisco Routers",
          "Telecommunication Engineering",
        ],
      },
      {
        name: "E-Commerce & Retail",
        slug: "ecommerce-retail",
        icon: "shopping-bag",
        subcategories: [
          "Online Store Management",
          "Retail Sales",
          "Inventory Control",
          "Customer Experience",
          "Product Merchandising",
        ],
        skills: [
          "Shopify",
          "Inventory Control",
          "Customer Relationship Management (CRM)",
          "E-Commerce Strategy",
          "Sales Analytics",
          "Customer Support",
        ],
      },
      {
        name: "Construction & Real Estate",
        slug: "construction-real-estate",
        icon: "building",
        subcategories: [
          "Civil Engineering",
          "Project Management",
          "Architecture",
          "Property Management",
          "Real Estate Brokerage",
          "Quantity Surveying",
        ],
        skills: [
          "AutoCAD",
          "Project Management",
          "Construction Safety",
          "Estimation",
          "Site Supervision",
          "Real Estate Valuation",
          "BIM",
        ],
      },
      {
        name: "Hospitality & Tourism",
        slug: "hospitality-tourism",
        icon: "plane",
        subcategories: [
          "Hotel Operations",
          "Food & Beverage",
          "Event Management",
          "Travel Agency Services",
          "Tour Guiding",
        ],
        skills: [
          "Event Planning",
          "Hotel Management",
          "Customer Service",
          "Catering Operations",
          "Travel Planning",
          "Front Office Operations",
        ],
      },
      {
        name: "Energy & Utilities",
        slug: "energy-utilities",
        icon: "zap",
        subcategories: [
          "Renewable Energy",
          "Oil & Gas",
          "Power Plant Operations",
          "Electrical Grid Maintenance",
          "Water Utilities",
        ],
        skills: [
          "Renewable Energy",
          "Smart Grids",
          "Utility Operations",
          "Power Distribution",
          "Energy Auditing",
          "Environmental Safety",
        ],
      },
      {
        name: "Automotive",
        slug: "automotive",
        icon: "car",
        subcategories: [
          "Vehicle Diagnostics",
          "Mechanical Repair",
          "Auto Parts Retail",
          "Automotive Design",
          "Electric Vehicles",
        ],
        skills: [
          "Automotive Diagnostics",
          "CAD Design",
          "Engine Tuning",
          "Vehicle Maintenance",
          "Embedded Systems",
          "Robotic Assembly",
        ],
      },
      {
        name: "Media & Entertainment",
        slug: "media-entertainment",
        icon: "tv",
        subcategories: [
          "Video Production",
          "Broadcasting",
          "Journalism",
          "Audio Production",
          "Public Relations",
          "Photography",
        ],
        skills: [
          "Script Writing",
          "Video Production",
          "Broadcasting",
          "Journalism",
          "Audio Engineering",
          "Social Media Strategy",
          "Photography",
        ],
      },
      {
        name: "Agriculture & Farming",
        slug: "agriculture-farming",
        icon: "leaf",
        subcategories: [
          "Crop Farming",
          "Livestock Management",
          "Horticulture",
          "Aquaculture",
          "Agricultural Tech",
          "Agribusiness",
        ],
        skills: [
          "Soil Science",
          "Crop Protection",
          "Hydroponics",
          "Farming Equipment Operations",
          "Irrigation Systems",
          "Agribusiness Management",
        ],
      },
      {
        name: "Manufacturing & Production",
        slug: "manufacturing-production",
        icon: "wrench",
        subcategories: [
          "Assembly Line Operations",
          "Quality Assurance",
          "Industrial Engineering",
          "Machining & CNC",
          "Operations Management",
        ],
        skills: [
          "Quality Control",
          "Lean Manufacturing",
          "Assembly Line Operations",
          "CNC Programming",
          "Six Sigma",
          "Supply Planning",
        ],
      },
      {
        name: "Aerospace & Defense",
        slug: "aerospace-defense",
        icon: "plane-takeoff",
        subcategories: [
          "Aeronautical Engineering",
          "Avionics Maintenance",
          "Defense Consulting",
          "Space Exploration Tech",
          "Systems Security",
        ],
        skills: [
          "Aerodynamics",
          "Avionics",
          "Defense Systems Analysis",
          "Propulsion Systems",
          "CAD Modeling",
          "Systems Engineering",
        ],
      },
      {
        name: "Non-Profit & NGO",
        slug: "non-profit-ngo",
        icon: "heart",
        subcategories: [
          "Fundraising",
          "Grant Management",
          "Community Outreach",
          "Social Work",
          "Policy & Advocacy",
        ],
        skills: [
          "Grant Writing",
          "Fundraising",
          "Community Organizing",
          "Program Management",
          "Advocacy",
          "Volunteer Coordination",
        ],
      },
      {
        name: "Legal Services",
        slug: "legal-services",
        icon: "scale",
        subcategories: [
          "Corporate Law",
          "Criminal Defense",
          "Intellectual Property",
          "Family Law",
          "Legal Operations",
          "Contract Law",
        ],
        skills: [
          "Legal Research",
          "Contract Drafting",
          "Litigation Support",
          "Corporate Law",
          "Intellectual Property",
          "Client Mediation",
        ],
      },
      {
        name: "Human Resources & Staffing",
        slug: "human-resources-staffing",
        icon: "users",
        subcategories: [
          "Recruitment & Staffing",
          "Employee Relations",
          "Compensation & Benefits",
          "Talent Management",
          "HR Operations",
        ],
        skills: [
          "Talent Acquisition",
          "Employee Relations",
          "HRIS Systems",
          "Performance Management",
          "Conflict Resolution",
          "Onboarding",
        ],
      },
    ];

    const industries: Record<string, any> = {};
    for (const ind of industriesData) {
      const { skills, ...industryData } = ind;
      const createdIndustry = await prisma.industry.create({ data: industryData });
      industries[ind.slug] = createdIndustry;

      if (skills && skills.length > 0) {
        await prisma.taxonomySkill.createMany({
          data: skills.map((skillName) => ({
            name: skillName,
            industryId: createdIndustry.id,
          })),
        });
      }
    }
    console.log(`✅ Seeded ${Object.keys(industries).length} industries with taxonomy skills.`);

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
      {
        email: "employer.agritech@company.com",
        fullName: "Saiful Islam",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.energy@company.com",
        fullName: "Farhan Ahmed",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.pharma@company.com",
        fullName: "Masud Rana",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.cyber@company.com",
        fullName: "Tasnim Rahman",
        role: "EMPLOYER" as const,
      },
      {
        email: "employer.cloud@company.com",
        fullName: "Riyad Khan",
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
      {
        email: "seeker.saiful@gmail.com",
        fullName: "Saiful Rahman",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.farhan@gmail.com",
        fullName: "Farhan Chowdhury",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.masud@gmail.com",
        fullName: "Masud Alom",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.tasnim@gmail.com",
        fullName: "Tasnim Ahmed",
        role: "JOB_SEEKER" as const,
        gender: "male",
      },
      {
        email: "seeker.riyad@gmail.com",
        fullName: "Riyad Hasan",
        role: "JOB_SEEKER" as const,
        gender: "male",
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
        description:
          "BrainStation IT is a leading global software solutions provider, specialized in enterprise application development, cloud solutions, and system integration. We partner with companies worldwide to build high-performance software products that drive digital transformation.",
        websiteUrl: "https://brainstation.it",
        location: "Dhaka, Bangladesh",
        size: "100-500 employees",
        ownerEmail: "mdmuzahid7396@gmail.com",
        industrySlug: "software-it",
        planName: "emp_pro",
        mission:
          "To empower businesses globally through innovative, scalable, and cutting-edge software solutions that simplify complex operational challenges.",
        values: ["Innovation", "Collaboration", "Excellence"],
        founded: "2014",
        contactEmail: "careers@brainstation.it",
        contactPhone: "+8801712345678",
        logoUrl:
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "LankaBangla Finance",
        slug: "lankabangla-finance",
        description:
          "LankaBangla Finance Limited is a premier financial services provider in Bangladesh. We offer a comprehensive suite of financial products, including corporate finance, retail finance, SME loans, stock broking, and wealth management solutions designed to secure financial growth.",
        websiteUrl: "https://lankabangla.com",
        location: "Chittagong, Bangladesh",
        size: "500-1000 employees",
        ownerEmail: "employer.finance@company.com",
        industrySlug: "financial-services",
        planName: "emp_starter",
        mission:
          "To be the most preferred financial services provider in Bangladesh, creating wealth and sustainable value for our customers, stakeholders, and community.",
        values: ["Integrity", "Excellence", "Customer First"],
        founded: "1997",
        contactEmail: "careers@lankabangla.com",
        contactPhone: "+8801722334455",
        logoUrl:
          "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Arogga Healthcare",
        slug: "arogga-healthcare",
        description:
          "Arogga is Bangladesh's leading online pharmacy and healthcare platform. We make healthcare accessible and affordable by delivering genuine medicines, wellness products, and lab tests directly to customers' doorsteps through a state-of-the-art logistics network.",
        websiteUrl: "https://arogga.com",
        location: "Dhaka, Bangladesh",
        size: "50-100 employees",
        ownerEmail: "employer.health@company.com",
        industrySlug: "healthcare-biotech",
        planName: "emp_free",
        mission:
          "To make healthcare accessible, affordable, and trustworthy for every citizen in Bangladesh through modern delivery networks and digital convenience.",
        values: ["Customer First", "Impact", "Collaboration"],
        founded: "2020",
        contactEmail: "hr@arogga.com",
        contactPhone: "+8801733445566",
        logoUrl:
          "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "10 Minute School",
        slug: "10-minute-school",
        description:
          "10 Minute School is the largest ed-tech platform in Bangladesh, offering comprehensive learning resources, live classes, skill development courses, and academic materials to millions of students daily. We bridge the educational gap by bringing quality learning online.",
        websiteUrl: "https://10minuteschool.com",
        location: "Dhaka, Bangladesh",
        size: "100-200 employees",
        ownerEmail: "employer.edu@company.com",
        industrySlug: "education-elearning",
        planName: "emp_starter",
        mission:
          "To democratize education in Bangladesh by providing high-quality, interactive, and affordable learning materials to every student, anywhere.",
        values: ["Growth", "Collaboration", "Innovation"],
        founded: "2015",
        contactEmail: "join@10minuteschool.com",
        contactPhone: "+8801744556677",
        logoUrl:
          "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Pathao Logistics",
        slug: "pathao-logistics",
        description:
          "Pathao is the leading ride-sharing, food delivery, and e-commerce logistics platform in Bangladesh. We build crucial infrastructure for transport, food, and delivery services, empowering thousands of local freelance riders and merchants every single day.",
        websiteUrl: "https://pathao.com",
        location: "Dhaka, Bangladesh",
        size: "200-500 employees",
        ownerEmail: "employer.logistics@company.com",
        industrySlug: "logistics-supply-chain",
        planName: "emp_pro",
        mission:
          "To move Bangladesh forward by building the country's most efficient, reliable, and technology-driven transport and delivery network.",
        values: ["Agility", "Customer First", "Impact"],
        founded: "2015",
        contactEmail: "recruiting@pathao.com",
        contactPhone: "+8801755667788",
        logoUrl:
          "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Analyzen Digital",
        slug: "analyzen-digital",
        description:
          "Analyzen is the first digital agency in Bangladesh. We are a team of data-driven digital marketers, visual creators, and technologists who craft outstanding brand campaigns, interactive web solutions, and social media engagements for leading national and global brands.",
        websiteUrl: "https://analyzen.com",
        location: "Dhaka, Bangladesh",
        size: "50-100 employees",
        ownerEmail: "employer.marketing@company.com",
        industrySlug: "digital-marketing-agency",
        planName: "emp_starter",
        mission:
          "To transform digital brand engagements through innovative marketing insights, creative narratives, and state-of-the-art tech platforms.",
        values: ["Innovation", "Growth", "Excellence"],
        founded: "2008",
        contactEmail: "hello@analyzen.com",
        contactPhone: "+8801766778899",
        logoUrl:
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1542744094-3a31f103e35f?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Studio Dhaka",
        slug: "studio-dhaka",
        description:
          "Studio Dhaka is a high-end design agency specializing in digital product design, UI/UX systems, brand identity, and motion animations. We collaborate with international clients to create sleek, modern, and engaging visual layouts that deliver memorable user experiences.",
        websiteUrl: "https://studiodhaka.com",
        location: "Dhaka, Bangladesh",
        size: "10-50 employees",
        ownerEmail: "employer.creative@company.com",
        industrySlug: "creative-arts-design",
        planName: "emp_free",
        mission:
          "To design premium digital identities, engaging user experiences, and award-winning products that stand out globally.",
        values: ["Excellence", "Innovation", "Collaboration"],
        founded: "2018",
        contactEmail: "design@studiodhaka.com",
        contactPhone: "+8801777889900",
        logoUrl:
          "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Grameenphone",
        slug: "grameenphone",
        description:
          "Grameenphone is the leading telecommunications service provider in Bangladesh. With millions of customers, we drive digital connectivity through high-speed internet, mobile financial services, and reliable corporate telecommunication infrastructures nationwide.",
        websiteUrl: "https://grameenphone.com",
        location: "Dhaka, Bangladesh",
        size: "1000+ employees",
        ownerEmail: "employer.telecom@company.com",
        industrySlug: "telecommunications",
        planName: "emp_pro",
        mission:
          "To connect people to what matters most, driving social empowerment and high-speed network reliability across the nation.",
        values: ["Customer First", "Integrity", "Impact"],
        founded: "1997",
        contactEmail: "hr@grameenphone.com",
        contactPhone: "+8801700112233",
        logoUrl:
          "https://images.unsplash.com/photo-1520333789090-1afc82db536a?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Chaldal Grocery",
        slug: "chaldal-grocery",
        description:
          "Chaldal is Bangladesh's pioneer on-demand online grocery shop. We deliver daily essentials, fresh fruits, vegetables, and household cleaning supplies directly to households, providing an unmatched shopping experience through custom warehousing and technology.",
        websiteUrl: "https://chaldal.com",
        location: "Dhaka, Bangladesh",
        size: "200-500 employees",
        ownerEmail: "employer.ecommerce@company.com",
        industrySlug: "ecommerce-retail",
        planName: "emp_starter",
        mission:
          "To save time and money for our customers by delivering fresh groceries and essentials straight to their doors with zero hassle.",
        values: ["Customer First", "Agility", "Excellence"],
        founded: "2013",
        contactEmail: "careers@chaldal.com",
        contactPhone: "+8801711223344",
        logoUrl:
          "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "bti Development",
        slug: "bti-development",
        description:
          "Building Technology & Ideas Ltd. (bti) is a leading real estate developer in Bangladesh. Renowned for architectural excellence and on-time project deliveries, we construct luxury apartments, premium commercial spaces, and mixed-use complexes across Dhaka and Chittagong.",
        websiteUrl: "https://btibd.com",
        location: "Dhaka, Bangladesh",
        size: "100-500 employees",
        ownerEmail: "employer.tech@company.com",
        industrySlug: "construction-real-estate",
        planName: "emp_starter",
        mission:
          "To build engineering and ideas that set new standards in aesthetic residential and commercial architectures in Bangladesh.",
        values: ["Excellence", "Integrity", "Collaboration"],
        founded: "1984",
        contactEmail: "jobs@btibd.com",
        contactPhone: "+8801722334455",
        logoUrl:
          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Apex Retail",
        slug: "apex-retail",
        description:
          "Apex Footwear Limited is a premier shoemaker and lifestyle retailer. We manufacture premium leather shoes for local and international markets, operating over 250 retail stores across the country, committed to fashion, durability, and style.",
        websiteUrl: "https://apexfootwearltd.com",
        location: "Dhaka, Bangladesh",
        size: "1000+ employees",
        ownerEmail: "employer.retail@company.com",
        industrySlug: "ecommerce-retail",
        planName: "emp_starter",
        mission:
          "To deliver high-quality footwear and lifestyle fashion accessories that meet international design standards.",
        values: ["Customer First", "Excellence", "Growth"],
        founded: "1990",
        contactEmail: "careers@apexfootwearltd.com",
        contactPhone: "+8801733445566",
        logoUrl:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Boston Consulting",
        slug: "boston-consulting",
        description:
          "Boston Consulting Group (BCG) is a global management consulting firm and a world-leading advisor on business strategy. We partner with local companies, government ministries, and non-profits to identify high-value opportunities and drive organizational change.",
        websiteUrl: "https://bcg.com",
        location: "Dhaka, Bangladesh",
        size: "50-100 employees",
        ownerEmail: "employer.consulting@company.com",
        industrySlug: "human-resources-staffing",
        planName: "emp_enterprise",
        mission:
          "To partner with clients from all sectors to identify their highest-value opportunities, address their most critical challenges, and transform their enterprises.",
        values: ["Impact", "Integrity", "Excellence"],
        founded: "1963",
        contactEmail: "dhaka.recruiting@bcg.com",
        contactPhone: "+8801744556677",
        logoUrl:
          "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Somoy Media",
        slug: "somoy-media",
        description:
          "Somoy TV is the leading 24-hour news-oriented television channel in Bangladesh. Renowned for timely broadcast updates, investigate reporting, and interactive digital talk shows, we reach millions of viewers globally across TV and digital streams.",
        websiteUrl: "https://somoynews.tv",
        location: "Dhaka, Bangladesh",
        size: "200-500 employees",
        ownerEmail: "employer.media@company.com",
        industrySlug: "media-entertainment",
        planName: "emp_ultimate",
        mission:
          "To present authentic news, objective insights, and rich visual entertainment content that empowers citizens and protects democracy.",
        values: ["Integrity", "Impact", "Collaboration"],
        founded: "2010",
        contactEmail: "news@somoynews.tv",
        contactPhone: "+8801755667788",
        logoUrl:
          "https://images.unsplash.com/photo-1598257006458-087169a1f08d?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1598257006458-087169a1f08d?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "InterContinental Dhaka",
        slug: "intercontinental-dhaka",
        description:
          "InterContinental Dhaka is a luxury 5-star hotel offering international hospitality standards in the heart of the capital. We host state delegations, business corporate meetings, and international travelers, delivering premium accommodations and dining experiences.",
        websiteUrl: "https://intercontinental.com",
        location: "Dhaka, Bangladesh",
        size: "100-200 employees",
        ownerEmail: "employer.hospitality@company.com",
        industrySlug: "hospitality-tourism",
        planName: "emp_starter",
        mission:
          "To offer world-class hospitality, absolute luxury, and personalized services that create memorable moments for business and leisure travelers.",
        values: ["Customer First", "Excellence", "Collaboration"],
        founded: "1966",
        contactEmail: "careers.icdhaka@intercontinental.com",
        contactPhone: "+8801766778899",
        logoUrl:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Runner Automotive",
        slug: "runner-automotive",
        description:
          "Runner Automobiles Ltd. is the pioneer of two-wheeler manufacturing in Bangladesh. Operating a state-of-the-art assembly and testing plant, we distribute motorcycles and commercial cargo vehicles tailored for the unique road conditions of Bangladesh.",
        websiteUrl: "https://runnerbd.com",
        location: "Dhaka, Bangladesh",
        size: "500-1000 employees",
        ownerEmail: "employer.automotive@company.com",
        industrySlug: "automotive",
        planName: "emp_pro",
        mission:
          "To lead the automotive industry in Bangladesh by manufacturing and distributing high-quality and energy-efficient two-wheelers and three-wheelers.",
        values: ["Excellence", "Innovation", "Agility"],
        founded: "2000",
        contactEmail: "recruitment@runnerbd.com",
        contactPhone: "+8801777889900",
        logoUrl:
          "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Shanta Holdings",
        slug: "shanta-holdings",
        description:
          "Shanta Holdings Limited is the premier real estate developer in Bangladesh, known for building iconic high-rise condominiums, luxury residences, and state-of-the-art corporate headquarters that redefine the urban skyline of Dhaka.",
        websiteUrl: "https://shantaholdings.com",
        location: "Dhaka, Bangladesh",
        size: "100-200 employees",
        ownerEmail: "employer.realestate@company.com",
        industrySlug: "construction-real-estate",
        planName: "emp_starter",
        mission:
          "To set standard-defining real estate structures in Bangladesh, emphasizing state-of-the-art designs, robust build qualities, and client trust.",
        values: ["Excellence", "Integrity", "Impact"],
        founded: "2005",
        contactEmail: "hr@shantaholdings.com",
        contactPhone: "+8801788990011",
        logoUrl:
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Sheba Platform",
        slug: "sheba-platform",
        description:
          "Sheba.xyz is Bangladesh's largest local service marketplace. We connect households and businesses with verified plumbers, electricians, cleaners, and appliance repair professionals through our easy-to-use mobile apps and web platforms.",
        websiteUrl: "https://sheba.xyz",
        location: "Dhaka, Bangladesh",
        size: "100-200 employees",
        ownerEmail: "employer.sheba@company.com",
        industrySlug: "software-it",
        planName: "emp_pro",
        mission:
          "To digitize and elevate local service industries, connecting households and businesses with verified service professionals seamlessly.",
        values: ["Customer First", "Agility", "Innovation"],
        founded: "2016",
        contactEmail: "careers@sheba.xyz",
        contactPhone: "+8801799001122",
        logoUrl:
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Daraz E-commerce",
        slug: "daraz-ecommerce",
        description:
          "Daraz is the leading e-commerce marketplace in South Asia, empowering tens of thousands of sellers to connect with millions of active buyers. We provide logistics, marketing, and secure payment processing services to build a seamless retail platform.",
        websiteUrl: "https://daraz.com.bd",
        location: "Dhaka, Bangladesh",
        size: "1000+ employees",
        ownerEmail: "employer.daraz@company.com",
        industrySlug: "ecommerce-retail",
        planName: "emp_enterprise",
        mission:
          "To make online shopping easy and rewarding for every customer in South Asia through our wide product assortment and fast delivery systems.",
        values: ["Customer First", "Growth", "Agility"],
        founded: "2012",
        contactEmail: "careers@daraz.com.bd",
        contactPhone: "+8801700112233",
        logoUrl:
          "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "IPDC Finance",
        slug: "ipdc-finance",
        description:
          "IPDC Finance Limited is the first private financial institution in Bangladesh. We offer customized retail loans, home loans, corporate leasing options, and investment savings solutions aimed at supporting infrastructure growth and financial security.",
        websiteUrl: "https://ipdcbd.com",
        location: "Dhaka, Bangladesh",
        size: "100-500 employees",
        ownerEmail: "employer.ipdc@company.com",
        industrySlug: "financial-services",
        planName: "emp_starter",
        mission:
          "To enable our customers to achieve their dreams by offering personalized financial advice and products that contribute to national development.",
        values: ["Integrity", "Customer First", "Impact"],
        founded: "1981",
        contactEmail: "recruitment@ipdcbd.com",
        contactPhone: "+8801711223344",
        logoUrl:
          "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1531973576100-f74f7231c55e?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Beximco Pharma",
        slug: "beximco-pharma",
        description:
          "Beximco Pharmaceuticals Limited is a leading generic pharmaceutical manufacturer and exporter in Bangladesh. Operating FDA-accredited plants, we export life-saving medicines and consumer health products to over 50 countries globally.",
        websiteUrl: "https://beximcopharma.com",
        location: "Dhaka, Bangladesh",
        size: "1000+ employees",
        ownerEmail: "employer.beximco@company.com",
        industrySlug: "healthcare-biotech",
        planName: "emp_pro",
        mission:
          "To manufacture and distribute top-tier generic pharmaceutical products worldwide, improving healthcare quality.",
        values: ["Excellence", "Impact", "Integrity"],
        founded: "1976",
        contactEmail: "careers@beximcopharma.com",
        contactPhone: "+8801722334455",
        logoUrl:
          "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "GreenAgro Bangladesh",
        slug: "greenagro-bd",
        description:
          "GreenAgro Bangladesh is dedicated to introducing sustainable organic farming techniques and high-yield seeds to local farmers across Bangladesh. We work closely with agricultural experts to optimize organic crop health and modern soil nutrition profiles.",
        websiteUrl: "https://greenagro.com.bd",
        location: "Rajshahi, Bangladesh",
        size: "50-100 employees",
        ownerEmail: "employer.agritech@company.com",
        industrySlug: "agriculture-farming",
        planName: "emp_starter",
        mission:
          "To establish sustainable farming practices and green food chains that ensure long-term food security and support local farming livelihoods.",
        values: ["Sustainability", "Innovation", "Livelihood"],
        founded: "2018",
        contactEmail: "contact@greenagro.com.bd",
        contactPhone: "+8801733445566",
        logoUrl:
          "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Beximco Energy",
        slug: "beximco-energy",
        description:
          "Beximco Energy is a leading private provider of utility-scale wind, solar, and power infrastructure grid networks in Bangladesh. We deploy clean energy production lines to minimize carbon footprints and drive national grid efficiency.",
        websiteUrl: "https://beximcoenergy.com",
        location: "Dhaka, Bangladesh",
        size: "100-500 employees",
        ownerEmail: "employer.energy@company.com",
        industrySlug: "energy-utilities",
        planName: "emp_growth",
        mission:
          "To accelerate green energy transformation across Bangladesh, delivering reliable and carbon-neutral utility solutions.",
        values: ["Clean Energy", "Grid Integrity", "Leadership"],
        founded: "2015",
        contactEmail: "info@beximcoenergy.com",
        contactPhone: "+8801744556677",
        logoUrl:
          "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "Square Pharma",
        slug: "square-pharma",
        description:
          "Square Pharmaceuticals Limited is the pioneer of modern pharmaceutical manufacturing in Bangladesh. We build state-of-the-art biological labs, formulate world-class treatments, and maintain strict GMP compliance across our distribution streams.",
        websiteUrl: "https://squarepharma.com.bd",
        location: "Dhaka, Bangladesh",
        size: "1000+ employees",
        ownerEmail: "employer.pharma@company.com",
        industrySlug: "healthcare-biotech",
        planName: "emp_pro",
        mission:
          "To provide high-quality healthcare and pharmaceutical products that promote human wellness and longevity globally.",
        values: ["Quality First", "Pioneering", "Patient Care"],
        founded: "1958",
        contactEmail: "careers@squaregroup.com.bd",
        contactPhone: "+8801755667788",
        logoUrl:
          "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "CyberShield Dhaka",
        slug: "cybershield-dhaka",
        description:
          "CyberShield Dhaka provides specialized cybersecurity operations, pen-testing services, digital firewalls, and network security compliance auditing to financial institutions and technology firms throughout South Asia.",
        websiteUrl: "https://cybershield.com.bd",
        location: "Dhaka, Bangladesh",
        size: "100-500 employees",
        ownerEmail: "employer.cyber@company.com",
        industrySlug: "software-it",
        planName: "emp_starter",
        mission:
          "To safeguard digital architectures, databases, and company communications from modern security vectors.",
        values: ["Zero Trust", "Confidentiality", "Vigilance"],
        founded: "2020",
        contactEmail: "secops@cybershield.com.bd",
        contactPhone: "+8801766778899",
        logoUrl:
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1000&h=400&auto=format&fit=crop",
      },
      {
        name: "CloudNexus Solutions",
        slug: "cloudnexus-solutions",
        description:
          "CloudNexus Solutions specializes in AWS/Azure cloud migration architectures, devops workflow pipelines, Kubernetes load scaling, and hybrid database migrations for modern SaaS startups.",
        websiteUrl: "https://cloudnexus.io",
        location: "Dhaka, Bangladesh",
        size: "50-200 employees",
        ownerEmail: "employer.cloud@company.com",
        industrySlug: "software-it",
        planName: "emp_starter",
        mission:
          "To build highly scaling and secure serverless operations that accelerate software startup cycles.",
        values: ["Automation", "Speed", "Availability"],
        founded: "2021",
        contactEmail: "cloudops@cloudnexus.io",
        contactPhone: "+8801777889900",
        logoUrl:
          "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=128&h=128&auto=format&fit=crop",
        coverUrl:
          "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&h=400&auto=format&fit=crop",
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
            c.logoUrl ||
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=128&h=128&auto=format&fit=crop",
          coverUrl: c.coverUrl || natureCovers[idx % natureCovers.length],
          mission: c.mission || `Empowering ${c.name} to achieve global excellence and innovation.`,
          values: c.values || ["Innovation", "Collaboration", "Integrity", "Excellence"],
          founded: c.founded || String(2010 + (idx % 15)),
          contactEmail: c.contactEmail || c.ownerEmail,
          contactPhone:
            c.contactPhone || `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
          isVerified: true,
          industryId: industry.id,
          employees: { connect: { id: owner.id } },
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

      // Seed 3 Company Benefits
      await prisma.benefits.create({
        data: {
          title: "Comprehensive Health Insurance",
          description:
            "Full medical, dental, and vision coverage for employees and their immediate family members.",
          category: "Healthcare",
          icon: "HeartPulse",
          companyId: company.id,
        },
      });

      await prisma.benefits.create({
        data: {
          title: "Professional Development Fund",
          description:
            "Yearly budget allocated for training courses, certifications, and technical conferences.",
          category: "Education",
          icon: "GraduationCap",
          companyId: company.id,
        },
      });

      await prisma.benefits.create({
        data: {
          title: "Performance Bonuses",
          description:
            "Generous bi-annual performance-based bonuses matching individual and company milestones.",
          category: "Bonus",
          icon: "Banknote",
          companyId: company.id,
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

    // ======= 8. Seed 20 PaymentTransactions (10 Employer, 10 Candidate) =======
    console.log("💳 Seeding 20 Payment Transactions (10 Employer, 10 Candidate)...");
    const seekersForTx = Object.values(users).filter((u) => u.role === "JOB_SEEKER");

    for (let idx = 0; idx < 20; idx++) {
      if (idx % 2 === 0) {
        // Employer Plan
        const company = companyList[Math.floor(idx / 2) % companyList.length];
        const employer = await prisma.user.findFirst({ where: { companyId: company.id } });
        if (employer) {
          const planKey = idx % 4 === 0 ? "EMPLOYER_Growth" : "EMPLOYER_Enterprise";
          const dbPlan = plans[planKey];
          await prisma.paymentTransaction.create({
            data: {
              tranId: `TRAN-ID-ONYX-${1000 + idx}`,
              valId: `VAL-ID-${1000 + idx}`,
              sessionKey: `SESSION-KEY-ONYX-${1000 + idx}`,
              userId: employer.id,
              companyId: company.id,
              amount: dbPlan.price,
              currency: "BDT",
              status: "VALIDATED",
              category: "EMPLOYER_PLAN",
              planId: dbPlan.name,
              bankTranId: `BANK-TX-${2000 + idx}`,
              cardType: "VISA",
              storeAmount: dbPlan.price,
            },
          });
        }
      } else {
        // Seeker Premium Plan
        const seeker = seekersForTx[Math.floor(idx / 2) % seekersForTx.length];
        if (seeker) {
          const seekerPlanKeys = ["JOB_SEEKER_Starter", "JOB_SEEKER_Pro", "JOB_SEEKER_Premium"];
          const planKey = seekerPlanKeys[Math.floor(idx / 2) % seekerPlanKeys.length];
          const dbPlan = plans[planKey];

          // Calculate correct dynamic discounted amount for seeded transaction
          const planFeatures = dbPlan.features as any;
          const discountPercent = Number(planFeatures?.firstTimeDiscountPercent || 0);
          const discountAmount = dbPlan.price * (discountPercent / 100);
          const finalAmount = Math.floor(dbPlan.price - discountAmount);

          await prisma.paymentTransaction.create({
            data: {
              tranId: `TRAN-ID-ONYX-${1000 + idx}`,
              valId: `VAL-ID-${1000 + idx}`,
              sessionKey: `SESSION-KEY-ONYX-${1000 + idx}`,
              userId: seeker.id,
              companyId: null,
              amount: finalAmount,
              currency: "BDT",
              status: "VALIDATED",
              category: "SEEKER_PREMIUM",
              planId: dbPlan.name,
              bankTranId: `BANK-TX-${2000 + idx}`,
              cardType: "BKASH",
              storeAmount: finalAmount,
            },
          });
        }
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
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Senior Level",
        salaryMin: 130000,
        salaryMax: 200000,
        currency: "BDT",
        contactEmail: "careers@brainstation.it",
        description:
          "We are seeking a Senior React Architect to lead the design, development, and scaling of our enterprise web applications. You will be responsible for defining architecture, establishing frontend coding standards, and mentoring junior engineers. You will work closely with product managers and UX designers to build highly responsive, state-of-the-art web interfaces using Next.js and Tailwind CSS.",
        requirements: [
          "5+ years of professional frontend engineering experience, with 3+ years focused on React and Next.js.",
          "Deep understanding of state management tools like Redux Toolkit, Zustand, or React Context.",
          "Experience with performance optimization, server-side rendering, and micro-frontend architectures.",
          "Strong communication and leadership skills to drive technical initiatives across cross-functional teams.",
        ],
        skills: [
          { skillName: "React", experienceYears: 5.0, isRequired: true, priority: "HIGH" as const },
          {
            skillName: "TypeScript",
            experienceYears: 4.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Next.js",
            experienceYears: 3.0,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
          {
            skillName: "Redux",
            experienceYears: 4.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Tech Allowance",
            description:
              "Top-tier MacBook Pro, multi-monitor configuration, and modern workspace gadgets.",
            category: "Laptop",
            icon: "Laptop",
          },
          {
            title: "Health Insurance",
            description: "Comprehensive healthcare and life insurance for you and your family.",
            category: "Healthcare",
            icon: "HeartPulse",
          },
          {
            title: "Annual Retreats",
            description:
              "Company-sponsored international retreats and seasonal team-building meetups.",
            category: "Leisure",
            icon: "Plane",
          },
        ],
      },
      {
        title: "Backend Team Lead (Node.js)",
        discipline: "Engineering",
        slug: "backend-team-lead",
        company: "brainstation-it",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Senior Level",
        salaryMin: 140000,
        salaryMax: 220000,
        currency: "BDT",
        contactEmail: "careers@brainstation.it",
        description:
          "We are looking for a Backend Team Lead to supervise our server-side engineers, design scalable system architectures, and ensure top-notch performance. You will be building microservices in Node.js/TypeScript, optimizing PostgreSQL queries, and managing deployments on AWS. Your leadership will directly influence the development velocity and security standards of our global applications.",
        requirements: [
          "6+ years of backend engineering experience, with at least 3 years as a team lead.",
          "Advanced proficiency in Node.js, Express, Fastify, and TypeScript.",
          "Proven track record of designing high-throughput relational databases (PostgreSQL/MySQL) and caching (Redis).",
          "Experience with Docker, Kubernetes, and AWS deployment strategies (ECS, RDS, S3).",
        ],
        skills: [
          {
            skillName: "Node.js",
            experienceYears: 6.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "TypeScript",
            experienceYears: 4.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "PostgreSQL",
            experienceYears: 5.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Docker",
            experienceYears: 3.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Remote Support",
            description: "Ergonomic chair and home high-speed internet reimbursement.",
            category: "Laptop",
            icon: "Laptop",
          },
          {
            title: "Medical Coverage",
            description: "100% covered health, dental, and eye check-ups.",
            category: "Healthcare",
            icon: "HeartPulse",
          },
          {
            title: "Bi-annual Bonuses",
            description: "Two festival bonuses matching 100% of your basic monthly salary.",
            category: "Bonus",
            icon: "Banknote",
          },
        ],
      },
      {
        title: "Risk Analyst Officer",
        discipline: "Finance",
        slug: "risk-analyst-officer",
        company: "lankabangla-finance",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 80000,
        salaryMax: 120000,
        currency: "BDT",
        contactEmail: "careers@lankabangla.com",
        description:
          "LankaBangla Finance is seeking an analytical Risk Analyst Officer to identify, evaluate, and mitigate financial and operational risks. You will analyze credit portfolios, draft risk assessment models, and ensure compliance with regulatory standards. You will report findings directly to the senior risk management committee.",
        requirements: [
          "3+ years of experience in financial risk management or banking operations.",
          "Strong expertise in statistical tools, Excel modeling, and data visualization.",
          "Familiarity with central bank policies and risk regulations in Bangladesh.",
          "Degree in Finance, Economics, or related quantitative field (FRM/CFA candidate is a plus).",
        ],
        skills: [
          { skillName: "Excel", experienceYears: 4.0, isRequired: true, priority: "HIGH" as const },
          {
            skillName: "Risk Analysis",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Financial Modeling",
            experienceYears: 3.0,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Provident Fund",
            description: "Company matching provident fund and gratuity plans.",
            category: "Finance",
            icon: "Banknote",
          },
          {
            title: "Wellness Program",
            description: "Gym memberships and seasonal mental health counseling sessions.",
            category: "Healthcare",
            icon: "Heart",
          },
        ],
      },
      {
        title: "Financial Investment Advisor",
        discipline: "Finance",
        slug: "investment-advisor",
        company: "lankabangla-finance",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 75000,
        salaryMax: 115000,
        currency: "BDT",
        contactEmail: "careers@lankabangla.com",
        description:
          "As a Financial Investment Advisor at LankaBangla, you will advise retail and institutional clients on investment portfolios, stock broking, and mutual funds. You will manage customer relationships, monitor market trends, and draft personalized financial strategies to maximize client returns.",
        requirements: [
          "3+ years of experience in asset management, equity markets, or relationship management.",
          "Excellent communication and interpersonal skills to build trust with clients.",
          "Sound understanding of stock market operations, macroeconomic factors, and mutual funds.",
          "Bachelor's degree in Finance, Business Administration, or similar fields.",
        ],
        skills: [
          {
            skillName: "Asset Management",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Relationship Management",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Market Analysis",
            experienceYears: 3.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Performance Commission",
            description: "Highly rewarding monthly commission matching investment closures.",
            category: "Bonus",
            icon: "Coins",
          },
          {
            title: "Health Plan",
            description: "Group life insurance and medical reimbursement.",
            category: "Healthcare",
            icon: "Heart",
          },
        ],
      },
      {
        title: "Pharmacist & Medical Support",
        discipline: "Healthcare",
        slug: "pharmacist-support",
        company: "arogga-healthcare",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Junior Level",
        salaryMin: 35000,
        salaryMax: 55000,
        currency: "BDT",
        contactEmail: "hr@arogga.com",
        description:
          "We are looking for a certified Pharmacist & Medical Support Specialist to verify prescriptions, review medication safety, and consult clients on dosage guidelines. You will manage inventory control systems and support customer service teams with medical clarifications.",
        requirements: [
          "Graduation in Pharmacy (B.Pharm) from a recognized university.",
          "Registered with the Pharmacy Council of Bangladesh.",
          "Familiarity with medicine names, side effects, and online pharmacy management systems.",
          "Strong attention to detail and professional customer care behavior.",
        ],
        skills: [
          {
            skillName: "Pharmacology",
            experienceYears: 1.5,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Prescription Verification",
            experienceYears: 1.5,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Customer Service",
            experienceYears: 1.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Medical Subsidies",
            description: "Deep employee discounts on prescription medications.",
            category: "Healthcare",
            icon: "Stethoscope",
          },
          {
            title: "Flexible Shifts",
            description: "Rotational shift options and weekend allowances.",
            category: "Work Style",
            icon: "Briefcase",
          },
        ],
      },
      {
        title: "Medical Operations Specialist",
        discipline: "Healthcare",
        slug: "medical-operations",
        company: "arogga-healthcare",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 60000,
        salaryMax: 90000,
        currency: "BDT",
        contactEmail: "hr@arogga.com",
        description:
          "Arogga is seeking a Medical Operations Specialist to coordinate our healthcare inventory pipelines, optimize delivery speeds, and ensure medical supply chain quality control. You will oversee warehouse staff, audit storage environments, and maintain regulatory standards for digital drug distributions.",
        requirements: [
          "3+ years of experience in pharmaceutical distribution or healthcare operations.",
          "Strong leadership, inventory auditing, and logistics coordination skills.",
          "Understanding of pharmaceutical supply chain regulations and storage safety protocols.",
          "Excellent problem-solving skills in high-pressure delivery operations.",
        ],
        skills: [
          {
            skillName: "Operations Management",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Supply Chain",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Regulatory Compliance",
            experienceYears: 2.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Health Allowance",
            description: "Monthly medical checks and health coverage.",
            category: "Healthcare",
            icon: "Stethoscope",
          },
          {
            title: "Growth Training",
            description: "Regular training on healthcare operations and digital tools.",
            category: "Education",
            icon: "GraduationCap",
          },
        ],
      },
      {
        title: "Academic Content Creator",
        discipline: "Education",
        slug: "academic-content",
        company: "10-minute-school",
        jobType: "FULL_TIME" as const,
        isRemote: true,
        experienceLevel: "Junior Level",
        salaryMin: 40000,
        salaryMax: 65000,
        currency: "BDT",
        contactEmail: "join@10minuteschool.com",
        description:
          "We are looking for an Academic Content Creator to design high-quality, engaging educational content. You will write scripts, draft slides, and construct quizzes for high school subjects. You will collaborate with video editors to convert academic content into rich animations.",
        requirements: [
          "Excellent academic records in Mathematics, Science, or English (major public university is a plus).",
          "Passion for teaching, explaining complex topics simply, and creating slide designs.",
          "Proficiency in Google Slides, PowerPoint, and basic design tools.",
          "Prior experience in academic mentoring or online coaching is highly preferred.",
        ],
        skills: [
          {
            skillName: "Slide Design",
            experienceYears: 1.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Script Writing",
            experienceYears: 1.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Academic Teaching",
            experienceYears: 1.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Work From Home",
            description: "Complete home office equipment funding and monthly internet allowances.",
            category: "Laptop",
            icon: "Laptop",
          },
          {
            title: "Learning Allowance",
            description: "Free access to global learning platforms and professional courses.",
            category: "Education",
            icon: "BookOpen",
          },
        ],
      },
      {
        title: "Senior Logistics Coordinator",
        discipline: "Logistics",
        slug: "logistics-coordinator",
        company: "pathao-logistics",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Senior Level",
        salaryMin: 90000,
        salaryMax: 140000,
        currency: "BDT",
        contactEmail: "recruiting@pathao.com",
        description:
          "Pathao is hiring a Senior Logistics Coordinator to manage our city-wide delivery channels, optimize warehouse dispatch pipelines, and lead the courier operations team. You will leverage data-driven routing maps to reduce delivery times and minimize shipping overheads.",
        requirements: [
          "5+ years of experience in logistics, supply chain, or e-commerce delivery operations.",
          "Exceptional analytical skills using Excel, SQL, or dashboard metrics.",
          "Proven team leadership and crisis management skills in large courier networks.",
          "Strong negotiation and communication skills with local vendors.",
        ],
        skills: [
          {
            skillName: "Logistics",
            experienceYears: 5.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Data Analysis",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Fleet Management",
            experienceYears: 4.0,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Pathao Credits",
            description: "Monthly ride-sharing and food delivery credits on the Pathao App.",
            category: "Perks",
            icon: "Coins",
          },
          {
            title: "Life Insurance",
            description: "Premium group life and critical illness coverage.",
            category: "Healthcare",
            icon: "Heart",
          },
        ],
      },
      {
        title: "Creative Designer & Animator",
        discipline: "Marketing",
        slug: "creative-designer",
        company: "analyzen-digital",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 70000,
        salaryMax: 110000,
        currency: "BDT",
        contactEmail: "hello@analyzen.com",
        description:
          "Analyzen is seeking a highly creative UI/UX and Graphic Designer who also has experience in 2D animation. You will craft engaging social media templates, draft interactive UI wireframes, and create character animations for digital campaigns.",
        requirements: [
          "3+ years of professional design agency experience.",
          "Mastery of Adobe Creative Suite (Photoshop, Illustrator, After Effects) and Figma.",
          "Strong portfolio demonstrating typography, brand layout, and custom animations.",
          "Ability to work under tight campaign deadlines and incorporate feedback.",
        ],
        skills: [
          { skillName: "Figma", experienceYears: 3.0, isRequired: true, priority: "HIGH" as const },
          {
            skillName: "After Effects",
            experienceYears: 2.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Graphic Design",
            experienceYears: 3.0,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Creative Freedom",
            description: "Budget for design awards, font licenses, and creative assets.",
            category: "Perks",
            icon: "Palette",
          },
          {
            title: "Weekly Snacks",
            description: "Fully stocked pantry with gourmet coffee, drinks, and snacks.",
            category: "Perks",
            icon: "ChefHat",
          },
        ],
      },
      {
        title: "Civil Project Engineer",
        discipline: "Construction",
        slug: "civil-engineer",
        company: "bti-development",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Senior Level",
        salaryMin: 100000,
        salaryMax: 150000,
        currency: "BDT",
        contactEmail: "jobs@btibd.com",
        description:
          "bti is looking for an experienced Civil Project Engineer to supervise high-rise residential construction projects. You will review structural designs, inspect site execution qualities, and coordinate contractors to ensure project deliveries align with timelines and safety standards.",
        requirements: [
          "Bachelor's degree in Civil Engineering (B.Sc Engg) from a reputed university.",
          "5+ years of hands-on experience in high-rise building construction.",
          "Proficiency in AutoCAD, ETABS, and construction project management tools.",
          "Strong knowledge of building codes, materials testing, and structural safety.",
        ],
        skills: [
          {
            skillName: "AutoCAD",
            experienceYears: 5.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Structural Engineering",
            experienceYears: 5.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Project Management",
            experienceYears: 3.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Site Allowances",
            description: "Generous site travel, safety gears, and mobile allowances.",
            category: "Perks",
            icon: "Briefcase",
          },
          {
            title: "Insurance Cover",
            description: "Accidental hazard coverage and premium health insurance.",
            category: "Healthcare",
            icon: "Shield",
          },
        ],
      },
      {
        title: "E-Commerce Growth Executive",
        discipline: "Marketing",
        slug: "growth-executive",
        company: "chaldal-grocery",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 60000,
        salaryMax: 95000,
        currency: "BDT",
        contactEmail: "careers@chaldal.com",
        description:
          "Chaldal is seeking a growth-oriented marketing executive to optimize customer acquisition, plan conversion campaigns, and analyze sales metrics. You will design email/SMS marketing funnels, manage social ads, and run digital analytics dashboards to boost monthly transactions.",
        requirements: [
          "3+ years of growth marketing or analytics experience in e-commerce startups.",
          "Advanced familiarity with Facebook Ads Manager, Google Analytics, and SEO tools.",
          "Data-driven mindset with solid experience in client retention strategies.",
          "Excellent communication and writing skills in English and Bangla.",
        ],
        skills: [
          {
            skillName: "Google Analytics",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Growth Hacking",
            experienceYears: 2.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "SEO",
            experienceYears: 2.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Groceries Subsidy",
            description: "Significant discount matching monthly family grocery bills on Chaldal.",
            category: "Perks",
            icon: "Coins",
          },
          {
            title: "Performance Bonus",
            description: "Quarterly bonuses tied directly to growth acquisition targets.",
            category: "Bonus",
            icon: "Coins",
          },
        ],
      },
      {
        title: "Core Network Systems Administrator",
        discipline: "Engineering",
        slug: "network-admin",
        company: "grameenphone",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Senior Level",
        salaryMin: 110000,
        salaryMax: 170000,
        currency: "BDT",
        contactEmail: "hr@grameenphone.com",
        description:
          "We are looking for a Core Network Systems Administrator to maintain our high-volume telecommunication server architectures. You will deploy server security firewalls, manage system virtualization, and coordinate responses to core server interruptions to ensure 24/7 service connectivity.",
        requirements: [
          "5+ years of enterprise systems administration experience.",
          "Expertise in Linux environments (RedHat/CentOS), VMware, and virtualization.",
          "Deep understanding of TCP/IP, network routing, firewalls, and security protocols.",
          "Certifications like CCNA, CCNP, or RedHat Certified Engineer (RHCE) are highly valued.",
        ],
        skills: [
          {
            skillName: "Linux Admin",
            experienceYears: 5.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "VMware",
            experienceYears: 4.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Network Security",
            experienceYears: 4.0,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Gratuity & Pension",
            description: "Long-term secure retirement, pension, and gratuity funds.",
            category: "Finance",
            icon: "Banknote",
          },
          {
            title: "Unlimited Call Credits",
            description: "Unlimited post-paid corporate connectivity connection.",
            category: "Perks",
            icon: "Phone",
          },
        ],
      },
      {
        title: "Senior Flutter Mobile Developer",
        discipline: "Engineering",
        slug: "flutter-developer",
        company: "brainstation-it",
        jobType: "FULL_TIME" as const,
        isRemote: true,
        experienceLevel: "Senior Level",
        salaryMin: 110000,
        salaryMax: 160000,
        currency: "BDT",
        contactEmail: "careers@brainstation.it",
        description:
          "We are seeking a Senior Flutter Developer to build cross-platform mobile apps for international clients. You will write clean Dart code, design smooth UI animations, and integrate local SQL storage with REST APIs. You will lead mobile architectural discussions and mentor junior developers.",
        requirements: [
          "4+ years of professional mobile app development, with 3+ years dedicated to Flutter & Dart.",
          "Experience publishing multiple apps to Google Play Store and Apple App Store.",
          "Solid understanding of state management patterns (Bloc, Provider, or Riverpod).",
          "Knowledge of native iOS (Swift) or Android (Kotlin) development is a huge advantage.",
        ],
        skills: [
          {
            skillName: "Flutter",
            experienceYears: 3.5,
            isRequired: true,
            priority: "HIGH" as const,
          },
          { skillName: "Dart", experienceYears: 3.5, isRequired: true, priority: "HIGH" as const },
          {
            skillName: "REST APIs",
            experienceYears: 4.0,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "MacBook Setup",
            description: "Premium Apple hardware setup for cross-platform app compilations.",
            category: "Laptop",
            icon: "Laptop",
          },
          {
            title: "Training Grants",
            description: "Reimbursement for certification courses and mobile developer summits.",
            category: "Education",
            icon: "GraduationCap",
          },
        ],
      },
      {
        title: "Digital Campaign Strategist",
        discipline: "Marketing",
        slug: "campaign-strategist",
        company: "analyzen-digital",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 65000,
        salaryMax: 105000,
        currency: "BDT",
        contactEmail: "hello@analyzen.com",
        description:
          "Analyzen is looking for a creative Digital Campaign Strategist to plan and execute multi-channel digital campaigns. You will analyze consumer behavior, draft compelling pitches for brands, and coordinate content teams to deliver viral campaign assets.",
        requirements: [
          "3+ years of experience in digital marketing planning or advertising agencies.",
          "Excellent presentation, storytelling, and copy-writing skills.",
          "Track record of running successful corporate digital brand campaigns.",
          "Analytical skill in measuring campaign ROI and client reach metrics.",
        ],
        skills: [
          {
            skillName: "Brand Strategy",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Copywriting",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Campaign Metrics",
            experienceYears: 2.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Tech Kit",
            description: "Premium company laptop and home office setup allowance.",
            category: "Laptop",
            icon: "Laptop",
          },
          {
            title: "Annual Trips",
            description: "Sponsored annual corporate tour and cultural night celebrations.",
            category: "Leisure",
            icon: "Plane",
          },
        ],
      },
      {
        title: "Creative Art Lead",
        discipline: "Design",
        slug: "art-lead",
        company: "studio-dhaka",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Lead / Director",
        salaryMin: 130000,
        salaryMax: 200000,
        currency: "BDT",
        contactEmail: "design@studiodhaka.com",
        description:
          "Studio Dhaka is hiring a Creative Art Lead to define visual directions for premium digital products. You will guide our team of UI/UX designers and illustrators, run client presentation briefs, and set visual aesthetics for animations and interface grids.",
        requirements: [
          "6+ years of visual design experience with at least 2 years in creative leadership.",
          "Expert portfolio in layout aesthetics, custom vector illustration, and web/app interfaces.",
          "Mastery of Figma, Photoshop, Illustrator, and presentation templates.",
          "Excellent leadership and communication skills to present design directions to foreign clients.",
        ],
        skills: [
          {
            skillName: "UI/UX Design",
            experienceYears: 6.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          { skillName: "Figma", experienceYears: 5.0, isRequired: true, priority: "HIGH" as const },
          {
            skillName: "Visual Art Direction",
            experienceYears: 4.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
        ],
        benefitsData: [
          {
            title: "Design Gadgets",
            description:
              "High-end drawing tablets, dual monitors, and high-performance workstation.",
            category: "Laptop",
            icon: "Laptop",
          },
          {
            title: "Wellness Fund",
            description: "Monthly medical checks and wellness allowance.",
            category: "Healthcare",
            icon: "Heart",
          },
        ],
      },
      {
        title: "Supply Chain Manager",
        discipline: "Logistics",
        slug: "supply-chain-mgr",
        company: "pathao-logistics",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Senior Level",
        salaryMin: 120000,
        salaryMax: 180000,
        currency: "BDT",
        contactEmail: "recruiting@pathao.com",
        description:
          "Pathao is seeking a Supply Chain Manager to optimize vendor contracting, manage product warehousing, and reduce logistics overheads. You will streamline procurement pipelines and integrate technological inventory monitors to ensure maximum delivery speed and safety.",
        requirements: [
          "5+ years of experience in supply chain, vendor contracting, or inventory management.",
          "Mastery of supply chain analytics, demand planning, and warehouse audit systems.",
          "Excellent negotiation and contract drafting abilities.",
          "Degree in Supply Chain Management, Operations, or related field (CSCP/CPIM certification is a plus).",
        ],
        skills: [
          {
            skillName: "Supply Chain",
            experienceYears: 5.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Vendor Management",
            experienceYears: 4.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Procurement",
            experienceYears: 4.0,
            isRequired: false,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Transport Credits",
            description: "Free daily Pathao rides for office commute.",
            category: "Perks",
            icon: "Coins",
          },
          {
            title: "Gratuity Fund",
            description: "Highly rewarding retirement benefits and gratuity schemes.",
            category: "Finance",
            icon: "Banknote",
          },
        ],
      },
      {
        title: "QA Engineer Automation",
        discipline: "Engineering",
        slug: "qa-automation",
        company: "sheba-platform",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 70000,
        salaryMax: 110000,
        currency: "BDT",
        contactEmail: "careers@sheba.xyz",
        description:
          "Sheba Platform is looking for a QA Automation Engineer to write automated test scripts, perform regression testing, and debug api endpoints. You will work within agile teams, maintaining test frameworks (Selenium, Cypress) to ensure top reliability for our web and mobile portals.",
        requirements: [
          "3+ years of experience in software testing and quality assurance.",
          "Strong programming skills in JavaScript, Python, or Java for writing automation test scripts.",
          "Hands-on experience with Selenium, Cypress, Playwright, or Appium.",
          "Experience with API testing tools (Postman, JMeter) and CI/CD pipelines.",
        ],
        skills: [
          {
            skillName: "QA Automation",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Cypress",
            experienceYears: 2.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "API Testing",
            experienceYears: 3.0,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Laptop Subsidy",
            description: "Allowance to purchase your preferred development laptop.",
            category: "Laptop",
            icon: "Laptop",
          },
          {
            title: "Family Medical",
            description: "Health insurance covering employee, spouse, and kids.",
            category: "Healthcare",
            icon: "HeartPulse",
          },
        ],
      },
      {
        title: "Marketing Lead",
        discipline: "Marketing",
        slug: "marketing-lead",
        company: "daraz-ecommerce",
        jobType: "FULL_TIME",
        isRemote: false,
        experienceLevel: "Lead / Director",
        salaryMin: 150000,
        salaryMax: 230000,
        currency: "BDT",
        contactEmail: "careers@daraz.com.bd",
        description:
          "Daraz is seeking a Marketing Lead to design and manage our digital and offline marketing initiatives. You will lead a high-performing creative and media team, manage multi-million campaigns, and partner with top brand agencies to boost monthly user acquisition.",
        requirements: [
          "6+ years of marketing experience, with 3+ years leading marketing teams in e-commerce or telecom.",
          "Exceptional record in multi-channel brand planning and digital acquisition.",
          "Strong leadership, negotiation, and budget management abilities.",
          "Solid command of data analytics, market research, and campaign ROI tracking.",
        ],
        skills: [
          {
            skillName: "Marketing Leadership",
            experienceYears: 5.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Brand Strategy",
            experienceYears: 6.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Budget Management",
            experienceYears: 4.0,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Daraz Discounts",
            description: "Exclusive high-value shopping vouchers and monthly discounts on Daraz.",
            category: "Perks",
            icon: "Coins",
          },
          {
            title: "Car Facility",
            description: "Company car facility with driver allowance for official commute.",
            category: "Perks",
            icon: "Briefcase",
          },
        ],
      },
      {
        title: "Investment Banking Associate",
        discipline: "Finance",
        slug: "ib-associate",
        company: "ipdc-finance",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 90000,
        salaryMax: 145000,
        currency: "BDT",
        contactEmail: "recruitment@ipdcbd.com",
        description:
          "IPDC Finance is seeking an Investment Banking Associate to conduct corporate financial modeling, perform valuation analyses, and support underwriting transactions. You will research market acquisitions and prepare presentation materials for key investment clients.",
        requirements: [
          "3+ years of experience in corporate finance, investment banking, or advisory firms.",
          "Expert level financial modeling, Excel forecasting, and corporate valuations.",
          "Sound knowledge of regulatory frameworks for securities and corporate mergers.",
          "Strong academic records (CFA candidate or MBA in Finance preferred).",
        ],
        skills: [
          {
            skillName: "Financial Modeling",
            experienceYears: 3.5,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Valuation",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Corporate Finance",
            experienceYears: 3.5,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Home Loans",
            description: "Subsidized home and car financing options for corporate employees.",
            category: "Finance",
            icon: "Banknote",
          },
          {
            title: "Health Club",
            description: "Gym membership and annual health club checkups.",
            category: "Healthcare",
            icon: "Heart",
          },
        ],
      },
      {
        title: "Chemical Lab Researcher",
        slug: "chemical-researcher",
        company: "beximco-pharma",
        discipline: "Healthcare" as const,
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 85000,
        salaryMax: 130000,
        currency: "BDT",
        contactEmail: "careers@beximcopharma.com",
        description:
          "Beximco Pharma is hiring a Chemical Lab Researcher to design drug compositions, evaluate compound stability, and ensure pharmaceutical research matches international safety standards. You will write research papers and log analytical tests on advanced lab machinery.",
        requirements: [
          "Master's degree or Ph.D in Chemistry, Biochemistry, or Pharmacy.",
          "3+ years of laboratory research experience in generic pharmaceutical sectors.",
          "Proficiency in operating HPLC, GC, and spectral lab instrumentation.",
          "Excellent technical documentation, reporting, and safety compliance behaviors.",
        ],
        skills: [
          { skillName: "HPLC", experienceYears: 3.0, isRequired: true, priority: "HIGH" as const },
          {
            skillName: "Chemical Analysis",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Lab Safety",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
        ],
        benefitsData: [
          {
            title: "Research Grants",
            description:
              "Financial support for international paper submissions and pharmacy congresses.",
            category: "Education",
            icon: "GraduationCap",
          },
          {
            title: "Safety Insurance",
            description: "Comprehensive lab risk life insurance and high-grade hazard coverage.",
            category: "Healthcare",
            icon: "Shield",
          },
        ],
      },
      {
        title: "Electrical Grid Engineer",
        discipline: "Engineering" as const,
        slug: "grid-engineer",
        company: "beximco-energy",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Senior Level",
        salaryMin: 95000,
        salaryMax: 150000,
        currency: "BDT",
        contactEmail: "info@beximcoenergy.com",
        description:
          "We are seeking an Electrical Grid Engineer to design and optimize utility-scale solar and wind grid connections, manage load balancing architectures, and ensure top energy efficiency.",
        requirements: [
          "Bachelor's degree in Electrical Engineering or related technical field.",
          "4+ years of utility grid or high-voltage power engineering experience.",
          "Proficiency in grid simulation and distribution planning systems.",
        ],
        skills: [
          {
            skillName: "Power Engineering",
            experienceYears: 4.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Grid Design",
            experienceYears: 3.5,
            isRequired: true,
            priority: "HIGH" as const,
          },
        ],
        benefitsData: [
          {
            title: "Health Care",
            description: "Full medical coverage for employee and immediate family members.",
            category: "Healthcare",
            icon: "Heart",
          },
        ],
      },
      {
        title: "Organic Supply Coordinator",
        discipline: "Logistics" as const,
        slug: "supply-coordinator",
        company: "greenagro-bd",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid Level",
        salaryMin: 55000,
        salaryMax: 85000,
        currency: "BDT",
        contactEmail: "contact@greenagro.com.bd",
        description:
          "Coordinate the regional collection of organic harvest materials, optimize transportation timelines, and audit supply chain sustainability standards.",
        requirements: [
          "3+ years of experience in supply chain, logistics, or agrotech operations.",
          "Exceptional planning, route organization, and driver management skills.",
          "Degree in Agriculture, Supply Chain, or Business Administration.",
        ],
        skills: [
          {
            skillName: "Supply Chain",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Logistics",
            experienceYears: 3.0,
            isRequired: true,
            priority: "MEDIUM" as const,
          },
        ],
        benefitsData: [
          {
            title: "Fuel Allowance",
            description: "Monthly fuel allowance or company transport options.",
            category: "Perks",
            icon: "Coins",
          },
        ],
      },
      {
        title: "Quality Assurance Pharmacist",
        discipline: "Healthcare" as const,
        slug: "qa-pharmacist",
        company: "square-pharma",
        jobType: "FULL_TIME" as const,
        isRemote: false,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 80000,
        salaryMax: 125000,
        currency: "BDT",
        contactEmail: "careers@squaregroup.com.bd",
        description:
          "Supervise batch production audits, ensure absolute raw material sterility, and coordinate chemical compliance tests under international GMP guidelines.",
        requirements: [
          "Bachelor or Master of Pharmacy (M.Pharm) degree.",
          "3+ years of experience in pharmaceutical QA/QC factory settings.",
          "Solid knowledge of drug formulation standards and FDA regulations.",
        ],
        skills: [
          {
            skillName: "GMP Compliance",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Pharmaceutical Analysis",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
        ],
        benefitsData: [
          {
            title: "Provident Fund",
            description:
              "Excellent retirement savings program with matching company contributions.",
            category: "Finance",
            icon: "Banknote",
          },
        ],
      },
      {
        title: "Cyber Security Analyst",
        discipline: "Engineering" as const,
        slug: "security-analyst",
        company: "cybershield-dhaka",
        jobType: "FULL_TIME" as const,
        isRemote: true,
        experienceLevel: "Senior Level",
        salaryMin: 120000,
        salaryMax: 180000,
        currency: "BDT",
        contactEmail: "secops@cybershield.com.bd",
        description:
          "Perform vulnerability assessments, build server threat detection pipelines, and run pen-testing on critical network architectures to prevent security vectors.",
        requirements: [
          "4+ years of professional information security or pen-testing experience.",
          "Familiarity with network protocols, firewalls, and Linux server hardening.",
          "Industry standard certifications (CEH, CISSP, or CompTIA Security+) preferred.",
        ],
        skills: [
          {
            skillName: "Penetration Testing",
            experienceYears: 3.5,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Network Security",
            experienceYears: 4.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
        ],
        benefitsData: [
          {
            title: "Home Office Budget",
            description: "Subsidized desk, ergonomics chair, and high-speed home internet costs.",
            category: "Laptop",
            icon: "Laptop",
          },
        ],
      },
      {
        title: "DevOps Cloud Engineer",
        discipline: "Engineering" as const,
        slug: "devops-cloud-engineer",
        company: "cloudnexus-solutions",
        jobType: "FULL_TIME" as const,
        isRemote: true,
        experienceLevel: "Mid-Senior Level",
        salaryMin: 110000,
        salaryMax: 170000,
        currency: "BDT",
        contactEmail: "cloudops@cloudnexus.io",
        description:
          "Build Jenkins/GitHub Actions CI/CD pipelines, configure Terraform infrastructure states, and manage automatic Kubernetes scaling limits on AWS.",
        requirements: [
          "3+ years of DevOps engineering experience with AWS or Azure cloud structures.",
          "Proficiency in Docker containerization, Kubernetes helm charts, and Terraform IAC scripts.",
          "Strong background with scripting in Bash, Python, or Go.",
        ],
        skills: [
          {
            skillName: "Docker & Kubernetes",
            experienceYears: 3.0,
            isRequired: true,
            priority: "HIGH" as const,
          },
          {
            skillName: "Terraform",
            experienceYears: 2.5,
            isRequired: true,
            priority: "HIGH" as const,
          },
        ],
        benefitsData: [
          {
            title: "Hardware Allowance",
            description: "High-end development laptop provided with dual-monitor office setup.",
            category: "Laptop",
            icon: "Laptop",
          },
        ],
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
          description: jConf.description || details.description,
          requirements: jConf.requirements || details.requirements,
          jobType: (jConf.jobType ||
            (idx % 4 === 0 ? "CONTRACT" : idx % 5 === 0 ? "PART_TIME" : "FULL_TIME")) as any,
          location: idx % 3 === 0 ? "Chittagong, Bangladesh" : "Dhaka, Bangladesh",
          experienceLevel:
            jConf.experienceLevel ||
            (idx % 3 === 0 ? "Senior Level" : idx % 2 === 0 ? "Mid Level" : "Entry Level"),
          isRemote: jConf.isRemote ?? idx % 3 === 0,
          salaryMin: jConf.salaryMin || 45000 + idx * 5000,
          salaryMax: jConf.salaryMax || 80000 + idx * 7000,
          currency: jConf.currency || "BDT",
          status: "ACTIVE",
          isFeatured: idx % 2 === 0,
          companyId: comp.id,
          postedById: poster.id,
          industryId: comp.industryId,
          contactEmail: jConf.contactEmail || poster.email,
          applicationDeadline: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), // 2.5 months in future (at least 2 months)
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months in future (at least 2 months)
          maxApplications: 100,
          autoCloseApplications: false,
          benefits: details.benefits,
        },
      });

      // Seed Job Benefits
      for (const b of jConf.benefitsData) {
        await prisma.benefits.create({
          data: {
            title: b.title,
            description: b.description,
            category: b.category,
            icon: b.icon,
            jobId: job.id,
          },
        });
      }

      // Seed Job Skills
      for (const s of jConf.skills) {
        await prisma.jobSkill.create({
          data: {
            skillName: s.skillName,
            experienceYears: s.experienceYears,
            isRequired: s.isRequired,
            priority: s.priority,
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

    // ======= 14. Seed 20 Conversations, 40 Participants & 60+ Messages =======
    console.log("💬 Seeding 20 Conversations & Messages...");
    const applications = await prisma.application.findMany({ take: 20 });
    const riyadUser = await prisma.user.findFirst({ where: { email: "seeker.riyad@gmail.com" } });
    let messageCount = 0;

    for (let idx = 0; idx < applications.length; idx++) {
      const app = applications[idx];
      const job = await prisma.job.findUnique({ where: { id: app.jobId } });
      if (job) {
        const conversation = await prisma.conversation.create({
          data: { applicationId: app.id },
        });

        // Add participants
        await prisma.conversationParticipant.create({
          data: { conversationId: conversation.id, userId: app.applicantId },
        });
        await prisma.conversationParticipant.create({
          data: { conversationId: conversation.id, userId: job.postedById },
        });

        let lastMsgId = "";

        if (riyadUser && app.applicantId === riyadUser.id) {
          // Seed fully loaded rich conversation for Riyad Hasan
          const richMessages = [
            {
              senderId: app.applicantId,
              content:
                "Hello! I am following up on my application for the Backend Team Lead (Node.js) position.",
              messageType: "TEXT" as const,
            },
            {
              senderId: job.postedById,
              content:
                "Hello Riyad! Thanks for reaching out. Your profile looks impressive. Could you share some of your previous work or architecture portfolio?",
              messageType: "TEXT" as const,
            },
            {
              senderId: app.applicantId,
              content:
                "Sure! Here is a screenshot of the main architecture of a high-throughput payment service I designed recently.",
              messageType: "TEXT" as const,
            },
            {
              senderId: app.applicantId,
              content: "Payment Architecture Diagram",
              messageType: "IMAGE" as const,
              fileUrl:
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop",
              fileName: "payment-architecture.png",
              fileSize: 245600,
            },
            {
              senderId: job.postedById,
              content:
                "Wow, this architecture is very clean and well-structured. Do you have a detailed technical specification or documentation for this?",
              messageType: "TEXT" as const,
            },
            {
              senderId: app.applicantId,
              content: "Technical Specs Document",
              messageType: "FILE" as const,
              fileUrl: "https://pdfobject.com/pdf/sample.pdf",
              fileName: "payment-service-specs.pdf",
              fileSize: 1048576,
            },
            {
              senderId: job.postedById,
              content:
                "Excellent, I will review the spec document. Do you have the open-source repository or project codebase available on GitHub?",
              messageType: "TEXT" as const,
            },
            {
              senderId: app.applicantId,
              content: "https://github.com/riyadhasan/high-throughput-payment-service",
              messageType: "LINK" as const,
              fileUrl: "https://github.com/riyadhasan/high-throughput-payment-service",
              fileName: "GitHub Repository",
            },
            {
              senderId: job.postedById,
              content:
                "Perfect! This is exactly what we were looking for. Let's schedule a technical interview for this Thursday at 3:00 PM. Does that work for you?",
              messageType: "TEXT" as const,
            },
            {
              senderId: app.applicantId,
              content:
                "Yes, Thursday at 3:00 PM works perfectly for me. Thank you, I look forward to it!",
              messageType: "TEXT" as const,
            },
          ];

          for (const msgData of richMessages) {
            const msg = await prisma.message.create({
              data: {
                conversationId: conversation.id,
                ...msgData,
              },
            });
            lastMsgId = msg.id;
            messageCount++;
          }
        } else {
          // Standard 3 messages
          const msg1 = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: app.applicantId,
              content: "Hello! I am following up on my application.",
              messageType: "TEXT" as const,
            },
          });
          const msg2 = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: job.postedById,
              content: "Thank you for reaching out. We are currently reviewing resumes.",
              messageType: "TEXT" as const,
            },
          });
          const msg3 = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: app.applicantId,
              content: "Great, I look forward to hearing from you.",
              messageType: "TEXT" as const,
            },
          });
          lastMsgId = msg3.id;
          messageCount += 3;
        }

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageId: lastMsgId },
        });
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
