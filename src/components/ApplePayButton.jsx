import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, PaymentRequestButtonElement } from "@stripe/react-stripe-js";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

/**
 * Native Apple Pay / Google Pay button for one-tap gem purchases.
 * Uses Stripe's Payment Request Button + PaymentIntents — no redirect to
 * Stripe Checkout. Only renders on devices that support Apple Pay or Google
 * Pay; returns null otherwise (the regular card checkout button stays).
 *
 * Props:
 *  - amountCents: number (e.g. 1900 for $19.00)
 *  - gems: number of gems in the package
 *  - label: string shown on the Apple Pay sheet (e.g. "1,500 Gems")
 *  - onSuccess: callback({ gems }) after successful payment
 *  - onError: callback(errorMessage) on failure
 */
function ApplePayButtonInner({ amountCents, gems, label, onSuccess, onError }) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [available, setAvailable] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: "US",
      currency: "usd",
      total: { label, amount: amountCents },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    let handler;
    pr.canMakePayment()
      .then((result) => {
        if (result && (result.applePay || result.googlePay)) {
          setPaymentRequest(pr);
          setAvailable(true);
        }
      })
      .catch(() => {});

    handler = async (ev) => {
      setProcessing(true);
      try {
        const res = await base44.functions.invoke("create-gem-payment-intent", {
          amount_usd: amountCents / 100,
          gems,
        });
        if (res.data?.error) throw new Error(res.data.error);
        const clientSecret = res.data?.client_secret;
        if (!clientSecret) throw new Error("No client secret returned");

        const { error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: ev.paymentMethod.id,
        });

        if (error) {
          ev.complete("fail");
          onError?.(error.message);
        } else {
          ev.complete("success");
          onSuccess?.({ gems });
        }
      } catch (e) {
        ev.complete("fail");
        onError?.(e.message || "Apple Pay failed");
      } finally {
        setProcessing(false);
      }
    };
    pr.on("paymentmethod", handler);

    return () => {
      pr.off("paymentmethod", handler);
    };
  }, [stripe, amountCents, gems, label]);

  if (!available || !paymentRequest) return null;

  return (
    <div className="relative w-full">
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: "buy",
              theme: "dark",
              height: "44px",
            },
          },
        }}
        className="w-full"
      />
      {processing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}

export default function ApplePayButton(props) {
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    let mounted = true;
    base44.functions.invoke("get-stripe-config")
      .then((res) => {
        const pk = res.data?.publishableKey;
        if (pk && mounted) setStripePromise(loadStripe(pk));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!stripePromise) return null;

  return (
    <Elements stripe={stripePromise}>
      <ApplePayButtonInner {...props} />
    </Elements>
  );
}