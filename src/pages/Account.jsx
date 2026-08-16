import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserCircle, Mail, KeyRound, LogOut, Loader2, CheckCircle2, Trash2, AlertTriangle, Receipt, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import TradeHistory from "@/components/TradeHistory";
import GoogleSheetsConnect from "@/components/GoogleSheetsConnect";

export default function Account() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, []);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await base44.auth.resetPasswordRequest(user.email);
      setResetSent(true);
      toast({ title: "Reset link sent", description: `Check ${user.email} for a password reset link.` });
    } catch (e) {
      toast({ title: "Could not send reset link", description: e.message || "Try again later.", variant: "destructive" });
    } finally {
      setSendingReset(false);
    }
  };

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await base44.functions.invoke("delete-account", {});
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Account deleted", description: "Your PackPulseDrops account has been permanently removed." });
      setDeleteOpen(false);
      try {
        await base44.auth.logout("/login");
      } catch {
        window.location.href = "/login";
      }
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e.response?.data?.error || e.message || "Could not delete account.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">Account</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage your profile, password, and session.</p>
      </div>

      {/* Profile */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
            <UserCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Profile</h2>
            <p className="text-xs text-zinc-400">Your identity on PackPulseDrops.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-readonly" className="text-zinc-300">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              id="email-readonly"
              value={user?.email || ""}
              readOnly
              disabled
              className="pl-10 h-11 bg-zinc-900/60 text-zinc-400"
            />
          </div>
          <p className="text-xs text-zinc-500">Your email is your account. Friends reach you via this email address.</p>
        </div>
      </section>

      {/* Password */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Password</h2>
            <p className="text-xs text-zinc-400">Securely change your password via email verification.</p>
          </div>
        </div>

        {resetSent ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              A reset link was sent to <span className="font-semibold">{user?.email}</span>. Open the email and follow the link to set a new password.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              For your security, password changes are confirmed through a link sent to your email. Click below to receive it.
            </p>
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              disabled={sendingReset || !user?.email}
              className="mt-4 w-full h-11 border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white"
            >
              {sendingReset ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending link...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" /> Send password reset link
                </>
              )}
            </Button>
          </>
        )}
      </section>

      {/* Trade history */}
      <TradeHistory />

      {/* Transaction history link */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Transaction history</h2>
            <p className="text-xs text-zinc-400">View all your deposits, pack purchases, and trade fees.</p>
          </div>
        </div>
        <Link to="/transactions">
          <Button variant="outline" className="w-full h-11 border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white">
            View full transaction history <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </section>

      {/* Google Sheets logging */}
      <GoogleSheetsConnect />

      {/* Session */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-400/10 text-zinc-300">
            <LogOut className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Session</h2>
            <p className="text-xs text-zinc-400">Sign out of this device.</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full h-11"
        >
          {loggingOut ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging out...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </>
          )}
        </Button>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-300">Danger zone</h2>
            <p className="text-xs text-zinc-400">Permanently delete your PackPulseDrops account.</p>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
          className="w-full h-11"
        >
          <Trash2 className="h-4 w-4 mr-2" /> Delete account
        </Button>
      </section>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-red-500/30 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action is irreversible. All of your digital trading cards, balances, transaction history, and friend connections will be permanently destroyed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10 hover:text-white"
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-600/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete forever
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}