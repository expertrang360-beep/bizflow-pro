import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Wallet,
  Factory,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Wifi,
  Zap,
  ArrowRight,
  Check,
  Receipt,
  TrendingUp,
  Building2,
  PiggyBank,
} from "lucide-react";

const FEATURES = [
  { icon: ShoppingCart, title: "Sales POS", desc: "Record sales fast — cash, transfer, POS, or credit." },
  { icon: Package, title: "Smart Inventory", desc: "Track stock in real-time with low-stock alerts." },
  { icon: Users, title: "Customers & Debt", desc: "Manage customer credit and settle debts easily." },
  { icon: Receipt, title: "Receipts & Reports", desc: "Print thermal receipts and view P&L reports." },
  { icon: Wallet, title: "Cashbook & Expenses", desc: "Every naira in and out, automatically logged." },
  { icon: Factory, title: "Manufacturer Mode", desc: "Production orders, BOM, and material tracking." },
  { icon: Building2, title: "Multi-Branch", desc: "Run multiple locations from one dashboard." },
  { icon: Sparkles, title: "AI Advisor", desc: "Get smart business insights powered by AI." },
];

const STEPS = [
  {
    n: "1",
    title: "Sign up in seconds",
    desc: "Create your account with email or phone. No credit card required.",
    icon: Smartphone,
  },
  {
    n: "2",
    title: "Set up your business",
    desc: "Our quick wizard helps you add your first product and record your first sale.",
    icon: Zap,
  },
  {
    n: "3",
    title: "Start selling & growing",
    desc: "Track every sale, manage stock, and watch your profit grow daily.",
    icon: TrendingUp,
  },
];

const BENEFITS = [
  { icon: Wifi, title: "Works Offline", desc: "Keep selling even when the internet is down. Auto-syncs later." },
  { icon: ShieldCheck, title: "Bank-Grade Security", desc: "Your data is encrypted and isolated per business." },
  { icon: PiggyBank, title: "Built for Naira", desc: "Designed for Nigerian SMEs — PAYE, VAT, CIT ready." },
  { icon: BarChart3, title: "Real Profit Insights", desc: "See what's selling, what's costing, what's working." },
];

const PLANS = [
  { name: "Trial", price: "Free", period: "14 days", highlight: false, features: ["Full features", "1 branch", "Up to 2 staff"] },
  { name: "Starter", price: "₦5,000", period: "/month", highlight: false, features: ["Sales & inventory", "1 branch", "Up to 3 staff", "Receipts"] },
  { name: "Pro", price: "₦15,000", period: "/month", highlight: true, features: ["Everything in Starter", "AI Advisor", "Payroll", "Up to 10 staff"] },
  { name: "Enterprise", price: "₦50,000", period: "/month", highlight: false, features: ["Everything in Pro", "Multi-branch", "Manufacturer mode", "Unlimited staff"] },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const goAuth = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-bold">B</span>
            </div>
            <span className="font-bold text-lg">BizKit</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goAuth} className="hidden sm:inline-flex">
              Sign in
            </Button>
            <Button size="sm" onClick={goAuth} className="rounded-xl shadow-primary-btn">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Built for Nigerian SMEs
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight mb-5">
            Run your business <br className="hidden sm:block" />
            <span className="text-primary">from your pocket.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            BizKit is the all-in-one business app for Nigerian shops, traders, and manufacturers.
            Track sales, manage stock, record expenses, and grow profit — all offline-ready, all in Naira.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button onClick={goAuth} className="h-14 px-8 rounded-2xl text-base font-bold shadow-primary-btn w-full sm:w-auto">
              Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="h-14 px-8 rounded-2xl text-base w-full sm:w-auto">
              See how it works
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">No credit card • 14-day free trial • Cancel anytime</p>
        </div>

        {/* Trust strip */}
        <div className="max-w-4xl mx-auto mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { v: "5,000+", l: "Sales recorded daily" },
            { v: "₦500M+", l: "Tracked through app" },
            { v: "99.9%", l: "Uptime guarantee" },
            { v: "4.8★", l: "Average rating" },
          ].map((s) => (
            <div key={s.l} className="text-center bg-card border border-border rounded-2xl py-4">
              <div className="text-xl font-bold text-primary">{s.v}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-16 sm:py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Everything you need to run your business</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              One app replaces your sales book, stock book, debt book, and accountant.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Get started in 3 simple steps</h2>
            <p className="text-muted-foreground">From zero to your first sale in under 5 minutes.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {STEPS.map(({ n, title, desc, icon: Icon }) => (
              <div key={n} className="relative bg-card border border-border rounded-2xl p-6">
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center shadow-primary-btn">
                  {n}
                </div>
                <Icon className="w-8 h-8 text-primary mb-4 mt-2" />
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-16 sm:py-20 bg-primary/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Why business owners love BizKit</h2>
            <p className="text-muted-foreground">Built specifically for the realities of Nigerian business.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-card border border-border rounded-2xl p-5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-4 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Simple, fair pricing</h2>
            <p className="text-muted-foreground">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-5 flex flex-col ${
                  p.highlight ? "border-primary bg-primary/5 shadow-primary-btn" : "border-border bg-card"
                }`}
              >
                {p.highlight && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary mb-2">Most Popular</span>
                )}
                <h3 className="font-bold text-lg">{p.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-4">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.period}</span>
                </div>
                <ul className="space-y-2 mb-5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={goAuth}
                  variant={p.highlight ? "default" : "outline"}
                  className="w-full rounded-xl"
                >
                  Choose {p.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 py-16 sm:py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Frequently asked questions</h2>
            <p className="text-muted-foreground">Everything you need to know before getting started.</p>
          </div>
          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border px-2 sm:px-4">
            <AccordionItem value="pricing">
              <AccordionTrigger className="text-left text-base font-semibold">
                How much does BizKit cost?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Start free with a 14-day trial — no card required. After that, plans start at ₦5,000/month (Starter),
                ₦15,000/month (Pro) and ₦50,000/month (Enterprise). Pay with card or bank transfer in Naira, cancel
                anytime, and switch plans whenever your business grows.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="offline">
              <AccordionTrigger className="text-left text-base font-semibold">
                Does BizKit work offline?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes. BizKit is a Progressive Web App built offline-first — record sales, expenses and stock
                movements without internet. Everything syncs automatically to the cloud the moment your connection
                is back, so power and network issues never stop your business.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="setup">
              <AccordionTrigger className="text-left text-base font-semibold">
                How long does it take to set up?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Under 5 minutes. Our guided onboarding wizard walks you through your business profile, your first
                product and your first sale. You can start ringing up customers the same day — no IT skills required.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="after-signup">
              <AccordionTrigger className="text-left text-base font-semibold">
                What happens right after I sign up?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                You're instantly placed on the 14-day Pro trial with full access to every feature. We'll take you
                through the onboarding wizard, then drop you on your dashboard. Invite your team, add products,
                start selling — and upgrade to a paid plan whenever you're ready.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}

      <section className="px-4 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center bg-primary rounded-3xl p-8 sm:p-12 shadow-primary-btn">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-3">
            Ready to grow your business?
          </h2>
          <p className="text-primary-foreground/80 mb-6">
            Join thousands of Nigerian business owners running smarter with BizKit.
          </p>
          <Button
            onClick={goAuth}
            variant="secondary"
            className="h-14 px-8 rounded-2xl text-base font-bold"
          >
            Start Your Free Trial <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">B</span>
            </div>
            <span className="font-semibold text-sm">BizKit</span>
            <span className="text-xs text-muted-foreground">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <button onClick={goAuth} className="hover:text-foreground">Sign in</button>
            <button onClick={goAuth} className="hover:text-foreground">Sign up</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
