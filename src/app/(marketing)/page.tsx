import Link from 'next/link';
import { Flame, Shield, BarChart3, Calendar, Zap, Lock, CheckCircle } from 'lucide-react';

// Generate a static mini contribution graph for the hero
function MiniContributionGraph() {
  // Static pattern that looks impressive
  const weeks = 20;
  const colors = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

  // Pre-generated pattern for visual impact
  const pattern = [
    [0,1,2,1,0,1,2,3,2,1,0,0,1,2,3,4,3,2,1,0],
    [1,2,3,2,1,2,3,4,3,2,1,1,2,3,4,4,4,3,2,1],
    [2,3,4,3,2,3,4,4,4,3,2,2,3,4,4,4,4,4,3,2],
    [1,2,3,2,1,2,3,4,3,2,1,2,3,4,4,4,4,3,3,2],
    [0,1,2,1,1,1,2,3,2,1,0,1,2,3,3,4,3,2,2,1],
    [1,2,3,2,0,2,3,3,3,2,1,0,1,2,3,3,3,2,1,0],
    [0,1,1,0,0,1,2,2,1,1,0,0,1,1,2,2,2,1,0,0],
  ];

  return (
    <div className="inline-block">
      <svg width={weeks * 15 + 4} height={7 * 15 + 4} className="block">
        {pattern.map((row, rowIdx) =>
          row.map((level, colIdx) => (
            <rect
              key={`${rowIdx}-${colIdx}`}
              x={colIdx * 15 + 2}
              y={rowIdx * 15 + 2}
              width={11}
              height={11}
              rx={2}
              fill={colors[level]}
              className="opacity-90"
            />
          ))
        )}
      </svg>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-green/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-accent-blue/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-medium mb-6">
            <Flame size={14} />
            Track. Build. Maintain.
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary leading-tight tracking-tight">
            Build the Streak.
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Become the Person Who Shows Up.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto">
            Track your habits. Build consistency. See your progress. 
            The discipline tracker that makes you want to keep going.
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 bg-accent-green text-white font-semibold rounded-xl hover:bg-green-600 transition-all shadow-lg shadow-accent-green/25 hover:shadow-accent-green/40"
            >
              Start Building
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center px-6 py-3 bg-bg-card border border-border text-text-primary font-medium rounded-xl hover:bg-bg-card-hover transition-colors"
            >
              See Features
            </Link>
          </div>

          {/* Contribution graph preview */}
          <div className="mt-12 flex justify-center">
            <div className="p-6 rounded-2xl bg-bg-card border border-border shadow-card">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-text-secondary">Contribution activity</p>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <span>Less</span>
                  {['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'].map((c) => (
                    <div key={c} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
                  ))}
                  <span>More</span>
                </div>
              </div>
              <MiniContributionGraph />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-3">Everything you need to stay consistent</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Built for real discipline. Not fake productivity.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: 'Contribution Heatmap',
                desc: 'See 12 months of activity at a glance. Every day you show up fills in the grid.',
              },
              {
                icon: Flame,
                title: 'Streak Tracking',
                desc: 'Current streak, longest streak, and milestones that celebrate your consistency.',
              },
              {
                icon: Calendar,
                title: 'Calendar View',
                desc: 'Full calendar with completion status, partial days, and freeze indicators.',
              },
              {
                icon: Lock,
                title: 'Streak Integrity',
                desc: 'Strict mode prevents edits. Flexible mode logs all changes. Your choice.',
              },
              {
                icon: Zap,
                title: 'Smart Insights',
                desc: 'Personalized insights about your consistency patterns and approaching records.',
              },
              {
                icon: Shield,
                title: 'Secure by Design',
                desc: 'Row-level security ensures you only see your own data. Server-validated completions.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-5 rounded-xl bg-bg-card border border-border hover:border-border-focus transition-colors"
              >
                <feature.icon className="h-8 w-8 text-accent-green mb-3" />
                <h3 className="text-base font-semibold text-text-primary mb-1">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-10">How it works</h2>
          <div className="space-y-8">
            {[
              { step: '01', title: 'Create a habit', desc: 'Name it, pick an icon and category, choose your integrity mode.' },
              { step: '02', title: 'Show up every day', desc: 'Mark your habit complete. Watch your streak grow.' },
              { step: '03', title: 'See your progress', desc: 'Contribution graph, analytics, milestones — all derived from your actual record.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 text-left">
                <div className="shrink-0 w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center text-accent-green font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{item.title}</h3>
                  <p className="text-sm text-text-secondary mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Flame className="h-10 w-10 text-accent-green mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-text-primary mb-3">
            Start building today.
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            The best time to start was yesterday. The next best time is now.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center px-8 py-3.5 bg-accent-green text-white font-semibold rounded-xl hover:bg-green-600 transition-all shadow-lg shadow-accent-green/25"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <Flame size={16} className="text-accent-green" />
            <span>StreakForge</span>
          </div>
          <p className="text-xs text-text-muted">
            Built with discipline.
          </p>
        </div>
      </footer>
    </div>
  );
}
