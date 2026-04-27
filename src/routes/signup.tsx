import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ShoppingBag, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — EventKraft" }] }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"customer" | "worker">("customer");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Account created!", { description: "Welcome to EventKraft." });
    navigate({ to: role === "customer" ? "/dashboard/customer" : "/dashboard/worker" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-8 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 lg:hidden mb-8">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-semibold">EventKraft</span>
          </Link>

          <h1 className="font-display text-3xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how you'll use EventKraft.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`p-4 rounded-xl border text-left transition-all ${
                role === "customer"
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <ShoppingBag className="h-5 w-5 text-primary mb-2" />
              <p className="font-semibold text-sm">I'm a Customer</p>
              <p className="text-xs text-muted-foreground mt-0.5">Looking for services</p>
            </button>
            <button
              type="button"
              onClick={() => setRole("worker")}
              className={`p-4 rounded-xl border text-left transition-all ${
                role === "worker"
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <Hammer className="h-5 w-5 text-primary mb-2" />
              <p className="font-semibold text-sm">I'm a Worker</p>
              <p className="text-xs text-muted-foreground mt-0.5">I provide services</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required placeholder="Aarav Shrestha" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required placeholder="you@example.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" required placeholder="+977 98XXXXXXXX" />
              </div>
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" required placeholder="Kathmandu" />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" required placeholder="At least 8 characters" />
            </div>

            <Button type="submit" className="w-full bg-gradient-hero text-primary-foreground" size="lg">
              Create account
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block bg-gradient-hero relative overflow-hidden order-1 lg:order-2">
        <div className="absolute inset-0 p-12 flex flex-col justify-between text-primary-foreground">
          <Link to="/" className="flex items-center gap-2 self-end">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="font-display text-2xl font-semibold">EventKraft</span>
          </Link>
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Plan your perfect day with{" "}
              <span className="text-gradient-gold">premium talent</span>.
            </h2>
            <p className="mt-4 text-primary-foreground/80 max-w-md">
              Join hundreds of customers and event professionals trusting
              EventKraft for their most important moments.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/60">© EventKraft · Nepal</p>
        </div>
      </div>
    </div>
  );
}
