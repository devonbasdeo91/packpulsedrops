import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronRight, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function statusMeta(status) {
  if (status === "completed" || status === "success") return { icon: CheckCircle2, cls: "text-emerald-400", label: "done" };
  if (status === "failed" || status === "error") return { icon: AlertTriangle, cls: "text-red-400", label: "failed" };
  return { icon: Loader2, cls: "text-amber-400 animate-spin", label: status || "running" };
}

function ToolCall({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = statusMeta(toolCall.status);
  const Icon = meta.icon;
  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;

  let parsedArgs = toolCall.arguments_string;
  try { parsedArgs = JSON.parse(toolCall.arguments_string); } catch { /* keep raw */ }
  let parsedResults = toolCall.results;
  if (typeof parsedResults === "string") {
    try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
  }

  const activeLabel = proj.active_label || toolCall.name;
  const doneLabel = proj.label || toolCall.name;
  const errorLabel = proj.error_label || toolCall.name;

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10"
      >
        <Icon className={cn("h-3.5 w-3.5", meta.cls)} />
        <span className="font-medium">
          {toolCall.status === "failed" || toolCall.status === "error" ? errorLabel : toolCall.status === "completed" || toolCall.status === "success" ? doneLabel : activeLabel}
        </span>
        <span className="text-zinc-500">· {meta.label}</span>
        {!hideDetails && <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />}
      </button>
      {!hideDetails && expanded && (
        <div className="mt-2 space-y-2 rounded-md border border-white/10 bg-black/30 p-3 font-mono text-[11px]">
          <div>
            <p className="text-zinc-500">Parameters:</p>
            <pre className="mt-1 overflow-x-auto text-zinc-300">{JSON.stringify(parsedArgs, null, 2)}</pre>
          </div>
          {parsedResults !== undefined && (
            <div>
              <p className="text-zinc-500">Result:</p>
              <pre className="mt-1 overflow-x-auto text-zinc-300">{JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3", isUser ? "bg-amber-400/15 text-amber-50" : "bg-white/5 text-zinc-100")}>
        {message.content && (
          isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-sm text-zinc-100 [&_p]:my-1 [&_li]:my-0.5">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )
        )}
        {message.tool_calls?.map((tc, i) => <ToolCall key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}