import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyShareToken, dayStr } from "../../shared/shareToken.ts";

const SHARE_BONUS_GEMS = 50;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Free gem rewards disabled — gems can only be earned by buying or selling.
    return Response.json({ error: "Share bonuses have been disabled. Gems can only be earned by buying or selling." }, { status: 403 });
  } catch (error) {
    console.error("claim-share-bonus error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}