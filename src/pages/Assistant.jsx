import React from "react";
import { Sparkles } from "lucide-react";
import AgentChat from "@/components/agent/AgentChat";

export default function Assistant() {
  return (
    <AgentChat
      agentName="collection_organizer"
      title="Collection Organizer"
      subtitle="Your daily assistant for keeping the pack & card catalog organized."
      icon={<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-black"><Sparkles className="h-5 w-5" /></span>}
      adminOnly
      conversationLabel="Catalog review"
      newButtonLabel="New review"
    />
  );
}