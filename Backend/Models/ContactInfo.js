import mongoose from "mongoose";
import connection2 from "../Config/mongodb2.js";

const contactInfoSchema = new mongoose.Schema(
  {
    // Contact Details
    // Contact Details
    email: {
      support: {
        type: String,
        required: true,
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      },
    },
    telegram: {
      support: {
        type: String,
        required: true,
        default: "",
      },
    },

    // Social Media
    socialMedia: {
      instagram: {
        type: String,
        default: null,
      },
      twitter: {
        type: String,
        default: null,
      },
      facebook: {
        type: String,
        default: null,
      },
      linkedin: {
        type: String,
        default: null,
      },
      youtube: {
        type: String,
        default: null,
      },
      telegram: {
        type: String,
        default: null,
      },
    },

    // Address
    address: {
      street: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      state: {
        type: String,
        required: false,
      },
      zipCode: {
        type: String,
        required: false,
      },
      country: {
        type: String,
        required: false,
      },
    },

    // Business Hours
    businessHours: {
      type: String,
      default: "Monday - Friday: 9AM - 6PM",
    },

    // Quick Links
    quickLinks: [
      {
        name: {
          type: String,
          required: true,
        },
        href: {
          type: String,
          required: true,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Footer Text
    copyrightText: {
      type: String,
      default: "© {year} TestMaster Pro. All rights reserved.",
    },
    footerDescription: {
      type: String,
      default:
        "Empowering students with comprehensive test preparation and learning management tools. Master your exams with confidence.",
    },

    isActive: {
      type: Boolean,
      default: true,
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

// Ensure only one contact info document exists
contactInfoSchema.statics.getContactInfo = async function () {
  let contactInfo = await this.findOne({ isActive: true });
  if (!contactInfo) {
    contactInfo = await this.create({
      email: {
        support: "support@testmasterpro.com",
      },
      telegram: {
        support: "@testmasterpro_support",
      },
    });
  }
  return contactInfo;
};

const ContactInfo = connection2.model("ContactInfo", contactInfoSchema);

export default ContactInfo;
