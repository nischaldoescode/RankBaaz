import mongoose from "mongoose";
import connection2 from "../Config/mongodb2.js";

const legalPageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["privacy", "terms"], // CHANGED: Only 2 types now
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    // CHANGED: New structure for headers with subheaders and points
    sections: [
      {
        id: {
          type: String,
          required: true,
          default: () => new mongoose.Types.ObjectId().toString(),
        },
        header: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          default: "",
        },
        subheaders: [
          {
            id: {
              type: String,
              required: true,
              default: () => new mongoose.Types.ObjectId().toString(),
            },
            points: [
              {
                type: String,
              },
            ],
            title: {
              type: String,
              default: "",
            },
            order: {
              type: Number,
              default: 0,
            },
          },
        ],
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    // REMOVED: version field
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      effectiveDate: {
        type: Date,
        default: null,
      },
      lastReviewedDate: {
        type: Date,
        default: null,
      },
    },
    templateHints: {
      type: String,
      default: "",
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// UPDATED: Template hints for only 2 types
legalPageSchema.statics.getTemplateHints = function (type) {
  const hints = {
    privacy: `Privacy Policy Structure:

OPTION 1 - Paragraph Text:
- Add main header (e.g., "Introduction")
- Fill the "Section Content" field with paragraph text
- No need to add subheaders

OPTION 2 - Bullet Points:
- Add main header (e.g., "Information We Collect")
- Leave "Section Content" empty
- Click "Add Subheader" to create bullet point groups
- Optionally add subheader title (e.g., "Personal Data")
- Add multiple bullet points under each subheader

OPTION 3 - Mixed:
- Add main header
- Fill "Section Content" with intro paragraph
- Add subheaders below with bullet points

Use drag handles to reorder • Preview updates in real-time`,

    terms: `Terms of Service Structure:

OPTION 1 - Paragraph Text:
- Add main header (e.g., "Acceptance of Terms")
- Fill the "Section Content" field with paragraph text
- No need to add subheaders

OPTION 2 - Bullet Points:
- Add main header (e.g., "User Responsibilities")
- Leave "Section Content" empty
- Click "Add Subheader" to create bullet point groups
- Optionally add subheader title (e.g., "Prohibited Actions")
- Add multiple bullet points under each subheader

OPTION 3 - Mixed:
- Add main header
- Fill "Section Content" with intro paragraph
- Add subheaders below with bullet points

Use drag handles to reorder • Preview updates in real-time`,
  };

  return hints[type] || "";
};

const LegalPage = connection2.model("LegalPage", legalPageSchema);

export default LegalPage;
