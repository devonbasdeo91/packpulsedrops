import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessageBubble({ message, isMine }) {
  const time = new Date(message.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
          isMine
            ? "rounded-br-sm bg-gradient-to-br from-amber-300 to-orange-500 text-black"
            : "rounded-bl-sm bg-zinc-800 text-zinc-100",
          message._pending && "opacity-70"
        )}
      >
        <p className="break-words whitespace-pre-wrap select-text">{message.content}</p>
        <p className={cn("mt-1 flex items-center gap-1 text-[10px]", isMine ? "text-black/50" : "text-zinc-500")}>
          {message._pending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Sending…
            </>
          ) : (
            time
          )}
        </p>
      </div>
    </div>
  );
}