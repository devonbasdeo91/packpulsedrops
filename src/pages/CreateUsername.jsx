import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function CreateUsername() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("set-username", { username });
      if (res.data?.error) throw new Error(res.data.error);
      window.location.href = "/";
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not set username");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      icon={AtSign}
      title="Choose your username"
      subtitle="Enter a valid email address friends can use to reach you"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username (email)</Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="username"
              type="text"
              inputMode="email"
              autoFocus
              placeholder="pulpsepackdrops@gmail.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">Enter a valid email address — friends reach you via this email.</p>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Set my username"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}