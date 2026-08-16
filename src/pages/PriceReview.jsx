import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image } from '@/components/ui/image';
import { TrendingDown, Check, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function PriceReview() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('No token provided in the link.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await base44.functions.invoke('apply-price-suggestion', { token });
        setSuggestion(res.data);
        setCustomPrice(String(res.data.suggested_price_gems));
      } catch (e) {
        setError(e?.response?.data?.error || e.message || 'Failed to load suggestion');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleApply = async () => {
    setError(null);
    setApplying(true);
    try {
      const price = parseInt(customPrice, 10);
      const res = await base44.functions.invoke('apply-price-suggestion', {
        token,
        apply: true,
        price: isNaN(price) ? undefined : price,
      });
      setApplied(res.data);
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Failed to apply price';
      if (msg.includes('Login required')) {
        // Redirect to login with return URL preserved
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?returnTo=${returnUrl}`;
        return;
      }
      setError(msg);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (applied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-card border-amber-500/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-2">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl">Price Updated!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your listing for <strong className="text-foreground">{suggestion?.listing?.card_name}</strong> has been repriced.
            </p>
            <div className="text-3xl font-bold text-amber-400">
              {applied.new_price_gems.toLocaleString()} gems
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="line-through">{applied.old_price_gems.toLocaleString()} gems</span>
              {' → '}
              <span className="text-amber-400 font-bold">{applied.new_price_gems.toLocaleString()} gems</span>
              {' '}(${applied.new_price_usd})
            </p>
            <p className="text-sm text-muted-foreground">
              The new price is now live on the marketplace. You'll also receive a notification in the app.
            </p>
            <Link to="/marketplace">
              <Button className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold">
                View on Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !suggestion) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-2">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <CardTitle className="text-xl">Link Expired or Invalid</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">
              Price suggestion links expire after 7 days. You can always adjust your listing price from the marketplace.
            </p>
            <Link to="/marketplace">
              <Button variant="outline" className="w-full">
                Go to Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!suggestion) return null;

  const { listing, suggested_price_gems, suggested_price_usd } = suggestion;
  const reduction = (listing.current_price_gems || 0) - suggested_price_gems;
  const reductionUsd = (reduction * 0.0035).toFixed(2);

  return (
    <div className="min-h-[60vh] py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Price Suggestion</h1>
            <p className="text-sm text-muted-foreground">Your listing has been active for 7+ days</p>
          </div>
        </div>

        <Card className="bg-card overflow-hidden">
          {listing.image_url && (
            <div className="aspect-[3/2] w-full bg-muted">
              <Image src={listing.image_url} fittingType="fill" className="w-full h-full" />
            </div>
          )}
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold">{listing.card_name}</h2>
              <p className="text-sm text-muted-foreground capitalize">
                {listing.category} · {listing.rarity}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                <p className="text-lg font-bold">{listing.current_price_gems.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">${listing.current_price_usd}</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                <p className="text-xs text-amber-400 mb-1">Suggested Price</p>
                <p className="text-lg font-bold text-amber-400">{suggested_price_gems.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">${suggested_price_usd}</p>
              </div>
            </div>

            <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
              <p className="text-sm text-emerald-400 font-medium">
                Save buyers {reduction.toLocaleString()} gems (${reductionUsd})
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Set your price (gems)</label>
              <Input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                min={listing.card_value_gems || 1}
                max={listing.current_price_gems - 1}
                className="text-lg font-bold"
              />
              <p className="text-xs text-muted-foreground">
                Must be between {(listing.card_value_gems || 0).toLocaleString()} (card value) and {(listing.current_price_gems - 1).toLocaleString()} (current - 1)
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={handleApply}
              disabled={applying}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-lg py-6"
            >
              {applying ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Applying...
                </>
              ) : (
                'Apply Price Change'
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll receive a notification in the app once the change is live.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}