/**
 * keeps the khalti controller controller focused and readable.
 */
import axios from "axios";
import Course from "../Models/Course.js";
import Payment from "../Models/Payment.js";
import Teacher from "../Models/Teacher.js";
import crypto from "crypto";

const KHALTI_BASE = process.env.NODE_ENV === "production"
  ? "https://khalti.com/api/v2"
  : "https://dev.khalti.com/api/v2";

const KHALTI_SECRET = process.env.KHALTI_SECRET_KEY;

/**
 * starts a khalti payment for nepal.
 */
export const initiateKhaltiPayment = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.userId;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (!course.isPaid) {
      return res.status(400).json({ success: false, message: "Course is free" });
    }

    if (course.geoRestriction !== "nepal") {
      return res.status(403).json({
        success: false,
        message: "This course is not available for Khalti payment",
      });
    }

    // check already purchased
    const existing = await Payment.findOne({
      user: userId,
      course: courseId,
      status: "success",
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Already purchased",
      });
    }

    const purchaseOrderId = `VG-${courseId.toString().slice(-8)}-${Date.now()}`;
    const amountPaisa = Math.round(course.price * 100); // npr to paisa

    const payload = {
      return_url: `${process.env.FRONTEND_URL}/payment/khalti/callback`,
      website_url: process.env.FRONTEND_URL,
      amount: amountPaisa,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: course.name.slice(0, 100),
      customer_info: {
        name: req.user.name || "Student",
        email: req.user.email || "",
        phone: "9800000001", // placeholder until phone is collected
      },
      merchant_extra: JSON.stringify({
        courseId: courseId.toString(),
        userId: userId.toString(),
      }),
    };

    const khaltiRes = await axios.post(`${KHALTI_BASE}/epayment/initiate/`, payload, {
      headers: {
        Authorization: `Key ${KHALTI_SECRET}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    return res.status(200).json({
      success: true,
      data: {
        payment_url: khaltiRes.data.payment_url,
        pidx: khaltiRes.data.pidx,
        courseName: course.name,
        amount: course.price,
        currency: "NPR",
      },
    });
  } catch (error) {
    console.error("Khalti initiate error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
      error: error.response?.data?.detail || "Payment gateway error",
    });
  }
};

/**
 * verify khalti payment callback
 */
export const verifyKhaltiPayment = async (req, res) => {
  try {
    const { pidx } = req.body;
    const userId = req.user.userId;

    if (!pidx) {
      return res.status(400).json({ success: false, message: "pidx required" });
    }

    // lookup with khalti
    const lookupRes = await axios.post(
      `${KHALTI_BASE}/epayment/lookup/`,
      { pidx },
      {
        headers: {
          Authorization: `Key ${KHALTI_SECRET}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const { status, total_amount, transaction_id } = lookupRes.data;

    if (status !== "Completed") {
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${status}`,
      });
    }

    // extract course/user from merchant_extra via pidx lookup
    const merchantExtra = lookupRes.data.merchant_extra;
    let courseId, storedUserId;

    try {
      const parsed = JSON.parse(merchantExtra);
      courseId = parsed.courseId;
      storedUserId = parsed.userId;
    } catch {
      return res.status(400).json({ success: false, message: "Invalid payment data" });
    }

    // security: ensure payment belongs to this user
    if (storedUserId !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Payment mismatch" });
    }

    // idempotency: check if already recorded
    const existing = await Payment.findOne({ paymentId: transaction_id });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Payment already recorded",
        data: { courseId },
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // record payment
    await Payment.create({
      user: userId,
      course: courseId,
      orderId: pidx,
      paymentId: transaction_id,
      amount: total_amount / 100, // paisa to npr
      originalAmount: course.price,
      currency: "NPR",
      status: "success",
      paidAt: new Date(),
    });

    // update teacher earnings if course has a teacher
    if (course.teacher) {
      const teacherAmount = Math.floor(
        (total_amount / 100) * 0.8
      ); // 80% to teacher
      await Teacher.findByIdAndUpdate(course.teacher, {
        $inc: {
          totalEarnings: teacherAmount,
          pendingPayout: teacherAmount,
        },
      });

      // invalidate teacher cache
      const { default: redisClient } = await import("../Config/redis.js");
      await redisClient.del(`teacher:${course.teacher}`).catch(() => {});
      await redisClient.del(`teacher:analytics:${course.teacher}`).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified",
      data: { courseId, amountPaid: total_amount / 100 },
    });
  } catch (error) {
    console.error("Khalti verify error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error.response?.data?.detail || "Payment gateway error",
    });
  }
};

/**
 * handles the user returning from khalti.
 * frontend handles the redirect; this is for backend confirmation only
 */
export const khaltiCallback = async (req, res) => {
  const { pidx, status, purchase_order_id } = req.query;

  if (status === "Completed" && pidx) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment/khalti/success?pidx=${pidx}`
    );
  }

  return res.redirect(
    `${process.env.FRONTEND_URL}/payment/khalti/failed?status=${status}`
  );
};
