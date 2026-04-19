import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle,
  Shield,
  Zap,
  BookOpen,
  Award,
  Clock,
  Phone,
  Tag,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiMethods } from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

/**
 * payment modal — supports razorpay (india) and khalti (nepal)
 * geo restriction determines which payment gateway is shown
 */
const PaymentModal = ({ isOpen, onClose, course, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponData, setCouponData] = useState(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [khaltiLoading, setKhaltiLoading] = useState(false);

  // determine payment gateway from course geo restriction
  const isNepalCourse = course?.geoRestriction === "nepal";
  const isIndiaCourse = !isNepalCourse; // default razorpay

  const keyID = import.meta.env.VITE_RAZORPAY_KEY_ID;

  useEffect(() => {
    if (isOpen && course && isIndiaCourse) {
      createRazorpayOrder();
    }
  }, [isOpen, course]);

  useEffect(() => {
    if (!isOpen) {
      setCouponCode("");
      setCouponApplied(false);
      setCouponData(null);
      setCouponError("");
      setPhoneNumber("");
      setPhoneError("");
      setOrderData(null);
    }
  }, [isOpen]);

  // ── razorpay order ──

  const createRazorpayOrder = async (appliedCouponId = null) => {
    try {
      setLoading(true);
      const payload = { courseId: course._id };
      if (appliedCouponId) payload.couponId = appliedCouponId;
      const response = await apiMethods.payments.createOrder(payload);
      setOrderData(response.data.data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to initialize payment",
      );
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // ── coupon ──

  const handleVerifyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Enter a coupon code");
      return;
    }
    try {
      setVerifyingCoupon(true);
      setCouponError("");
      const res = await apiMethods.coupons.verify({
        code: couponCode.toUpperCase(),
        courseId: course._id,
      });
      if (res.data.success) {
        const d = res.data.data;
        setCouponData(d);
        setCouponApplied(true);
        toast.success(`${d.discount}% discount applied!`);
        if (isIndiaCourse) await createRazorpayOrder(d.couponId);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid coupon";
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setVerifyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponCode("");
    setCouponApplied(false);
    setCouponData(null);
    setCouponError("");
    toast.success("Coupon removed");
    if (isIndiaCourse) await createRazorpayOrder();
  };

  // ── phone validation ──

  const validateIndiaPhone = (p) => /^[6-9]\d{9}$/.test(p);
  const validateNepalPhone = (p) => /^9[6-8]\d{8}$/.test(p);

  // ── razorpay payment ──

  const handleRazorpayPayment = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError("Phone number is required");
      return;
    }
    if (!validateIndiaPhone(phoneNumber)) {
      setPhoneError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (!orderData) {
      toast.error("Payment not initialized. Refresh and try again.");
      return;
    }
    setPhoneError("");

    const options = {
      key: keyID,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: "Vidhgrow",
      description: `Purchase ${orderData.courseName}`,
      image: orderData.courseImage || "/logo.png",
      prefill: {
        name: orderData.userName || user?.name,
        email: orderData.userEmail || user?.email,
        contact: phoneNumber,
      },
      notes: { course_id: course._id, course_name: course.name },
      theme: { color: "#2563eb" },
      modal: {
        ondismiss: () => {
          setLoading(false);
          toast("Payment cancelled", { icon: "ℹ️", duration: 3000 });
        },
        escape: true,
        backdropclose: false,
      },
      handler: async (response) => {
        try {
          setLoading(true);
          const processingToast = toast.loading("Verifying payment...", {
            duration: Infinity,
          });
          const payload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            courseId: course._id,
          };
          if (couponApplied && couponData)
            payload.couponId = couponData.couponId;
          const verifyRes = await apiMethods.payments.verifyPayment(payload);
          toast.dismiss(processingToast);
          if (verifyRes.data.success) {
            toast.success("Payment successful! 🎉 Course unlocked.", {
              duration: 5000,
            });
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 1000);
          } else {
            throw new Error(verifyRes.data.message || "Verification failed");
          }
        } catch (err) {
          toast.error(
            `Verification failed. Contact support with Payment ID: ${response.razorpay_payment_id}`,
            { duration: 8000 },
          );
        } finally {
          setLoading(false);
        }
      },
    };

    try {
      if (!window.Razorpay) {
        toast.error("Payment system not loaded. Refresh the page.");
        return;
      }
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r) => {
        toast.error(r.error.description || "Payment failed. Try again.", {
          duration: 5000,
        });
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error("Failed to open payment window. Refresh and try again.");
      setLoading(false);
    }
  };

  // ── khalti payment (nepal) ──

  const handleKhaltiPayment = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError("Phone number is required");
      return;
    }
    if (!validateNepalPhone(phoneNumber)) {
      setPhoneError("Enter a valid Nepal mobile number (98XXXXXXXX)");
      return;
    }
    setPhoneError("");
    setKhaltiLoading(true);

    try {
      const res = await apiMethods.payments.khaltiInitiate({
        courseId: course._id,
      });
      const { payment_url } = res.data.data;

      if (!payment_url) {
        toast.error("Failed to get payment link");
        return;
      }

      toast("Redirecting to Khalti payment portal...", {
        icon: "🔗",
        duration: 3000,
      });
      // redirect to Khalti — they handle the payment flow
      setTimeout(() => {
        window.location.href = payment_url;
      }, 500);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to initiate Khalti payment",
      );
    } finally {
      setKhaltiLoading(false);
    }
  };

  // ── display values ──

  const displayPrice =
    couponApplied && couponData ? couponData.finalPrice : course?.price;

  const originalPrice = course?.price;
  const discount = couponApplied && couponData ? couponData.discount : 0;
  const currencySymbol = isNepalCourse ? "रू" : "₹";

  const benefits = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: "Full Course Access",
      description: "Lifetime access to all materials",
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: "Earn Points & Badges",
      description: "Complete tests and climb leaderboards",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Track Progress",
      description: "Detailed analytics and insights",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Instant Results",
      description: "Feedback on every test immediately",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: isNepalCourse ? "Khalti Secured" : "Razorpay Secured",
      description: "Your payment is encrypted and safe",
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm isolate">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        >
          <Card className="relative m-0 rounded-lg sm:rounded-xl">
            <button
              onClick={onClose}
              disabled={loading || khaltiLoading}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-4 sm:p-6">
              {/* header */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Unlock Full Access
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Get lifetime access to {course?.name}
                </p>
                {isNepalCourse && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    🇳🇵 Nepal · Khalti Payment
                  </span>
                )}
              </div>

              {/* price */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white text-center mb-4 sm:mb-6">
                <div className="text-xs sm:text-sm opacity-90 mb-1 sm:mb-2">
                  One-time payment
                </div>
                {couponApplied && couponData && (
                  <div className="text-lg opacity-75 line-through">
                    {currencySymbol}
                    {originalPrice}
                  </div>
                )}
                <div className="text-3xl sm:text-4xl font-bold">
                  {currencySymbol}
                  {displayPrice}
                </div>
                {couponApplied && couponData && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-green-500 px-3 py-1 rounded-full text-sm">
                    <Tag className="w-4 h-4" />
                    <span>
                      {discount}% OFF · Save {currencySymbol}
                      {couponData.discountAmount}
                    </span>
                  </div>
                )}
                <div className="text-xs sm:text-sm opacity-90 mt-1 sm:mt-2">
                  Lifetime Access
                </div>
              </div>

              {/* coupon */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">
                  Have a coupon?
                </label>
                {!couponApplied ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        className={`uppercase ${couponError ? "border-red-500" : ""}`}
                        disabled={verifyingCoupon || loading || khaltiLoading}
                        maxLength={20}
                      />
                      {couponError && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {couponError}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleVerifyCoupon}
                      disabled={
                        !couponCode.trim() ||
                        verifyingCoupon ||
                        loading ||
                        khaltiLoading
                      }
                      className="px-4 cursor-pointer"
                    >
                      {verifyingCoupon ? "..." : "Apply"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Coupon applied — {discount}% off
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Save {currencySymbol}
                          {couponData.discountAmount}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      disabled={loading || khaltiLoading}
                      className="text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* phone */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder={
                      isNepalCourse
                        ? "98XXXXXXXX (Nepal number)"
                        : "10-digit Indian mobile"
                    }
                    value={phoneNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      if (v.length <= 10) {
                        setPhoneNumber(v);
                        setPhoneError("");
                      }
                    }}
                    className={`pl-10 ${phoneError ? "border-red-500" : ""}`}
                    maxLength={10}
                    disabled={loading || khaltiLoading}
                  />
                </div>
                {phoneError && (
                  <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {isNepalCourse
                    ? "Required for Khalti payment"
                    : "Required for payment confirmation SMS"}
                </p>
              </div>

              {/* benefits */}
              <div className="space-y-2 mb-5">
                <h3 className="font-semibold text-sm mb-2">What you get:</h3>
                {benefits.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                      {b.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs">{b.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {b.description}
                      </p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  </div>
                ))}
              </div>

              {/* CTA button */}
              {isIndiaCourse ? (
                <Button
                  onClick={handleRazorpayPayment}
                  disabled={loading || !orderData}
                  className="w-full py-5 text-base font-semibold cursor-pointer"
                >
                  {loading
                    ? "Processing..."
                    : `Pay ${currencySymbol}${displayPrice} via Razorpay`}
                </Button>
              ) : (
                <Button
                  onClick={handleKhaltiPayment}
                  disabled={khaltiLoading}
                  className="w-full py-5 text-base font-semibold cursor-pointer"
                  style={{
                    background: khaltiLoading
                      ? "#9ca3af"
                      : "linear-gradient(135deg, #5c2d91, #7c3aed)",
                  }}
                >
                  {khaltiLoading
                    ? "Redirecting..."
                    : `Pay ${currencySymbol}${displayPrice} via Khalti`}
                </Button>
              )}

              <p className="text-xs text-center text-gray-400 mt-3">
                {isIndiaCourse
                  ? "Secured by Razorpay · 256-bit SSL encryption"
                  : "Secured by Khalti · Nepal's trusted payment gateway"}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentModal;
