import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import {
  getDefaultRouteForSession,
  getSession,
  requiresTwoFactorSetup,
  requiresTwoFactorVerification,
  setSession,
  subscribeSession,
} from "../auth/session";
import { resendLoginOtp, verifyLoginOtp } from "../services/authApi";

const formatSeconds = (value) => {
  const total = Math.max(0, Number(value || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins <= 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

function TwoFactorVerifyPage() {
  const navigate = useNavigate();
  const session = useSyncExternalStore(subscribeSession, getSession, getSession);

  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(
    Number(session?.otpChallenge?.resendCooldownSeconds || 0),
  );
  const [lockCountdown, setLockCountdown] = useState(0);

  const challengeId = session?.otpChallenge?.challengeId || "";

  const contactHint = useMemo(() => {
    if (session?.otpChallenge?.recipientMasked) {
      return session.otpChallenge.recipientMasked;
    }
    return session?.phone || "No mobile number in profile.";
  }, [session]);

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

  if (!session) {
    return <Navigate replace to="/signin" />;
  }

  if (requiresTwoFactorSetup(session)) {
    return <Navigate replace to="/two-factor-auth" />;
  }

  if (!requiresTwoFactorVerification(session)) {
    return <Navigate replace to={getDefaultRouteForSession(session)} />;
  }

  const handleSendOtp = async () => {
    setError("");
    setSuccessMessage("");
    setRemainingAttempts(null);

    if (!challengeId) {
      setError("No OTP challenge found. Please sign in again.");
      return;
    }

    if (lockCountdown > 0) {
      setError(`OTP is locked. Try again in ${formatSeconds(lockCountdown)}.`);
      return;
    }

    if (resendCooldown > 0) {
      setError(`Please wait ${formatSeconds(resendCooldown)} before requesting another OTP.`);
      return;
    }

    try {
      const result = await resendLoginOtp(challengeId);
      const nextCooldown = Number(result?.resendCooldownSeconds || 30);
      setResendCooldown(nextCooldown);
      setSuccessMessage(`OTP sent via SMS to ${result?.recipientMasked || contactHint}.`);
    } catch (sendError) {
      setError(sendError?.message || "Unable to resend OTP.");
      if (sendError?.retryAfterSeconds > 0) {
        setResendCooldown(sendError.retryAfterSeconds);
      }
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setRemainingAttempts(null);

    if (!challengeId) {
      setError("No OTP challenge found. Please sign in again.");
      return;
    }

    if (lockCountdown > 0) {
      setError(`OTP is locked. Try again in ${formatSeconds(lockCountdown)}.`);
      return;
    }

    if (!otp.trim()) {
      setError("Please enter OTP.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await verifyLoginOtp({ challengeId, otpCode: otp.trim() });
      const user = result?.user || {};

      const updatedSession = {
        ...session,
        ...user,
        id: user._id || user.id || session.id,
        role: user.type || session.role,
        type: user.type || session.type,
        name: session.name,
        token: result?.token,
        twoFactorVerified: true,
        otpChallenge: undefined,
      };

      setSession(updatedSession);
      navigate(getDefaultRouteForSession(updatedSession), { replace: true });
    } catch (verifyError) {
      setError(verifyError?.message || "Unable to verify OTP.");
      if (verifyError?.remainingAttempts > 0) {
        setRemainingAttempts(verifyError.remainingAttempts);
      }
      if (verifyError?.retryAfterSeconds > 0) {
        setLockCountdown(verifyError.retryAfterSeconds);
      }
      setIsSubmitting(false);
    }
  };

  const resendButtonLabel =
    resendCooldown > 0 ? `Resend OTP in ${formatSeconds(resendCooldown)}` : "Resend OTP";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#0f0a1e_0%,#1f1240_50%,#2a1656_100%)] px-4 py-8 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_circle_at_15%_18%,rgba(99,102,241,0.24),transparent_55%),radial-gradient(460px_circle_at_84%_72%,rgba(168,85,247,0.18),transparent_58%)]"
      />

      <section className="relative z-10 w-full max-w-xl rounded-3xl border border-white/20 bg-white/95 p-6 shadow-[0_30px_80px_rgba(8,10,30,0.45)] sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#efe8ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3f2781]">
              <ShieldCheck size={14} />
              Security verification
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1a1038]">
              Verify login OTP
            </h1>
            <p className="mt-2 text-sm text-slate-600">Enter OTP to complete sign-in.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#6942d6] bg-[#f3eeff] px-4 py-4">
          <MessageSquare size={18} className="text-[#4a2ba1]" />
          <p className="mt-2 text-sm font-semibold text-[#1a1038]">SMS OTP</p>
          <p className="text-xs text-slate-500">Delivery target: {contactHint}</p>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleVerify}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex items-center justify-center rounded-xl border border-[#2a1656]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#2a1656] transition hover:bg-[#f8f6ff] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSendOtp}
              type="button"
              disabled={resendCooldown > 0 || lockCountdown > 0}
            >
              {resendButtonLabel}
            </button>

            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#6942d6] focus:ring-2 focus:ring-[#6942d6]/20"
              inputMode="numeric"
              maxLength={10}
              name="otp"
              onChange={(event) => setOtp(event.target.value)}
              placeholder="Enter OTP"
              value={otp}
            />
          </div>

          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#1e88e5_0%,#1c64b8_100%)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || lockCountdown > 0}
            type="submit"
          >
            <Sparkles size={15} />
            {isSubmitting ? "Verifying..." : "Verify and continue"}
          </button>
        </form>

        {lockCountdown > 0 ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            OTP attempts locked. Try again in {formatSeconds(lockCountdown)}.
          </p>
        ) : null}

        {remainingAttempts !== null ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
            Remaining attempts: {remainingAttempts}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default TwoFactorVerifyPage;





