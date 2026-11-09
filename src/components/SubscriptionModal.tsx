import React, { useState } from "react";
import {
  Sparkles,
  Check,
  Shield,
  Zap,
  ArrowRight,
  TrendingUp,
  Sliders,
  History,
  X,
  Lock,
  Star,
  CreditCard,
  Building,
  Smartphone as PhoneIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Crown
} from "lucide-react";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationCount: number;
  isSubscribed?: boolean;
  onSubscribeSuccess: () => void;
  onCancelSubscription?: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  generationCount,
  isSubscribed = false,
  onSubscribeSuccess,
  onCancelSubscription,
}) => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("monthly");
  const [currency, setCurrency] = useState<"ZAR" | "USD">("ZAR");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState("");
  
  // Interactive PayFast Simulation State
  const [payfastStep, setPayfastStep] = useState<"info" | "portal">("info");
  const [payfastMethod, setPayfastMethod] = useState<"card" | "eft" | "capitec">("card");
  
  // PayFast Payment Form States
  const [cardNumber, setCardNumber] = useState("4000 1234 5678 9010");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [eftBank, setEftBank] = useState("fnb");
  const [capitecPhone, setCapitecPhone] = useState("082 123 4567");
  const [checkoutError, setCheckoutError] = useState("");

  if (!isOpen) return null;

  const handleStartCheckout = async () => {
    setIsUpgrading(true);
    setCheckoutError("");
    try {
      const token = localStorage.getItem("lnk_auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/payfast/generate-payment", {
        method: "POST",
        headers,
        body: JSON.stringify({ billingPeriod, currency })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to initialize PayFast checkout session.");
      }

      const data = await res.json();
      if (!data.success || !data.processUrl || !data.fields) {
        throw new Error("Invalid PayFast payment payload from server.");
      }

      // Create dynamic hidden form and submit to PayFast gateway
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.processUrl;
      form.style.display = "none";

      for (const [key, value] of Object.entries(data.fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      console.error("PayFast checkout error:", err);
      setCheckoutError(err.message || "Failed to redirect to PayFast. Please try again.");
      setIsUpgrading(false);
    }
  };

  const handlePayFastComplete = () => {
    setIsUpgrading(true);
    setTimeout(() => {
      setIsUpgrading(false);
      onSubscribeSuccess();
      setPayfastStep("info");
      onClose();
    }, 1800);
  };

  const handleUpdatePlan = () => {
    setIsUpdatingPlan(true);
    setTimeout(() => {
      setIsUpdatingPlan(false);
      setUpdateSuccessMsg("Plan options updated successfully!");
      setTimeout(() => setUpdateSuccessMsg(""), 3000);
    }, 600);
  };

  const handleConfirmCancel = () => {
    if (onCancelSubscription) {
      onCancelSubscription();
    }
    setShowCancelConfirm(false);
    onClose();
  };

  const getPrice = () => {
    if (currency === "USD") {
      return billingPeriod === "annually" ? "$5" : "$7";
    } else {
      return billingPeriod === "annually" ? "R80" : "R120";
    }
  };

  const periodStr = billingPeriod === "annually" ? "/ month, billed annually" : "/ month";
  const totalBilledStr = currency === "USD" 
    ? (billingPeriod === "annually" ? "($60 billed annually)" : "($7 billed monthly)")
    : (billingPeriod === "annually" ? "(R960 billed annually)" : "(R120 billed monthly)");

  return (
    <div
      id="modal-subscription-paywall"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 text-[#212020] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isSubscribed ? (
          /* Subscribed Creator Pro Dashboard & Edit/Cancel View */
          <div className="flex flex-col h-full min-h-0">
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-5 sm:p-7 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
                <Sparkles className="w-40 h-40 text-white" />
              </div>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="absolute top-4 right-4 text-slate-300 hover:text-white p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 transition cursor-pointer z-30 shadow-sm"
                aria-label="Close"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2 relative z-10 pr-10">
                <span className="bg-blue-500 text-white font-bold tracking-wider text-[10px] uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-white" /> CREATOR PRO (ACTIVE)
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Subscription & Billing
                </h3>
                <p className="text-xs text-slate-300 max-w-md font-medium leading-relaxed">
                  You are currently on <strong className="text-white">Creator Pro</strong>. Enjoy unlimited post generation, AI illustration drafting, and automated LinkedIn direct scheduling.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0 text-xs">
              {updateSuccessMsg && (
                <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 p-3 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{updateSuccessMsg}</span>
                </div>
              )}

              {/* Edit Subscription Form */}
              <div className="bg-stone-50 border-2 border-[#0f172a] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3">
                  <h4 className="font-bold text-[#0f172a] text-sm flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" /> Edit Subscription Plan
                  </h4>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase border border-emerald-300">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1.5">Preferred Currency</label>
                    <div className="bg-white p-1 rounded-xl inline-flex gap-1 border-2 border-stone-300 w-full">
                      <button
                        type="button"
                        onClick={() => setCurrency("ZAR")}
                        className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer font-bold ${
                          currency === "ZAR" ? "bg-[#0f172a] text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        ZAR (R)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrency("USD")}
                        className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer font-bold ${
                          currency === "USD" ? "bg-[#0f172a] text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        USD ($)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1.5">Billing Cadence</label>
                    <div className="bg-white p-1 rounded-xl inline-flex gap-1 border-2 border-stone-300 w-full">
                      <button
                        type="button"
                        onClick={() => setBillingPeriod("monthly")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all cursor-pointer font-bold text-xs ${
                          billingPeriod === "monthly" ? "bg-[#0f172a] text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingPeriod("annually")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1 ${
                          billingPeriod === "annually" ? "bg-[#0f172a] text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        <span>Yearly</span>
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold">Save 33%</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t-2 border-stone-200">
                  <div className="text-stone-600 text-xs">
                    Current Rate: <strong className="text-stone-900">{getPrice()} {periodStr}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdatePlan}
                    disabled={isUpdatingPlan}
                    className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 border-2 border-[#0f172a]"
                  >
                    {isUpdatingPlan ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                    <span>Update Subscription</span>
                  </button>
                </div>
              </div>

              {/* Cancel Subscription Card */}
              <div className="bg-rose-50/50 border-2 border-rose-300 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <h5 className="font-bold text-rose-900 text-xs">Cancel Subscription</h5>
                    <p className="text-[11px] text-rose-700 leading-normal">
                      Cancelling will revert your account to the <strong>FREE PLAN</strong> (limit 3 post generations). You will lose unlimited drafting and instant scheduling features.
                    </p>
                  </div>
                </div>

                {showCancelConfirm ? (
                  <div className="bg-white border-2 border-rose-300 rounded-xl p-4 space-y-3 animate-fade-in">
                    <p className="text-xs font-bold text-rose-900">Are you sure you want to cancel your Creator Pro subscription?</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmCancel}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex-1 border-2 border-rose-600"
                      >
                        Yes, Confirm Cancellation
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer border-2 border-stone-300"
                      >
                        Keep Subscription
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full bg-white hover:bg-rose-100 text-rose-700 border-2 border-rose-300 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Cancel Creator Pro Subscription
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t-2 border-stone-200 bg-stone-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer border-2 border-[#0f172a]"
              >
                Close
              </button>
            </div>
          </div>
        ) : payfastStep === "info" ? (
          <div className="flex flex-col h-full min-h-0">
            {/* Banner decorative header with Dark Blue Theme */}
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-5 sm:p-7 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
                <Sparkles className="w-40 h-40 text-white" />
              </div>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="absolute top-4 right-4 text-slate-300 hover:text-white p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 transition cursor-pointer z-30 shadow-sm"
                aria-label="Close modal"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2 relative z-10 pr-10">
                <span className="bg-blue-500 text-white font-bold tracking-wider text-[10px] uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-white" /> Creator Pro Plan
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Draft without limits
                </h3>
                <p className="text-xs text-slate-300 max-w-md font-medium leading-relaxed">
                  {generationCount >= 3 ? (
                    <>You've reached your limit of <strong className="text-white">3 free drafts</strong>. Upgrade to Creator Pro to unlock unlimited drafting & Direct Publishing.</>
                  ) : (
                    <>Unlock full access to draft, refine, and publish unlimited high-converting updates instantly.</>
                  )}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
              {/* Currency and Billing Selectors */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b-2 border-stone-200 pb-4">
                <div>
                  <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1.5">Select Currency</label>
                  <div className="bg-stone-100 p-1 rounded-xl inline-flex gap-1 border-2 border-stone-300 text-xs">
                    <button
                      type="button"
                      onClick={() => setCurrency("ZAR")}
                      className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer font-bold ${
                        currency === "ZAR" ? "bg-[#0f172a] text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      ZAR (R)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("USD")}
                      className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer font-bold ${
                        currency === "USD" ? "bg-[#0f172a] text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1.5">Billing Period</label>
                  <div className="bg-stone-100 border-2 border-stone-300 p-1 rounded-xl inline-flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setBillingPeriod("monthly")}
                      className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer font-bold ${
                        billingPeriod === "monthly"
                          ? "bg-[#0f172a] text-white shadow-xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingPeriod("annually")}
                      className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold ${
                        billingPeriod === "annually"
                          ? "bg-[#0f172a] text-white shadow-xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      <span>Yearly</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md font-bold shrink-0">Save 33%</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pricing Highlight Card */}
              <div className="bg-stone-50 border-2 border-[#0f172a] rounded-2xl p-4 sm:p-5 text-center space-y-2 relative">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] font-serif">{getPrice()}</span>
                  <span className="text-xs sm:text-sm font-semibold text-stone-600">{periodStr}</span>
                </div>
                <p className="text-xs font-bold text-blue-900 tracking-wide">{totalBilledStr}</p>
                <div className="text-[10px] text-stone-500 font-medium flex items-center justify-center gap-1.5 mt-1">
                  <span className="flex items-center gap-1 bg-slate-200 px-2.5 py-0.5 rounded-md text-[#0f172a] font-bold border border-slate-300">
                    🇿🇦 SECURED WITH PAYFAST
                  </span>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">Everything included in Creator Pro</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-[#0f172a] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <Check className="w-3.5 h-3.5 text-[#0f172a]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#0f172a]">Unlimited Post Creation</h5>
                      <p className="text-[10px] text-stone-600 leading-normal mt-0.5">Generate and refine as many drafts as you need.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-[#0f172a] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <Check className="w-3.5 h-3.5 text-[#0f172a]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#0f172a]">All Premium Tones</h5>
                      <p className="text-[10px] text-stone-600 leading-normal mt-0.5">Access educational, casual, bold, and humorous modes.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-[#0f172a] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <Check className="w-3.5 h-3.5 text-[#0f172a]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#0f172a]">1-Click Direct Publishing</h5>
                      <p className="text-[10px] text-stone-600 leading-normal mt-0.5">Publish your polished updates directly to LinkedIn.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-[#0f172a] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <Check className="w-3.5 h-3.5 text-[#0f172a]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#0f172a]">Advanced Analytics</h5>
                      <p className="text-[10px] text-stone-600 leading-normal mt-0.5">Get scores on Hook strength, scannability, and read time.</p>
                    </div>
                  </div>
                </div>
              </div>

              {checkoutError && (
                <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-3 rounded-xl font-bold flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-4 border-t-2 border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center gap-3 justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-stone-600 text-[11px] font-medium order-2 sm:order-1">
                <Shield className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span>Secure payment processed via PayFast (Pty) Ltd.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border-2 border-stone-300 hover:bg-stone-200/80 text-stone-700 font-bold text-xs cursor-pointer transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleStartCheckout}
                  disabled={isUpgrading}
                  className="flex-1 sm:flex-initial bg-[#0f172a] hover:bg-slate-800 border-2 border-[#0f172a] text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer min-w-[180px]"
                >
                  {isUpgrading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Opening PayFast...</span>
                    </>
                  ) : (
                    <>
                      <span>Checkout with PayFast</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* PayFast Payment Portal Simulator */
          <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden">
            {/* PayFast Header */}
            <div className="bg-[#1e293b] text-white p-4 flex items-center justify-between border-b border-rose-500 border-b-2">
              <div className="flex items-center gap-2">
                <div className="bg-red-600 text-white font-black text-xs px-2 py-1 rounded tracking-tight">payfast</div>
                <span className="text-xs font-bold tracking-wide text-slate-300">Secure Payment Gateway</span>
              </div>
              <button
                onClick={() => setPayfastStep("info")}
                className="text-xs text-slate-400 hover:text-white font-semibold cursor-pointer"
              >
                Cancel Payment
              </button>
            </div>

            {/* Merchant info block */}
            <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center text-xs">
              <div>
                <p className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Merchant</p>
                <p className="font-bold text-slate-800">draftr Studio (Pty) Ltd</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Amount Due</p>
                <p className="font-extrabold text-slate-900 text-lg">
                  {currency === "ZAR" ? `R${billingPeriod === "annually" ? "960.00" : "120.00"}` : `$${billingPeriod === "annually" ? "60.00" : "7.00"}`}
                </p>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayfastMethod("card")}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    payfastMethod === "card"
                      ? "bg-white border-blue-900 text-blue-900 shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-blue-900" />
                  <span className="text-[10px] font-bold">Credit/Debit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayfastMethod("eft")}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    payfastMethod === "eft"
                      ? "bg-white border-blue-900 text-blue-900 shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Building className="w-5 h-5 text-blue-900" />
                  <span className="text-[10px] font-bold">Instant EFT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayfastMethod("capitec")}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    payfastMethod === "capitec"
                      ? "bg-white border-blue-900 text-blue-900 shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <PhoneIcon className="w-5 h-5 text-blue-900" />
                  <span className="text-[10px] font-bold">Capitec Pay</span>
                </button>
              </div>

              {/* Method Form Render */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                {payfastMethod === "card" && (
                  <div className="space-y-3 text-left">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        defaultValue="Professional Creator"
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVV / Security Code</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {payfastMethod === "eft" && (
                  <div className="space-y-3 text-left">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Choose Bank for Instant EFT</label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {["fnb", "standard", "capitec", "absa", "nedbank"].map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setEftBank(bank)}
                          className={`p-2.5 rounded-lg border text-left font-bold cursor-pointer uppercase flex items-center justify-between ${
                            eftBank === bank
                              ? "bg-slate-100 border-slate-800 text-slate-900"
                              : "border-slate-200 text-slate-600 bg-white"
                          }`}
                        >
                          <span>{bank}</span>
                          {eftBank === bank && <span className="text-emerald-600">●</span>}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Secured bank connection ensures rapid processing via automated Instant EFT.
                    </p>
                  </div>
                )}

                {payfastMethod === "capitec" && (
                  <div className="space-y-3 text-left">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Capitec Verified Phone Number / ID</label>
                      <input
                        type="text"
                        value={capitecPhone}
                        onChange={(e) => setCapitecPhone(e.target.value)}
                        placeholder="e.g. 082 123 4567"
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      You will receive an in-app push authorization request on your Capitec Banking App to complete the payment of <strong>{currency === "ZAR" ? `R${billingPeriod === "annually" ? "960.00" : "120.00"}` : `$${billingPeriod === "annually" ? "60.00" : "7.00"}`}</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* PayFast CTA Button */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePayFastComplete}
                disabled={isUpgrading}
                className="w-full bg-[#10b981] hover:bg-[#059669] disabled:bg-[#a7f3d0] text-white font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all uppercase tracking-wide"
              >
                {isUpgrading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Processing Secure PayFast Authorization...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Secure Payment of {currency === "ZAR" ? `R${billingPeriod === "annually" ? "960.00" : "120.00"}` : `$${billingPeriod === "annually" ? "60.00" : "7.00"}`}</span>
                  </>
                )}
              </button>
              <p className="text-[9px] text-center text-slate-400 font-medium">
                🔒 PCI-DSS Compliant 256-Bit SSL Encryption. PayFast Secure Node.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
