/**
 * builds the admin confirm modal helper view used for content previews and modal workflows
 *
 * @file admin/src/helpers/modals/confirmmodal.jsx
 * @module admin/src/helpers/modals/confirmmodal
 * @exports module members used by the related app runtime
 */

import React from "react";
import { X, AlertTriangle } from "lucide-react";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // 'danger' or 'warning'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      ></div>

      {/* modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
        {/* close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* icon */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            type === "danger"
              ? "bg-red-100 text-red-600"
              : "bg-yellow-100 text-yellow-600"
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>

        {/* title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

        {/* message */}
        <p className="text-gray-600 mb-6">{message}</p>

        {/* actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors cursor-pointer ${
              type === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;