import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SettingsDialog({ open, onOpenChange, user }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await base44.auth.logout("/login");
    } catch {
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-white">Settings</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Manage your account and app preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-zinc-400">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{user?.email || "—"}</p>
          </div>

          <Button
            variant="outline"
            className="w-full border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white"
            disabled={loggingOut}
            onClick={handleLogout}
          >
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Log out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}