import { Link, useNavigate } from "react-router-dom";
import Logo from "../icons/Logo";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowRight } from "lucide-react";
import { findUserByCredentials } from "../data/userStore";
import { setSession } from "../auth/session";
import { useState } from "react";

const inputClasses =
  "mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none ring-offset-2 focus:ring-2 focus:ring-slate-900/20";

function SignIn() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      setError("Please enter your email and password.");
      setIsSubmitting(false);
      return;
    }

    try {
      const user = findUserByCredentials(email, password);

      console.log("Found user:", user);

      if (!user) {
        setError("Invalid email or password.");
        setIsSubmitting(false);
        return;
      }

      const { password: _password, ...safeUser } = user;
      setSession(safeUser);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Sign in failed:", err);
      setError("Unable to sign in right now. Please try again.");
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
          <p className="text-lg text-white/70">
            To empower businesses with intelligent, sustainable, and tailor-made fleet solutions that optimize operations, enhance the driver experience, and deliver measurable efficiency.
          </p>
          <div className="text-md text-white/60">
            <p className="flex items-center gap-1"><ArrowRight size={18}/>Full service digitization tool</p>
            <p className="flex items-center gap-1"><ArrowRight size={18}/>Const and performance optimization for vehicle fleets</p>
            <p className="flex items-center gap-1"><ArrowRight size={18}/>Billing tool with reporting system</p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-12">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl animate-in fade-in slide-in-from-right-6 duration-700">
          <header className="space-y-2">
            <h2 className="text-3xl font-semibold text-slate-900">
              Welcome back
            </h2>
          </header>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <Input
                className={inputClasses}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <Input
                className={inputClasses}
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </div>
            <button
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
          {error ? (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          ) : null}

          <p className="text-center text-sm text-slate-500">
            New to Oxifleet?{" "}
            <Link className="font-semibold text-slate-900" to="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default SignIn;
