import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center space-y-8 animate-fade-in">
        <div className="flex justify-center">
          <span className="text-6xl">🏀</span>
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-primary">ShotIQ</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto">
          Upload your shooting videos. Get instant biomechanical analysis powered by AI.
          Track your form improvements over time.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/register"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="border border-border text-foreground hover:bg-accent px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-6 mt-16 text-left">
          {[
            {
              icon: "📐",
              title: "Release Angle Analysis",
              desc: "Measure your shooting arc and get feedback on optimal 45-55° release.",
            },
            {
              icon: "🦵",
              title: "Biomechanical Breakdown",
              desc: "Elbow, knee, and shoulder alignment scored against professional benchmarks.",
            },
            {
              icon: "📈",
              title: "Progress Tracking",
              desc: "Session-over-session trend charts show your improvement trajectory.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5 space-y-2">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
