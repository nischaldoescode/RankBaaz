/**
 * Branded HTML Error Pages
 * Returns styled HTML instead of JSON for blocked requests
 */

/**
 * Bot/Challenge Required Error Page
 */
export const botBlockedPage = (reason = "Security verification required") => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Restricted - RankBaaz</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: black;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            max-width: 500px;
            width: 100%;
            overflow: hidden;
            animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            background: black;
            padding: 30px;
            text-align: center;
            color: white;
        }

        .status-code {
            font-size: 72px;
            font-weight: 800;
            margin-bottom: 10px;
            text-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .status-text {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .divider {
            height: 3px;
            background: rgba(255, 255, 255, 0.3);
            margin: 20px auto;
            width: 80%;
        }

        .brand {
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 1px;
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
        }

        .message {
            font-size: 18px;
            color: #4a5568;
            margin-bottom: 15px;
            line-height: 1.6;
            background: black;
        }

        .footer {
            padding: 20px 30px;
            background: black;
            text-align: center;
            font-size: 14px;
            color: #718096;
        }

        .footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        @media (max-width: 600px) {
            .status-code {
                font-size: 56px;
            }

            .status-text {
                font-size: 20px;
            }

            .brand {
                font-size: 28px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="status-code">403</div>
            <div class="status-text">Access Forbidden</div>
            <div class="divider"></div>
            <div class="brand">RankBaaz</div>
        </div>

    </div>
</body>
</html>
  `;
};

/**
 * Rate Limited Error Page
 */
export const rateLimitPage = () => {
  return botBlockedPage(
    "Too many requests detected from your IP address."
  );
};

/**
 * CORS Error Page
 */
export const corsErrorPage = (origin) => {
  return botBlockedPage(
    `Access denied from origin: ${origin}. This resource is only accessible from authorized domains.`
  );
};