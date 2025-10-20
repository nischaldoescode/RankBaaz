import Razorpay from "razorpay";
import crypto from "crypto";
import Course from "../Models/Course.js";
import User from "../Models/User.js";
import Payment from "../Models/Payment.js";
import dotenv from "dotenv";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID?.trim(),
  key_secret: process.env.RAZORPAY_SECRET?.trim(),
});

export const createOrder = async (req, res) => {
  try {
    const { courseId, couponId } = req.body; // ADD couponId here
    const userId = req.user.userId;

    // Verify Razorpay credentials are loaded
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
      console.error("[RAZORPAY] Credentials missing!");
      return res.status(500).json({
        success: false,
        message: "Payment system configuration error",
      });
    }

    // Trim any whitespace from credentials
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID.trim();
    const razorpaySecret = process.env.RAZORPAY_SECRET.trim();

    console.log("[RAZORPAY] Credential verification:", {
      keyLength: razorpayKeyId.length,
      secretLength: razorpaySecret.length,
      keyFormat: razorpayKeyId.startsWith("rzp_") ? "Valid" : "Invalid",
    });

    // Validate course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (!course.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Free Course.",
      });
    }

    // Check if user already purchased
    const existingPayment = await Payment.findOne({
      user: userId,
      course: courseId,
      status: "success",
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "You have already purchased this course",
      });
    }

    // Get user details
    const user = await User.findById(userId).select("name email");

    // COUPON HANDLING - NEW CODE STARTS HERE
    let finalAmount = course.price;
    let discountAmount = 0;
    let discountPercentage = 0;
    let appliedCoupon = null;

    if (couponId) {
      const Coupon = (await import("../Models/Coupon.js")).default;
      const coupon = await Coupon.findById(couponId);

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Invalid coupon",
        });
      }

      // Validate coupon
      const validationResult = coupon.isValid(userId);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: validationResult.reason,
        });
      }

      // Check if coupon applies to this course
      if (coupon.type === "course") {
        if (coupon.course.toString() !== courseId) {
          return res.status(400).json({
            success: false,
            message: "This coupon is not valid for this course",
          });
        }
      }

      // Calculate discount
      discountPercentage = coupon.discount;
      discountAmount = Math.round((course.price * discountPercentage) / 100);
      finalAmount = course.price - discountAmount;
      appliedCoupon = coupon;

      console.log("[PAYMENT] Coupon applied:", {
        code: "HIDDEN",
        discount: `${discountPercentage}%`,
        originalPrice: course.price,
        discountAmount,
        finalAmount,
      });
    }
    // COUPON HANDLING - NEW CODE ENDS HERE

    // Create Razorpay order with FINAL AMOUNT (after discount)
    const options = {
      amount: finalAmount * 100, // Amount in paise (CHANGED from course.price to finalAmount)
      currency: course.currency,
      receipt: `ord_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      notes: {
        courseId: courseId.toString(),
        userId: userId.toString(),
        courseName: course.name,
        originalAmount: course.price.toString(), // ADD original amount
        discountAmount: discountAmount.toString(), // ADD discount amount
        couponApplied: appliedCoupon ? "yes" : "no", // ADD coupon flag
      },
    };

    console.log("[RAZORPAY] Creating order with options:", {
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
    });

    console.log("[RAZORPAY] Using credentials:", {
      keyId: process.env.RAZORPAY_KEY_ID?.substring(0, 15) + "...",
      hasSecret: !!process.env.RAZORPAY_SECRET,
    });

    let order;
    try {
      order = await razorpay.orders.create(options);
      console.log("[RAZORPAY] FULL KEY CHECK:", {
        keyId: razorpayKeyId,
        secretFirstChars: razorpaySecret.substring(0, 4),
        secretLastChars: razorpaySecret.substring(razorpaySecret.length - 4),
      });

      console.log("[RAZORPAY] Order created successfully:", order.id);
    } catch (razorpayError) {
      console.error("[RAZORPAY] Order creation failed:", {
        error: razorpayError.error,
        statusCode: razorpayError.statusCode,
        message: razorpayError.message,
      });

      return res.status(500).json({
        success: false,
        message:
          "Failed to create payment order. Please check your payment credentials.",
        error: razorpayError.error?.description || "Payment gateway error",
      });
    }

    // UPDATED RESPONSE - ADD DISCOUNT INFO
    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        userName: user.name,
        userEmail: user.email,
        courseName: course.name,
        courseImage: course.image?.url,
        // ADD THESE NEW FIELDS
        originalAmount: course.price,
        discountAmount,
        discountPercentage,
        finalAmount,
        couponApplied: !!appliedCoupon,
        // DO NOT send coupon code or hash
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};

// Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      couponId, // ADD THIS
    } = req.body;

    const userId = req.user.userId;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET.trim())
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.error("[PAYMENT_VERIFY] Invalid signature:", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        userId,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid payment signature. Payment verification failed.",
      });
    }

    // Check if payment already exists (prevent duplicates)
    const existingPayment = await Payment.findOne({
      orderId: razorpay_order_id,
    });

    if (existingPayment) {
      console.warn("[PAYMENT_VERIFY] Duplicate verification attempt:", {
        orderId: razorpay_order_id,
        existingStatus: existingPayment.status,
      });

      if (existingPayment.status === "success") {
        return res.status(200).json({
          success: true,
          message: "Payment already verified",
          data: {
            paymentId: razorpay_payment_id,
            courseId,
          },
        });
      }
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // COUPON HANDLING - NEW CODE STARTS HERE
    let finalAmount = course.price;
    let discountAmount = 0;
    let discountPercentage = 0;
    let appliedCoupon = null;

    if (couponId) {
      const Coupon = (await import("../Models/Coupon.js")).default;
      const coupon = await Coupon.findById(couponId);

      if (coupon) {
        // Re-validate coupon
        const validationResult = coupon.isValid(userId);
        if (validationResult.valid) {
          // Check course match for course-level coupons
          if (
            coupon.type === "universal" ||
            (coupon.type === "course" && coupon.course.toString() === courseId)
          ) {
            discountPercentage = coupon.discount;
            discountAmount = Math.round(
              (course.price * discountPercentage) / 100
            );
            finalAmount = course.price - discountAmount;
            appliedCoupon = coupon;

            // Update coupon usage
            coupon.usageCount += 1;
            coupon.usedBy.push({
              user: userId,
              usedAt: new Date(),
            });
            await coupon.save();

            console.log("[PAYMENT_VERIFY] Coupon applied and updated:", {
              couponId: coupon._id,
              usageCount: coupon.usageCount,
              discount: `${discountPercentage}%`,
            });
          }
        }
      }
    }
    // COUPON HANDLING - NEW CODE ENDS HERE

    // CREATE new payment record with COUPON INFO
    const payment = new Payment({
      user: userId,
      course: courseId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      amount: finalAmount,
      originalAmount: course.price,
      discountAmount,
      coupon: appliedCoupon ? appliedCoupon._id : null,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      discountPercentage,
      currency: course.currency,
      status: "success",
      paidAt: new Date(),
    });
    await payment.save();

    console.log("[PAYMENT_VERIFY] Payment verified and saved:", {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      userId,
      courseId,
      amount: finalAmount,
      originalAmount: course.price,
      discountAmount,
      couponApplied: !!appliedCoupon,
    });

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        paymentId: razorpay_payment_id,
        courseId,
        amountPaid: finalAmount,
        discountApplied: discountAmount,
      },
    });
  } catch (error) {
    console.error("[PAYMENT_VERIFY] Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed. Please contact support.",
    });
  }
};

// Check if user has purchased course
export const checkPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const payment = await Payment.findOne({
      user: userId,
      course: courseId,
      status: "success",
    });

    res.status(200).json({
      success: true,
      data: {
        hasPurchased: !!payment,
        purchaseDate: payment?.paidAt,
      },
    });
  } catch (error) {
    console.error("Check purchase status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check purchase status",
    });
  }
};

// Get user's purchase history
export const getPurchaseHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const purchases = await Payment.find({
      user: userId,
      status: "success",
    })
      .populate("course", "name description image isPaid price")
      .sort({ paidAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        purchases,
        totalPurchases: purchases.length,
      },
    });
  } catch (error) {
    console.error("Get purchase history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get purchase history",
    });
  }
};
