import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../icons/Logo";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import {
  fetchDriverInviteDetails,
  registerAuthUser,
  resendSignupOtp,
  verifySignupOtp,
} from "../services/authApi";

const inputClasses =
  "mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none ring-offset-2 focus:ring-2 focus:ring-slate-900/20 disabled:bg-slate-50 disabled:text-slate-500";

const formatSeconds = (value) => {
  const total = Math.max(0, Number(value || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins <= 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = (searchParams.get("invite") || "").trim();
  const isInviteSignup = inviteToken.length > 0;

  const [otpStage, setOtpStage] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpTarget, setOtpTarget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [lockCountdown, setLockCountdown] = useState(0);

  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteDetails, setInviteDetails] = useState(null);

  const [nameValue, setNameValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");

  useEffect(() => {
    if (!isInviteSignup) {
      return;
    }

    let isCancelled = false;

    const loadInvite = async () => {
      try {
        setInviteLoading(true);
        setInviteError("");
        const details = await fetchDriverInviteDetails(inviteToken);
        if (isCancelled) return;

        setInviteDetails(details || null);
        setNameValue(details?.name || "");
        setPhoneValue(details?.phone || "");
      } catch (error) {
        if (isCancelled) return;
        setInviteError(error?.message || "Invalid or expired invite link.");
      } finally {
        if (!isCancelled) {
          setInviteLoading(false);
        }
      }
    };

    loadInvite();

    return () => {
      isCancelled = true;
    };
  }, [inviteToken, isInviteSignup]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setResendCooldown((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (lockCountdown <= 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setLockCountdown((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockCountdown]);

  const inviteMetaLabel = useMemo(() => {
    if (!inviteDetails) {
      return "";
    }
    const fleetName = inviteDetails?.fleetName || "Fleet";
    const fleetCode = inviteDetails?.fleetCode || "";
    return [fleetName, fleetCode].filter(Boolean).join(" • ");
  }, [inviteDetails]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (otpStage) {
      if (!challengeId || !otpCode.trim()) {
        toast.error("Please enter the OTP code.");
        return;
      }

      if (lockCountdown > 0) {
        toast.error(`OTP is locked. Try again in ${formatSeconds(lockCountdown)}.`);
        return;
      }

      try {
        setIsSubmitting(true);
        await verifySignupOtp({ challengeId, otpCode: otpCode.trim() });
        toast.success(t("auth.accountCreated", "Account created. Please sign in."));
        navigate("/signin", { replace: true });
      } catch (error) {
        console.error("OTP verify failed:", error);
        toast.error(error?.message || "Invalid OTP. Please try again.");
        if (error?.retryAfterSeconds > 0) {
          setLockCountdown(error.retryAfterSeconds);
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isInviteSignup && (inviteLoading || inviteError || !inviteDetails)) {
      toast.error(inviteError || "Invitation details are still loading.");
      return;
    }

    const safeName = String(nameValue || "").trim();
    const safePhone = String(phoneValue || "").trim();
    const safePassword = String(passwordValue || "");

    if (!safeName || !safePhone || !safePassword) {
      toast.error("Please fill all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await registerAuthUser({
        name: safeName,
        phone: safePhone,
        password: safePassword,
        type: isInviteSignup ? "driver" : "fleet-admin",
        inviteToken: isInviteSignup ? inviteToken : undefined,
        email: isInviteSignup ? inviteDetails?.email : undefined,
        fleetId: isInviteSignup ? inviteDetails?.fleet_id : undefined,
        driverId: isInviteSignup ? inviteDetails?.driver_id : undefined,
      });

      setChallengeId(result?.challengeId || "");
      setOtpTarget(result?.recipientMasked || safePhone);
      setResendCooldown(Number(result?.resendCooldownSeconds || 30));
      setOtpStage(true);
      toast.success(`OTP sent to ${result?.recipientMasked || safePhone}.`);
    } catch (error) {
      console.error("Sign up failed:", error);
      const message = String(error?.message || "").toLowerCase();
      toast.error(
        message.includes("already")
          ? t("auth.mobileAlreadyExists", "Mobile number already exists.")
          : t("auth.signUpFailed", "Sign up failed. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendSignupOtp = async () => {
    if (!challengeId) {
      toast.error("No signup challenge found. Please create account again.");
      return;
    }

    if (lockCountdown > 0) {
      toast.error(`OTP is locked. Try again in ${formatSeconds(lockCountdown)}.`);
      return;
    }

    if (resendCooldown > 0) {
      toast.error(`Please wait ${formatSeconds(resendCooldown)} before requesting another OTP.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await resendSignupOtp(challengeId);
      setResendCooldown(Number(result?.resendCooldownSeconds || 30));
      toast.success(`OTP resent to ${result?.recipientMasked || otpTarget}.`);
    } catch (error) {
      toast.error(error?.message || "Unable to resend OTP.");
      if (error?.retryAfterSeconds > 0) {
        setResendCooldown(error.retryAfterSeconds);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <section className="relative flex min-h-[45vh] items-center justify-center overflow-hidden bg-[#0D0F16] px-8 py-16 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_15%_20%,rgba(56,189,248,0.16),transparent_60%),radial-gradient(500px_circle_at_85%_70%,rgba(251,191,36,0.12),transparent_60%)]"
        />
        <div className="relative z-10 w-full max-w-md space-y-6 animate-in fade-in slide-in-from-left-6 duration-700">
          <Logo className="w-48 text-white" />
          <p className="text-base text-white/70">
            {t("auth.marketingText", "To empower businesses with intelligent, sustainable, and tailor-made fleet solutions that optimize operations, enhance the driver experience, and deliver measurable efficiency.")}
          </p>
          <div className="text-md text-white/60">
            <p className="flex items-center gap-1">
              <ArrowRight size={18} />
              {t("auth.marketingBullets.digitization", "Full service digitization tool")}
            </p>
            <p className="flex items-center gap-1">
              <ArrowRight size={18} />
              {t("auth.marketingBullets.optimization", "Cost and performance optimization for vehicle fleets")}
            </p>
            <p className="flex items-center gap-1">
              <ArrowRight size={18} />
              {t("auth.marketingBullets.billing", "Billing tool with reporting system")}
            </p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-12">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl animate-in fade-in slide-in-from-right-6 duration-700">
          <header className="space-y-2">
            <h2 className="text-3xl font-semibold text-slate-900">
              {otpStage ? "Verify OTP" : t("auth.createYourAccount", "Create your account")}
            </h2>
            {otpStage ? <p className="text-sm text-slate-600">Enter the OTP sent to {otpTarget}.</p> : null}
          </header>

          {!otpStage && isInviteSignup ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-900">
              {inviteLoading ? (
                <p>Loading invitation details...</p>
              ) : inviteError ? (
                <p className="text-rose-600">{inviteError}</p>
              ) : (
                <>
                  <p className="font-semibold uppercase tracking-[0.16em] text-indigo-700">Driver Invitation</p>
                  <p className="mt-1 text-sm font-medium">{inviteMetaLabel}</p>
                  {inviteDetails?.email ? <p className="mt-1 text-slate-600">{inviteDetails.email}</p> : null}
                </>
              )}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!otpStage ? (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  {t("auth.fullName", "Full name")}
                  <input
                    className={inputClasses}
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder={t("auth.namePlaceholder", "Avery Patel")}
                    value={nameValue}
                    onChange={(event) => setNameValue(event.target.value)}
                    disabled={isInviteSignup && Boolean(inviteDetails)}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {t("auth.mobile", "Mobile number")}
                  <input
                    className={inputClasses}
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    placeholder={t("auth.mobilePlaceholder", "+491701111111")}
                    value={phoneValue}
                    onChange={(event) => setPhoneValue(event.target.value)}
                    disabled={isInviteSignup && Boolean(inviteDetails)}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {t("auth.password", "Password")}
                  <input
                    className={inputClasses}
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder={t("auth.newPasswordPlaceholder", "Create a password")}
                    value={passwordValue}
                    onChange={(event) => setPasswordValue(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  OTP code
                  <input
                    className={inputClasses}
                    type="text"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter OTP"
                  />
                </label>
                <button
                  type="button"
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleResendSignupOtp}
                  disabled={isSubmitting || resendCooldown > 0 || lockCountdown > 0}
                >
                  {resendCooldown > 0
                    ? `Resend OTP in ${formatSeconds(resendCooldown)}`
                    : "Resend OTP"}
                </button>
              </>
            )}

            <button
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
              type="submit"
              disabled={
                isSubmitting ||
                lockCountdown > 0 ||
                (isInviteSignup && !otpStage && (inviteLoading || Boolean(inviteError)))
              }
            >
              {isSubmitting
                ? otpStage
                  ? "Verifying..."
                  : "Sending OTP..."
                : otpStage
                  ? "Verify OTP"
                  : t("actions.createAccount", "Create account")}
            </button>

            {lockCountdown > 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                OTP attempts locked. Try again in {formatSeconds(lockCountdown)}.
              </p>
            ) : null}

            {otpStage ? (
              <button
                type="button"
                className="w-full rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => {
                  setOtpStage(false);
                  setChallengeId("");
                  setOtpCode("");
                  setResendCooldown(0);
                  setLockCountdown(0);
                }}
              >
                Back
              </button>
            ) : null}
          </form>

          <p className="text-center text-sm text-slate-500">
            {t("auth.alreadyHaveAccess", "Already have access?")} {" "}
            <Link className="font-semibold text-slate-900" to="/signin">
              {t("actions.signIn", "Sign in")}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default SignUp;
