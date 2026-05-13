import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Logo from "../icons/Logo";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { getDefaultRouteForSession, setSession } from "../auth/session";
import { loginSuperAdmin } from "../services/authApi";

const inputClasses =
  "mt-2 w-full rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2.5 text-slate-900 shadow-sm outline-none ring-offset-2 transition focus:border-slate-300 focus:ring-2 focus:ring-[#1f3a5f]/15";

const buildDisplayName = (user) => {
  const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(" ").trim();
  return fullName || user?.name || "Super Admin";
};

function AdminLogin() {
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
      setError("Please enter admin mobile number and password.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await loginSuperAdmin({ phone, password });

      if (result?.otpRequired && result?.challengeId) {
        const previewUser = result.userPreview || {};
        const sessionUser = {
          ...previewUser,
          id: previewUser._id || previewUser.id,
          role: "super_admin",
          type: previewUser.type || "super-admin",
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
        role: "super_admin",
        type: user.type || "super-admin",
        name: buildDisplayName(user),
        token: result.token,
        twoFactorVerified: false,
      };

      setSession(sessionUser);
      navigate(getDefaultRouteForSession(sessionUser), { replace: true });
    } catch (err) {
      console.error("Super admin sign-in failed:", err);
      setError(err?.message || "Unable to sign in right now. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#130825] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative flex min-h-[48vh] items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#130825_0%,#1f0e3d_44%,#2e1660_100%)] px-8 py-16 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(540px_circle_at_18%_18%,rgba(59,130,246,0.2),transparent_54%),radial-gradient(520px_circle_at_82%_70%,rgba(168,85,247,0.18),transparent_52%)]"
        />
        <div className="relative z-10 w-full max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
            <Shield size={14} />
            Super Admin Portal
          </div>
          <Logo className="w-52 text-white" />
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Oxifleet central control panel
          </h1>
          <p className="max-w-xl text-sm leading-7 text-white/75">
            Manage tenants, security, integration health, and global settings from a
            dedicated super admin workspace.
          </p>
        </div>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#edf2f9_0%,#dee7f2_100%)] px-6 py-12">
        <div className="relative w-full max-w-md space-y-6 rounded-[28px] border border-white/70 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur">
          <header className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-[#e8edff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1f3a5f]">
              Admin sign-in
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#130825]">
              Welcome, Super Admin
            </h2>
            <p className="text-sm leading-6 text-slate-500">
              Sign in with your admin account to access the Oxifleet global dashboard.
            </p>
          </header>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label className="text-sm font-medium text-slate-700">Mobile number</Label>
              <Input
                className={inputClasses}
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="+491701111111"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Password</Label>
              <div className="relative mt-2">
                <Input
                  className={`${inputClasses} mt-0 pr-10`}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter password"
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition hover:text-slate-700"
                  onClick={() => setShowPassword((prev) => !prev)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              className="w-full rounded-xl bg-[linear-gradient(180deg,#2c4fa3_0%,#1f3a7d_58%,#12244d_100%)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#12244d]/20 transition hover:opacity-95"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
            {error ? (
              <p className="text-sm font-medium text-rose-600">
                {error}
              </p>
            ) : null}
          </form>


          <p className="text-center text-sm text-slate-500">
            <Link className="inline-flex items-center gap-1 font-semibold text-[#1f3a5f]" to="/signin">
              <ArrowLeft size={14} />
              Back to user sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default AdminLogin;




