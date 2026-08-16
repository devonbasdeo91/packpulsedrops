import React from "react";
import { LifeBuoy } from "lucide-react";
import AgentChat from "@/components/agent/AgentChat";

export default function WithdrawalAssistant() {
  return (
    <AgentChat
      agentName="withdrawal_helper"
      title="Withdrawal Assistant"
      subtitle="Cash out your gems, track requests, and resolve withdrawals."
      icon={<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-black"><LifeBuoy className="h-5 w-5" /></span>}
      adminOnly={false}
      conversationLabel="Withdrawal help"
      newButtonLabel="New chat"
    />
  );
}