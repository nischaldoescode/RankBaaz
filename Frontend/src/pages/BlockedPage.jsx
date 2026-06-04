/**
 * keeps the blocked page page focused and readable.
 */
import React from "react";
import { ShieldOff } from "lucide-react";

/**
 * shown when backend returns ip_blocked for any request
 */
const BlockedPage = ({ expiresAt }) => {
  const expiry = expiresAt ? new Date(expiresAt) : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-muted-foreground leading-relaxed">
            Your IP address has been blocked from accessing this platform. If you believe this is a mistake, please contact support.
          </p>
          {expiry && (
            <p className="text-sm text-muted-foreground">
              Block expires:{" "}
              <span className="font-semibold text-foreground">
                {expiry.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          )}
          {!expiry && (
            <p className="text-sm text-red-500 font-medium">This block is permanent.</p>
          )}
        </div>

          <a href="mailto:support@vidhgrow.online"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
};

export default BlockedPage;