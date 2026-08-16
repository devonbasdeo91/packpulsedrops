import { useEffect, useState } from "react";
import { Table2, Loader2, CheckCircle2, ExternalLink, Unlink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

const CONNECTOR_ID = "6a79492816b0d1c0bc4c2faa";

export default function GoogleSheetsConnect() {
  const [connected, setConnected] = useState(false);
  const [sheetId, setSheetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Connection status doubles as the data fetch — invoke the logging function
  // with no pulls; it reports connected + the user's spreadsheet id.
  const check = async () => {
    try {
      const res = await base44.functions.invoke("log-pull-to-sheets", { pulls: [] });
      if (res.data?.connected) {
        setConnected(true);
        setSheetId(res.data.spreadsheetId || "");
      } else {
        setConnected(false);
        setSheetId("");
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) check();
      else setLoading(false);
    });
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          check();
          setConnecting(false);
        }
      }, 500);
    } catch (e) {
      setConnecting(false);
      toast({ title: "Could not start Google connection", description: e.message, variant: "destructive" });
    }
  };

  const handleDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
      setSheetId("");
      toast({ title: "Google Sheets disconnected", description: "Pulls will no longer be logged." });
    } catch (e) {
      toast({ title: "Disconnect failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
          <Table2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Google Sheets logging</h2>
          <p className="text-xs text-zinc-400">Auto-log every pack opening and card pull to a spreadsheet in your Google Drive.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
        </div>
      ) : connected ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Connected — your pulls are being logged to your PackPulseDrops Pull Log spreadsheet.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sheetId && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" /> Open spreadsheet
              </a>
            )}
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
            >
              <Unlink className="h-4 w-4" /> Disconnect
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-400">Connect your Google account to start logging pulls automatically.</p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Table2 className="h-4 w-4" />}
            {connecting ? "Connecting…" : "Connect Google Sheets"}
          </button>
        </>
      )}
    </section>
  );
}