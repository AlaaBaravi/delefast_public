/**
 * DEPRECATED: Do not use custom webhook verification.
 * Use: authenticate.webhook(request) in webhook routes.
 */
export function verifyWebhook() {
  throw new Error(
    "Do not use custom webhook verification. Use authenticate.webhook(request)."
  );
}
