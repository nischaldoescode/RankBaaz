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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { apiMethods } from "@/services/api";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

const PaymentModal = ({ isOpen, onClose, course, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // NEW COUPON STATES
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponData, setCouponData] = useState(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  const keyID = import.meta.env.VITE_RAZORPAY_KEY_ID;

  useEffect(() => {
    if (isOpen && course) {
      createOrder();
    }
  }, [isOpen, course]);

  // RESET coupon state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCouponCode("");
      setCouponApplied(false);
      setCouponData(null);
      setCouponError("");
    }
  }, [isOpen]);

  const createOrder = async (appliedCouponId = null) => {
    try {
      setLoading(true);
      const payload = { courseId: course._id };

      // ADD coupon to order if applied
      if (appliedCouponId) {
        payload.couponId = appliedCouponId;
      }

      const response = await apiMethods.payments.createOrder(payload);
      setOrderData(response.data.data);
    } catch (error) {
      console.error("[PAYMENT_MODAL] Order creation failed:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to initialize payment";
      toast.error(errorMessage);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // NEW: Verify coupon function
  const handleVerifyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    try {
      setVerifyingCoupon(true);
      setCouponError("");

      const response = await apiMethods.coupons.verify({
        code: couponCode.toUpperCase(),
        courseId: course._id,
      });

      if (response.data.success) {
        const discountData = response.data.data;
        setCouponData(discountData);
        setCouponApplied(true);
        toast.success(`${discountData.discount}% discount applied!`);

        // Recreate order with coupon
        await createOrder(discountData.couponId);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Invalid coupon code";
      setCouponError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setVerifyingCoupon(false);
    }
  };

  // NEW: Remove coupon function
  const handleRemoveCoupon = async () => {
    setCouponCode("");
    setCouponApplied(false);
    setCouponData(null);
    setCouponError("");
    toast.success("Coupon removed");

    // Recreate order without coupon
    await createOrder();
  };

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handlePayment = async () => {
    // Validate phone number
    if (!phoneNumber.trim()) {
      setPhoneError("Phone number is required");
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneError("Please enter a valid 10-digit Indian phone number");
      return;
    }

    if (!orderData) {
      toast.error("Payment not initialized. Please try again.");
      return;
    }

    setPhoneError("");

    const options = {
      key: keyID,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: "TestMaster Pro",
      description: `Purchase ${orderData.courseName}`,
      image: orderData.courseImage || "/logo.png",

      prefill: {
        name: orderData.userName || user?.name,
        email: orderData.userEmail || user?.email,
        contact: phoneNumber,
      },

      notes: {
        course_id: course._id,
        course_name: course.name,
      },

      theme: {
        color: "#3B82F6",
      },

      modal: {
        ondismiss: function () {
          console.log("[RAZORPAY] Payment modal dismissed by user");
          setLoading(false);
          toast("Payment cancelled by you", {
            icon: "ℹ️",
            duration: 3000,
          });
        },
        escape: true,
        backdropclose: false,
      },

      handler: async function (response) {
        console.log("[RAZORPAY] Payment successful:", {
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
        });

        try {
          setLoading(true);

          const processingToast = toast.loading("Verifying your payment...", {
            duration: Infinity,
          });

          // UPDATED: Include coupon in verification
          const verifyPayload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            courseId: course._id,
          };

          // ADD coupon if applied
          if (couponApplied && couponData) {
            verifyPayload.couponId = couponData.couponId;
          }

          const verifyResponse = await apiMethods.payments.verifyPayment(
            verifyPayload
          );

          toast.dismiss(processingToast);

          if (verifyResponse.data.success) {
            toast.success(
              "Payment successful! 🎉 You can now access the course.",
              {
                duration: 6000,
                icon: "✅",
              }
            );

            setTimeout(() => {
              onSuccess();
              onClose();
            }, 1000);
          } else {
            throw new Error(
              verifyResponse.data.message || "Verification failed"
            );
          }
        } catch (error) {
          console.error("[PAYMENT_MODAL] Verification failed:", error);

          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Verification failed";

          toast.error(
            `Payment verification failed: ${errorMessage}. Please contact support with Payment ID: ${response.razorpay_payment_id}`,
            {
              duration: 8000,
              icon: "⚠️",
            }
          );
        } finally {
          setLoading(false);
        }
      },
    };

    try {
      if (!window.Razorpay) {
        toast.error("Payment system not loaded. Please refresh the page.");
        return;
      }

      console.log("[RAZORPAY] Opening payment modal with options:", {
        key: options.key,
        amount: options.amount,
        orderId: options.order_id,
      });

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("[RAZORPAY] Payment failed:", response.error);

        let errorMessage = "Payment failed. Please try again.";

        if (response.error.reason === "payment_failed") {
          errorMessage =
            "Payment was declined by your bank. Please try another card or contact your bank.";
        } else if (response.error.reason === "authentication_failed") {
          errorMessage =
            "Payment authentication failed. Please verify your card details.";
        } else if (response.error.reason === "payment_cancelled") {
          errorMessage = "Payment was cancelled.";
        } else if (response.error.description) {
          errorMessage = response.error.description;
        }

        toast.error(errorMessage, {
          duration: 5000,
          icon: "❌",
        });

        setLoading(false);
      });

      rzp.open();
    } catch (error) {
      console.error("[PAYMENT_MODAL] Razorpay initialization error:", error);
      toast.error(
        "Failed to open payment window. Please refresh and try again.",
        {
          duration: 4000,
        }
      );
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: "Full Course Access",
      description: "Lifetime access to all course materials",
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: "Earn Points & Badges",
      description: "Complete tests and climb leaderboards",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Track Progress",
      description: "Detailed analytics and performance insights",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Instant Results",
      description: "Get immediate feedback on every test",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Secure Payment",
      description: "Protected by Razorpay encryption",
    },
  ];

  if (!isOpen) return null;

  // Calculate display price
  const displayPrice =
    couponApplied && couponData
      ? couponData.finalPrice
      : orderData?.originalAmount || course?.price;

  const originalPrice = orderData?.originalAmount || course?.price;
  const discount = couponApplied && couponData ? couponData.discount : 0;

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
              disabled={loading}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-4 sm:p-6">
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
              </div>

              {/* Price Section */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white text-center mb-4 sm:mb-6">
                <div className="text-xs sm:text-sm opacity-90 mb-1 sm:mb-2">
                  One-time payment
                </div>

                {/* Show original price with strikethrough if coupon applied */}
                {couponApplied && couponData && (
                  <div className="text-lg opacity-75 line-through">
                    ₹{originalPrice}
                  </div>
                )}

                <div className="text-3xl sm:text-4xl font-bold">
                  ₹{displayPrice}
                </div>

                {/* Show discount badge */}
                {couponApplied && couponData && (
                  <div className="mt-2 inline-flex items-center space-x-2 bg-green-500 px-3 py-1 rounded-full text-sm">
                    <Tag className="w-4 h-4" />
                    <span>{discount}% OFF Applied</span>
                    <span>• Save ₹{couponData.discountAmount}</span>
                  </div>
                )}

                <div className="text-xs sm:text-sm opacity-90 mt-1 sm:mt-2">
                  Lifetime Access
                </div>
              </div>

              {/* NEW COUPON SECTION */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Have a Coupon Code?
                </label>

                {!couponApplied ? (
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        className={`uppercase ${
                          couponError ? "border-red-500" : ""
                        }`}
                        disabled={verifyingCoupon || loading}
                        maxLength={20}
                      />
                      {couponError && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {couponError}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleVerifyCoupon}
                      disabled={
                        !couponCode.trim() || verifyingCoupon || loading
                      }
                      className="px-4 cursor-pointer"
                    >
                      {verifyingCoupon ? "Verifying..." : "Apply"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Coupon Applied!
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          {discount}% discount on your purchase
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Phone Number Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 10) {
                        setPhoneNumber(value);
                        setPhoneError("");
                      }
                    }}
                    className={`pl-10 ${phoneError ? "border-red-500" : ""}`}
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
                {phoneError && (
                  <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Required for payment confirmation SMS
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold mb-3">What you'll get:</h3>
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                      {benefit.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{benefit.title}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {benefit.description}
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  </motion.div>
                ))}
              </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={loading || !orderData}
                className="w-full py-6 text-lg font-semibold cursor-pointer"
              >
                {loading ? "Processing..." : `Pay ₹${displayPrice} Now`}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentModal;
