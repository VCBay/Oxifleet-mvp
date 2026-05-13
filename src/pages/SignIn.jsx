import { Link, useNavigate } from "react-router-dom";
import Logo from "../icons/Logo";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { getDefaultRouteForSession, setSession } from "../auth/session";
import { useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import { loginUser } from "../services/authApi";

const inputClasses =
  "mt-2 w-full rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2.5 text-slate-900 shadow-sm outline-none ring-offset-2 transition focus:border-slate-300 focus:ring-2 focus:ring-[#1f3a5f]/15";

const buildDisplayName = (user) => {
  const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(" ").trim();
  return fullName || user?.name || "User";
};

function SignIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const phone = formData.get("phone")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!phone || !password) {
      setError(t("auth.missingCredentials", "Please enter your mobile number and password."));
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await loginUser({ phone, password });

      if (result?.otpRequired && result?.challengeId) {
        const previewUser = result.userPreview || {};
        const sessionUser = {
          ...previewUser,
          id: previewUser._id || previewUser.id,
          role: previewUser.type || previewUser.role,
          type: previewUser.type,
          name: buildDisplayName(previewUser),
          token: null,
          is2fauth: true,
          twoFactorVerified: false,
          otpChallenge: {
            challengeId: result.challengeId,
            channel: result.channel,
            recipientMasked: result.recipientMasked,
            expiresInSeconds: result.expiresInSeconds,
            resendCooldownSeconds: result.resendCooldownSeconds,
          },
        };

        setSession(sessionUser);
        navigate("/two-factor-verify", { replace: true });
        return;
      }

      if (!result?.token || !result?.user) {
        throw new Error("Invalid authentication response.");
      }

      const user = result.user || {};
      const sessionUser = {
        ...user,
        id: user._id || user.id,
        role: user.type || user.role,
        type: user.type,
        name: buildDisplayName(user),
        token: result.token,
        twoFactorVerified: false,
      };

      setSession(sessionUser);
      navigate(getDefaultRouteForSession(sessionUser), { replace: true });
    } catch (err) {
      console.error("Sign in failed:", err);
      setError(err?.message || t("auth.signInFailed", "Unable to sign in right now. Please try again."));
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#160A2E] lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative flex min-h-[48vh] items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#160A2E_0%,#25124B_42%,#341B64_100%)] px-8 py-16 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_circle_at_15%_18%,rgba(168,85,247,0.22),transparent_58%),radial-gradient(540px_circle_at_82%_68%,rgba(96,165,250,0.14),transparent_52%),radial-gradient(420px_circle_at_58%_88%,rgba(244,114,182,0.12),transparent_56%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-10 left-10 hidden w-24 rounded-full bg-white/5 blur-3xl lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-4rem] top-16 hidden h-52 w-52 rounded-full border border-white/10 bg-white/5 lg:block"
        />
        <div className="relative z-10 w-full max-w-xl space-y-8 animate-in fade-in slide-in-from-left-6 duration-700">
          <div className="space-y-5">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
              Fleet Service Platform
            </div>
            <Logo className="w-52 text-white" />
          </div>
          <p className="max-w-xl text-lg leading-8 text-white/72">
            {t("auth.marketingText", "To empower businesses with intelligent, sustainable, and tailor-made fleet solutions that optimize operations, enhance the driver experience, and deliver measurable efficiency.")}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Product
              </p>
              <p className="mt-2 text-sm font-medium text-white/82">
                {t("auth.marketingBullets.digitization", "Full service digitization tool")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Operations
              </p>
              <p className="mt-2 text-sm font-medium text-white/82">
                {t("auth.marketingBullets.optimization", "Cost and performance optimization for vehicle fleets")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Finance
              </p>
              <p className="mt-2 text-sm font-medium text-white/82">
                {t("auth.marketingBullets.billing", "Billing tool with reporting system")}
              </p>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-white/62 sm:grid-cols-3">
            <p className="flex items-center gap-2">
              <ArrowRight size={16} className="shrink-0 text-fuchsia-300" />
              Fleet owner control
            </p>
            <p className="flex items-center gap-2">
              <ArrowRight size={16} className="shrink-0 text-fuchsia-300" />
              Driver workflows
            </p>
            <p className="flex items-center gap-2">
              <ArrowRight size={16} className="shrink-0 text-fuchsia-300" />
              POS execution
            </p>
          </div>
        </div>
      </section>
      <section className="relative flex items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#eef3f8_0%,#dfe8f1_100%)] px-6 py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_circle_at_20%_20%,rgba(22,10,46,0.10),transparent_55%),radial-gradient(460px_circle_at_85%_82%,rgba(109,40,217,0.08),transparent_52%)]"
        />
        <div className="relative w-full max-w-md space-y-6 rounded-[28px] border border-white/70 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur animate-in fade-in slide-in-from-right-6 duration-700">
          <header className="space-y-3">
            <div className="inline-flex items-center rounded-full bg-[#efe8fb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b2a86]">
              Oxifleet Access
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#160A2E]">
              {t("auth.welcomeBack", "Welcome back")}
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              Sign in to access fleet, driver, and POS workflows in one service platform.
            </p>
          </header>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label className="text-sm font-medium text-slate-700">
                {t("auth.mobile", "Mobile number")}
              </Label>
              <Input
                className={inputClasses}
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder={t("auth.mobilePlaceholder", "+491701111111")}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">
                {t("auth.password", "Password")}
              </Label>
              <div className="relative mt-2">
                <Input
                  className={`${inputClasses} mt-0 pr-10`}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder={t("auth.passwordPlaceholder", "Enter your password")}
                />
                <button
                  aria-label={
                    showPassword
                      ? t("actions.hidePassword", "Hide password")
                      : t("actions.showPassword", "Show password")
                  }
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition hover:text-slate-700"
                  onClick={() => setShowPassword((prev) => !prev)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              className="w-full rounded-xl bg-[linear-gradient(180deg,#341B64_0%,#241146_56%,#160A2E_100%)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#160A2E]/20 transition hover:bg-[linear-gradient(180deg,#41207b_0%,#2c1554_56%,#1b0d37_100%)]"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("actions.signingIn", "Signing in...")
                : t("actions.signIn", "Sign in")}
            </button>
          </form>
          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {error}
            </p>
          ) : null}

          <div className="rounded-2xl border border-slate-200/80 bg-[#f7fafc] px-4 py-3 text-xs text-slate-500">
            Secure access for fleet owner, driver, and POS accounts.
          </div>

          <p className="text-center text-sm text-slate-500">
            {t("auth.newToOxifleet", "New to Oxifleet?")} {" "}
            <Link className="font-semibold text-[#341B64]" to="/signup">
              {t("actions.createAnAccount", "Create an account")}
            </Link>
          </p>
          <p className="text-center text-sm text-slate-500">
            <Link className="font-semibold text-[#1f3a5f]" to="/admin/login">
              Sign-in as admin
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default SignIn;




