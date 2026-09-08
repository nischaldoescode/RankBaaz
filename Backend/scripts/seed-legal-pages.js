/**
 * creates missing editable legal pages without replacing existing admin content
 *
 * @file backend/scripts/seed-legal-pages.js
 * @module backend/scripts/seed-legal-pages
 * @returns {promise<void>} closes the content database after the seed finishes
 */

import "dotenv/config";
import LegalPage from "../Models/LegalPages.js";
import connection2 from "../Config/mongodb2.js";

const termsSections = [
  {
    header: "1. Acceptance of Terms",
    content:
      "By creating an account or using Vidhgrow, you agree to these Terms of Service and to use the platform in accordance with applicable law. If you do not agree, do not create an account or use the service.",
    subheaders: [],
    order: 0,
  },
  {
    header: "2. Accounts and Security",
    content:
      "You are responsible for the accuracy of the information you provide and for keeping your login credentials and one-time passwords private. Contact support promptly if you believe your account has been accessed without permission.",
    subheaders: [],
    order: 1,
  },
  {
    header: "3. Courses and Assessments",
    content:
      "Vidhgrow provides teacher-created courses, practice tests, feedback, and progress tools. Course availability, timing, scoring, and content may change as teachers and administrators maintain the platform.",
    subheaders: [
      {
        title: "Practice conduct",
        points: [
          "Submit your own work and do not share answers or protected course material without permission.",
          "Do not attempt to bypass timers, access controls, rate limits, or test security measures.",
        ],
        order: 0,
      },
    ],
    order: 2,
  },
  {
    header: "4. Teacher and User Content",
    content:
      "You retain responsibility for content you upload or publish. You grant Vidhgrow the limited permission needed to store, display, protect, moderate, and deliver that content as part of the service.",
    subheaders: [],
    order: 3,
  },
  {
    header: "5. Payments and Refunds",
    content:
      "Where paid features are offered, the price, currency, payment provider terms, and any applicable refund conditions are shown before payment. Payment disputes should be raised through the support channel connected to the transaction.",
    subheaders: [],
    order: 4,
  },
  {
    header: "6. Changes and Contact",
    content:
      "We may update these terms when the platform, law, or safety requirements change. The effective date and review date shown on this page identify the current version. Questions about these terms can be sent through the contact page.",
    subheaders: [],
    order: 5,
  },
];

const main = async () => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LEGAL_PAGE_SEED !== "true") {
    throw new Error("set ALLOW_LEGAL_PAGE_SEED=true before seeding legal pages in production");
  }

  await connection2.asPromise();

  try {
    const now = new Date();
    const page = await LegalPage.findOneAndUpdate(
      { type: "terms" },
      {
        $setOnInsert: {
          type: "terms",
          title: "Terms of Service",
          version: "1.0",
          sections: termsSections,
          metadata: {
            effectiveDate: now,
            lastReviewedDate: now,
          },
          templateHints: LegalPage.getTemplateHints("terms"),
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    ).lean();

    console.log(`terms page ready: ${page._id}`);
  } finally {
    await connection2.close();
  }
};

main().catch(async (error) => {
  console.error("legal page seed failed:", error.message);
  await connection2.close().catch(() => undefined);
  process.exitCode = 1;
});
