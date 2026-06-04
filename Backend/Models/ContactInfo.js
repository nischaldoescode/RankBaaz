/**
 * keeps the contact info model focused and readable.
 */
import mongoose from "mongoose";
import connection2 from "../Config/mongodb2.js";

const contactInfoSchema = new mongoose.Schema(
  {
    // contact details
    // contact details
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

    // social media
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

    // ress
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

    // business hours
    businessHours: {
      type: String,
      default: "Monday - Friday: 9AM - 6PM",
    },

    // quick links
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

    // footer text
    copyrightText: {
      type: String,
      default: "© {year} Vidhgrow Pro. All rights reserved.",
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

// ensure only one contact info document exists
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
