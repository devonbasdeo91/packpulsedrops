import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { issueShareToken, dayStr } from "../../shared/shareToken.ts";

// Issues a short-lived, signed token that the client must present to
// claim-share-bonus. This proves the user went through the share flow
// (clicked a share button) rather than directly calling the claim endpoint.
// Only one token per day per user — if already claimed today, refuses.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const fresh = await base44.asServiceRole.entities.User.get(user.id);
    const today = dayStr(0);
    if ((fresh.last_share_bonus || "") === today) {
      return Response.json({ success: false, already: true });
    }

    const token = await issueShareToken(user.id, today);
    return Response.json({ success: true, token });
  } catch (error) {
    console.error("issue-share-token error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}