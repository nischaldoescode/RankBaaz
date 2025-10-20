import React, { useState, useEffect, useCallback } from "react"; // ADD useCallback
import { useAdmin } from "../contexts/AdminContext";
import {
  Tag,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Users,
  Percent,
  Loader2,
  X,
  AlertCircle,
  Edit2,
} from "lucide-react";

const UniversalCoupons = () => {
  const {
    fetchCoupons,
    createCoupon,
    updateCouponStatus,
    updateCoupon,
    deleteCoupon,
    loading,
  } = useAdmin();

  const [coupons, setCoupons] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discount: "5",
    maxUsage: "",
    validUntil: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false); // ADD THIS

  const discountOptions = [2, 5, 10, 15, 20];

  const [editingCoupon, setEditingCoupon] = useState(null);
  const [editFormData, setEditFormData] = useState({
    code: "",
    discount: "5",
    maxUsage: "",
    validUntil: "",
  });
  const [editErrors, setEditErrors] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    const result = await fetchCoupons({ type: "universal" });
    if (result.success) {
      setCoupons(result.data);
    }
  };

  // ADD THIS DEBOUNCE FUNCTION
  const checkDuplicateCoupon = useCallback(
    (code) => {
      if (!code || code.length < 4) return;

      setCheckingDuplicate(true);

      // Check in current coupons list
      const isDuplicate = coupons.some(
        (c) => c.code.toUpperCase() === code.toUpperCase()
      );

      if (isDuplicate) {
        setErrors((prev) => ({
          ...prev,
          code: "This coupon code already exists",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.code;
          return newErrors;
        });
      }

      setCheckingDuplicate(false);
    },
    [coupons]
  );

  // ADD THIS DEBOUNCED VERSION
  const debouncedDuplicateCheck = useCallback(
    (() => {
      let timeoutId = null;
      return (code) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          checkDuplicateCoupon(code);
        }, 500);
      };
    })(),
    [checkDuplicateCoupon]
  );

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setEditFormData({
      code: coupon.code,
      discount: coupon.discount.toString(),
      maxUsage: coupon.maxUsage ? coupon.maxUsage.toString() : "",
      validUntil: coupon.validUntil
        ? new Date(coupon.validUntil).toISOString().split("T")[0]
        : "",
    });
    setEditErrors({});
  };

  const validateEditForm = () => {
    const newErrors = {};

    if (!editFormData.code.trim()) {
      newErrors.code = "Coupon code is required";
    } else if (editFormData.code.length < 4) {
      newErrors.code = "Code must be at least 4 characters";
    } else if (!/^[A-Z0-9]+$/.test(editFormData.code)) {
      newErrors.code = "Code must contain only uppercase letters and numbers";
    }

    if (
      editFormData.maxUsage &&
      parseInt(editFormData.maxUsage) < editingCoupon.usageCount
    ) {
      newErrors.maxUsage = `Max usage cannot be less than current usage (${editingCoupon.usageCount})`;
    }

    if (editFormData.validUntil) {
      const selectedDate = new Date(editFormData.validUntil);
      if (selectedDate < new Date()) {
        newErrors.validUntil = "Expiry date must be in the future";
      }
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateCoupon = async (e) => {
    e.preventDefault();

    if (!validateEditForm()) return;

    setEditSubmitting(true);

    const updateData = {
      code: editFormData.code.toUpperCase(),
      discount: parseInt(editFormData.discount),
      maxUsage: editFormData.maxUsage ? parseInt(editFormData.maxUsage) : null,
      validUntil: editFormData.validUntil || null,
    };

    const result = await updateCoupon(editingCoupon._id, updateData);

    if (result.success) {
      setEditingCoupon(null);
      setEditFormData({
        code: "",
        discount: "5",
        maxUsage: "",
        validUntil: "",
      });
      await loadCoupons();
    }

    setEditSubmitting(false);
  };

  const handleCancelEdit = () => {
    setEditingCoupon(null);
    setEditFormData({
      code: "",
      discount: "5",
      maxUsage: "",
      validUntil: "",
    });
    setEditErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.code.trim()) {
      newErrors.code = "Coupon code is required";
    } else if (formData.code.length < 4) {
      newErrors.code = "Code must be at least 4 characters";
    } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = "Code must contain only uppercase letters and numbers";
    }

    if (formData.maxUsage && formData.maxUsage < 1) {
      newErrors.maxUsage = "Max usage must be at least 1";
    }

    if (formData.validUntil) {
      const selectedDate = new Date(formData.validUntil);
      if (selectedDate < new Date()) {
        newErrors.validUntil = "Expiry date must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    const couponData = {
      code: formData.code.toUpperCase(),
      type: "universal",
      discount: parseInt(formData.discount),
      maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : null,
      validUntil: formData.validUntil || null,
    };

    const result = await createCoupon(couponData);

    if (result.success) {
      setShowAddModal(false);
      setFormData({
        code: "",
        discount: "5",
        maxUsage: "",
        validUntil: "",
      });
      await loadCoupons();
    }

    setSubmitting(false);
  };

  const handleToggleStatus = async (couponId, currentStatus) => {
    const result = await updateCouponStatus(couponId, !currentStatus);
    if (result.success) {
      await loadCoupons();
    }
  };

  const handleDelete = async (couponId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this universal coupon? This cannot be undone."
      )
    ) {
      const result = await deleteCoupon(couponId);
      if (result.success) {
        await loadCoupons();
      }
    }
  };

  const getStatusColor = (coupon) => {
    if (!coupon.isActive) return "bg-gray-100 text-gray-600";
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return "bg-red-100 text-red-700";
    }
    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return "bg-orange-100 text-orange-700";
    }
    return "bg-green-100 text-green-700";
  };

  const getStatusText = (coupon) => {
    if (!coupon.isActive) return "Inactive";
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return "Expired";
    }
    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return "Limit Reached";
    }
    return "Active";
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
              <Tag className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Universal Coupons
              </h1>
              <p className="text-gray-600 mt-1">
                Manage coupons that work across all paid courses
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <Tag className="h-4 w-4" />
                  <span>{coupons.length} total coupons</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{coupons.filter((c) => c.isActive).length} active</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* Coupons List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">
            All Universal Coupons
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Universal Coupons
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first universal coupon to offer discounts across all
              courses
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
            >
              Create First Coupon
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {coupons.map((coupon) => (
              <div
                key={coupon._id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <code className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-lg font-mono text-lg font-bold">
                        {coupon.code}
                      </code>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold flex items-center space-x-1">
                        <Percent className="h-4 w-4" />
                        <span>{coupon.discount}% OFF</span>
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          coupon
                        )}`}
                      >
                        {getStatusText(coupon)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Used: <strong>{coupon.usageCount}</strong>
                          {coupon.maxUsage && ` / ${coupon.maxUsage}`}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Created:{" "}
                          {new Date(coupon.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {coupon.validUntil && (
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Expires:{" "}
                            {new Date(coupon.validUntil).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() =>
                        handleToggleStatus(coupon._id, coupon.isActive)
                      }
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        coupon.isActive
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-50"
                      }`}
                      title={coupon.isActive ? "Deactivate" : "Activate"}
                    >
                      {coupon.isActive ? (
                        <Eye className="h-5 w-5" />
                      ) : (
                        <EyeOff className="h-5 w-5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleEditCoupon(coupon)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Coupon"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Coupon"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Create Universal Coupon
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => {
                      const value = e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "");
                      setFormData({ ...formData, code: value });
                      debouncedDuplicateCheck(value); // ADD THIS LINE
                      if (errors.code) {
                        setErrors({ ...errors, code: "" });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase font-mono ${
                      errors.code ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g., SAVE20"
                    maxLength={20}
                  />
                  {/* ADD CHECKING INDICATOR */}
                  {checkingDuplicate && (
                    <p className="text-blue-500 text-xs mt-1 flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Checking availability...
                    </p>
                  )}
                  {errors.code && (
                    <p className="text-red-500 text-xs mt-1">{errors.code}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    4-20 characters, uppercase letters and numbers only
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount *
                  </label>
                  <select
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData({ ...formData, discount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {discountOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}% OFF
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Usage (Optional)
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsage}
                    onChange={(e) => {
                      setFormData({ ...formData, maxUsage: e.target.value });
                      if (errors.maxUsage) {
                        setErrors({ ...errors, maxUsage: "" });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.maxUsage ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Leave empty for unlimited"
                    min="1"
                  />
                  {errors.maxUsage && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.maxUsage}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid Until (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => {
                      setFormData({ ...formData, validUntil: e.target.value });
                      if (errors.validUntil) {
                        setErrors({ ...errors, validUntil: "" });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.validUntil ? "border-red-500" : "border-gray-300"
                    }`}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  {errors.validUntil && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.validUntil}
                    </p>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || checkingDuplicate || !!errors.code}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? "Creating..." : "Create Coupon"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCoupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Edit Coupon
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateCoupon} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={editFormData.code}
                    onChange={(e) => {
                      const value = e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "");
                      setEditFormData({ ...editFormData, code: value });
                      if (editErrors.code) {
                        setEditErrors({ ...editErrors, code: "" });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase font-mono ${
                      editErrors.code ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g., SAVE20"
                    maxLength={20}
                  />
                  {editErrors.code && (
                    <p className="text-red-500 text-xs mt-1">
                      {editErrors.code}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    4-20 characters, uppercase letters and numbers only
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount *
                  </label>
                  <select
                    value={editFormData.discount}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        discount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {discountOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}% OFF
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Usage (Optional)
                  </label>
                  <input
                    type="number"
                    value={editFormData.maxUsage}
                    onChange={(e) => {
                      setEditFormData({
                        ...editFormData,
                        maxUsage: e.target.value,
                      });
                      if (editErrors.maxUsage) {
                        setEditErrors({ ...editErrors, maxUsage: "" });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      editErrors.maxUsage ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Leave empty for unlimited"
                    min={editingCoupon.usageCount || 1}
                  />
                  {editErrors.maxUsage && (
                    <p className="text-red-500 text-xs mt-1">
                      {editErrors.maxUsage}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Current usage: {editingCoupon.usageCount}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid Until (Optional)
                  </label>
                  <input
                    type="date"
                    value={editFormData.validUntil}
                    onChange={(e) => {
                      setEditFormData({
                        ...editFormData,
                        validUntil: e.target.value,
                      });
                      if (editErrors.validUntil) {
                        setEditErrors({ ...editErrors, validUntil: "" });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      editErrors.validUntil
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  {editErrors.validUntil && (
                    <p className="text-red-500 text-xs mt-1">
                      {editErrors.validUntil}
                    </p>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting || !!editErrors.code}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {editSubmitting ? "Updating..." : "Update Coupon"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalCoupons;
