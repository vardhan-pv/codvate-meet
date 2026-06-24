'use client'


import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Video, Shield, Zap, Users, MessageSquare, Monitor, CheckCircle } from 'lucide-react'

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
}

export default function LandingPage() {


  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-primary shadow-lg shadow-primary/25" style={{ borderBottom: '2px solid rgba(147,210,255,0.55)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
                <Video className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-extrabold text-base sm:text-lg tracking-tight gradient-text">
                  Codovate-Meet
                </span>
              </div>
            </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <Link href="#features" className="text-white/80 hover:text-white transition-colors">Features</Link>
            <Link href="#how" className="text-white/80 hover:text-white transition-colors">How it works</Link>
            <Link href="/login" className="text-white/80 hover:text-white transition-colors">Sign In</Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="sm:inline-block">
              <Button variant="ghost" className="font-semibold text-white hover:bg-white/15 rounded-lg px-2 sm:px-3 text-xs sm:text-sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-primary font-bold rounded-full px-3 sm:px-5 text-xs sm:text-sm hover:bg-blue-50 shadow-md transition-all hover:scale-105">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 hero-gradient overflow-hidden">
        {/* Floating orbs */}
        <div className="orb w-[500px] h-[500px] bg-blue-400/20 top-[-100px] right-[-100px]" />
        <div className="orb w-[400px] h-[400px] bg-indigo-500/15 bottom-[-80px] left-[-80px]" />

        <motion.div
          className="relative z-10 max-w-7xl mx-auto px-6 text-center"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInUp}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-blue-100 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live · Enterprise Video Conferencing
            </div>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] tracking-tight mb-6"
          >
            Meet Without
            <br />
            <span className="gradient-text">Limits.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg md:text-xl text-blue-100/80 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Crystal-clear video calls, real-time chat, screen sharing — all in one beautifully simple platform.
            No downloads. No friction.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="h-14 px-10 rounded-xl text-base font-extrabold bg-white text-primary hover:bg-blue-50 shadow-2xl shadow-black/30 transition-all hover:scale-105 border-2 border-white">
                Start a Meeting <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/join">
              <Button size="lg" variant="outline" className="h-14 px-10 rounded-xl text-base font-extrabold border-2 border-white text-white bg-white/15 hover:bg-white hover:text-primary shadow-xl shadow-black/20 transition-all hover:scale-105 backdrop-blur-sm">
                Join with Code
              </Button>
            </Link>
          </motion.div>

          {/* Social proof strip */}
          <motion.div variants={fadeInUp} className="mt-14 flex flex-wrap justify-center gap-6 text-sm text-white/60">
            {['✅ No downloads required', '✅ End-to-end secure', '✅ Works on any device', '✅ Free to get started'].map(t => (
              <span key={t} className="flex items-center gap-1.5">{t}</span>
            ))}
          </motion.div>
        </motion.div>

        {/* Hero mockup card */}
        <motion.div
          className="relative z-10 max-w-4xl mx-auto mt-20 px-6"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
        >
          <div className="glass-card-dark p-4 blue-glow">
            <div className="bg-slate-900/80 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
              {/* Fake video grid */}
              <div className="absolute inset-0 grid grid-cols-2 gap-2 p-4">
                {['Vardhan (Host)', 'Reddy', 'Priya', 'Arun'].map((name, i) => (
                  <div key={i} className="bg-slate-800 rounded-lg flex flex-col items-center justify-center relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {name[0]}
                    </div>
                    <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white bg-black/50 px-2 py-0.5 rounded">{name}</span>
                    {i === 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                  </div>
                ))}
              </div>
              {/* Bottom controls bar */}
              <div className="absolute bottom-0 inset-x-0 bg-black/50 backdrop-blur-sm flex items-center justify-center gap-4 py-3">
                {['Mic', 'Camera', 'Share', 'Chat'].map(ctrl => (
                  <div key={ctrl} className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                      <div className="w-3.5 h-3.5 rounded-sm bg-white/60" />
                    </div>
                    <span className="text-[9px] text-white/50">{ctrl}</span>
                  </div>
                ))}
                <div className="flex flex-col items-center gap-1 ml-4">
                  <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
                    <div className="w-4 h-1 rounded-full bg-white" />
                  </div>
                  <span className="text-[9px] text-white/50">Leave</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="bg-white border-y border-border py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '100%', label: 'Web-Based', icon: '🌐' },
            { value: '<50ms', label: 'Latency', icon: '⚡' },
            { value: 'HD+', label: 'Video Quality', icon: '🎥' },
            { value: 'Free', label: 'To Get Started', icon: '🎁' },
          ].map(s => (
            <div key={s.label} className="space-y-1">
              <p className="text-3xl font-black text-primary">{s.icon} {s.value}</p>
              <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
            Everything You Need
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
            Built for <span className="text-primary">Real Work</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From quick standups to full team calls — Codovate Meet has every tool you need.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Video,
              title: 'HD Video Conferencing',
              desc: 'Crystal-clear WebRTC streams powered by LiveKit. Zero packet loss, ultra-low latency — just effortless video.',
              color: 'from-blue-500 to-blue-600',
            },
            {
              icon: MessageSquare,
              title: 'Real-Time Chat',
              desc: 'Chat with participants during meetings. Messages persist — pick up where you left off.',
              color: 'from-indigo-500 to-indigo-600',
            },
            {
              icon: Monitor,
              title: 'Screen Sharing',
              desc: 'Share your screen with one click. Automatically spotlighted for all participants.',
              color: 'from-blue-600 to-indigo-600',
            },
            {
              icon: Users,
              title: 'Participant Controls',
              desc: 'Hosts can manage participants, end meetings for all, and track attendance.',
              color: 'from-sky-500 to-blue-500',
            },
            {
              icon: Shield,
              title: 'Enterprise Security',
              desc: 'JWT-secured rooms, hashed passwords, and encrypted data channels built in from day one.',
              color: 'from-blue-700 to-indigo-700',
            },
            {
              icon: Zap,
              title: 'Instant Access',
              desc: 'Register, create a room, and share the link in under 30 seconds. No downloads ever.',
              color: 'from-indigo-400 to-blue-500',
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              className="premium-card p-7 group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-md shadow-primary/20 group-hover:scale-110 transition-transform duration-300`}>
                <f.icon className="h-5.5 w-5.5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 bg-white border-y border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
              Up and running in <span className="text-primary">30 seconds</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up with your email. Completely free.' },
              { step: '02', title: 'Start a Meeting', desc: 'Click "New Meeting", get your shareable link instantly.' },
              { step: '03', title: 'Invite & Connect', desc: 'Share the link. Your team joins — no app needed.' },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="relative flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30 mb-5">
                  {s.step}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%+1rem)] w-12 border-t-2 border-dashed border-primary/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="hero-gradient py-20 px-6 relative overflow-hidden">
        <div className="orb w-96 h-96 bg-blue-300/20 top-[-80px] right-[10%]" />
        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Ready to meet smarter?
          </h2>
          <p className="text-blue-100/80 text-lg mb-8">
            Join thousands of teams already using Codovate Meet.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 rounded-xl text-base font-extrabold bg-white text-primary hover:bg-blue-50 shadow-2xl shadow-black/30 transition-all hover:scale-105 border-2 border-white">
                <CheckCircle className="mr-2 h-5 w-5" /> Create Free Account
              </Button>
            </Link>
            <Link href="/join">
              <Button size="lg" variant="outline" className="h-14 px-10 rounded-xl text-base font-extrabold border-2 border-white text-white bg-white/15 hover:bg-white hover:text-primary shadow-xl shadow-black/20 transition-all hover:scale-105 backdrop-blur-sm">
                Join a Meeting
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center">
              <Video className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-foreground"><span className="text-primary">Codovate</span>-Meet</span>
            <span className="text-muted-foreground/50">· © 2026 Codovate Solutions</span>
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-primary transition-colors font-medium">Sign In</Link>
            <Link href="/register" className="hover:text-primary transition-colors font-medium">Sign Up</Link>
            <Link href="/join" className="hover:text-primary transition-colors font-medium">Join Meeting</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
