import React, { useState } from "react";
import { Copy, Check, RefreshCw, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-xs font-bold text-amber-300">
        {n}
      </span>
      <span className="text-sm text-zinc-300">{children}</span>
    </li>
  );
}

export default function Connect() {
  const [copied, setCopied] = useState(false);
  const serverUrl = new URL("/api/mcp", window.location.origin).toString();

  const copy = () => {
    navigator.clipboard?.writeText(serverUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-3xl font-bold text-white">Connect an AI assistant</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Point Claude, ChatGPT, or Cursor at PackPulseDrops. Once connected, your assistant can browse packs, check your
          collection, list cards, and more — acting as your signed-in account.
        </p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
        <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">MCP server URL</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={serverUrl}
            onClick={(e) => e.target.select()}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-zinc-300 outline-none"
          />
          <button
            onClick={copy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-400/5 p-3 text-sm text-amber-200/90">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Sign-in required: the first time you connect, your AI client opens our approval page. Sign in with your
            PackPulseDrops account and approve — the assistant only ever acts as you.
          </p>
        </div>
      </div>

      <Tabs defaultValue="claude" className="w-full">
        <TabsList className="bg-zinc-900/60">
          <TabsTrigger value="claude">Claude</TabsTrigger>
          <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
          <TabsTrigger value="cursor">Cursor</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="claude" className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <ol className="space-y-3">
            <Step n={1}>Open the profile menu (top right) and go to <b>Settings</b>.</Step>
            <Step n={2}>Select <b>Connectors</b> and click <b>Add custom connector</b>.</Step>
            <Step n={3}>Name it (e.g. "PackPulseDrops") and paste the MCP server URL above.</Step>
            <Step n={4}>Click <b>Add</b>, then approve the sign-in prompt when it opens.</Step>
          </ol>
        </TabsContent>

        <TabsContent value="chatgpt" className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <ol className="space-y-3">
            <Step n={1}>Go to <b>Apps</b> and enable <b>Developer mode</b> (acknowledge the risk ChatGPT warns about).</Step>
            <Step n={2}>Click <b>Create app</b>, name it, and paste the MCP server URL above.</Step>
            <Step n={3}>Click <b>Create</b>.</Step>
            <Step n={4}>From the chat composer, enable the app before prompting it.</Step>
          </ol>
        </TabsContent>

        <TabsContent value="cursor" className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <ol className="space-y-3">
            <Step n={1}>Open <b>Settings → Tools & Integrations</b> and click <b>New MCP Server</b>.</Step>
            <Step n={2}>
              It opens <code className="rounded bg-black/40 px-1">mcp.json</code> — add an entry whose{" "}
              <code className="rounded bg-black/40 px-1">url</code> is the server URL above.
            </Step>
            <Step n={3}>Save the file and toggle the server on.</Step>
          </ol>
        </TabsContent>

        <TabsContent value="custom" className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
          <ol className="space-y-3">
            <Step n={1}>Copy the MCP server URL above.</Step>
            <Step n={2}>Add it as a <b>streamable HTTP</b> MCP server in your client.</Step>
            <Step n={3}>A name and the URL are all most clients need — then reload the client.</Step>
          </ol>
        </TabsContent>
      </Tabs>

      <p className="flex items-start gap-2 text-sm text-zinc-500">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
        <span>After we ship changes, refresh or reconnect your client so it picks up the latest tools.</span>
      </p>
    </div>
  );
}