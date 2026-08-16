import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

// Verifies that a backend-function call came from a workflow or other
// platform-internal source (server-side) rather than a direct external/client
// call.
//
// Authentication is performed via TWO methods:
//
// 1. Shared secret (for function-to-function calls): The caller passes the
//    raw secret stored in the platform secrets manager as Internal_Auth_Secret
//    in the `internal_secret` body field.
//
// 2. Workflow label + platform service token (for workflow-to-function
//    calls): The workflow passes the non-secret label "wf_caller" in the
//    `internal_secret` body field. The function verifies the call by
//    attempting an authenticated API call via asServiceRole (using Pack,
//    which has public read, so the workflow service token can access it).
//    If the API call fails, the request is rejected — no unverified JWT
//    fallback is used, as that would allow token forgery.
export async function isInternalCall(req: Request, body?: any): Promise<boolean> {
  const s = body?.internal_secret;
  if (typeof s !== "string") return false;

  // Method 1: Direct secret match (function-to-function calls)
  const secret = secrets.get("Internal_Auth_Secret");
  if (secret && s === secret) return true;

  // Method 2: Workflow label + platform service token
  if (s === "wf_caller") {
    // Reject calls that carry user auth or cookies — these indicate a
    // frontend/browser request, not a platform-internal workflow call.
    const userAuth = req.headers.get("authorization");
    const cookie = req.headers.get("cookie");
    if (userAuth || cookie) return false;

    const serviceAuth = req.headers.get("base44-service-authorization");
    if (!serviceAuth) return false;

    // Verify the token via an authenticated API call.
    // Use Pack (public read) rather than User (admin-only) so the workflow
    // service token can access it even without admin-level permissions.
    // If the API call fails, reject — do NOT fall back to unverified JWT
    // decoding, which would allow attackers to forge tokens.
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.Pack.list('-created_date', 1);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}