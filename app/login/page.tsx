'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, ArrowLeft, Video, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const login = useAuth((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError(null)
    try {
      const success = await login(email, password)
      if (success) {
        const params = new URLSearchParams(window.location.search)
        window.location.href = params.get('redirect') || '/dashboard'
      } else {
        setFormError('Invalid email or password. Please try again.')
        setIsLoading(false)
      }
    } catch {
      setFormError('An unexpected error occurred.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL (Blue) ── */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-between p-12 relative overflow-hidden">
        <div className="orb w-96 h-96 bg-blue-300/20 top-[-60px] right-[-60px]" />
        <div className="orb w-64 h-64 bg-indigo-500/20 bottom-10 left-0" />

        <Link href="/" className="relative z-10 flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
            <Video className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-lg tracking-tight text-white">Codovate-Meet</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-blue-200">Solutions</span>
          </div>
        </Link>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-black text-white leading-tight">
            Welcome back.<br />
            <span className="gradient-text">Ready to meet?</span>
          </h2>
          <p className="text-blue-100/80 text-base leading-relaxed max-w-sm">
            Sign in to access your meetings, start a new call, or pick up where you left off.
          </p>
          <div className="space-y-3">
            {['HD video conferencing', 'Real-time chat & screen share', 'Secure JWT authentication'].map(f => (
              <div key={f} className="flex items-center gap-3 text-blue-100/80 text-sm">
                <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-200/60 text-xs">© 2026 Codovate Solutions. All rights reserved.</p>
        </div>
      </div>

      {/* ── RIGHT PANEL (Form) ── */}
      <div className="relative w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 bg-background">
        <Link href="/" className="absolute top-6 left-6 lg:hidden flex items-center gap-2 text-foreground/60 hover:text-primary transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-black text-foreground tracking-tight mb-2">Sign In</h1>
            <p className="text-muted-foreground text-sm">Don&apos;t have an account? <Link href="/register" className="text-primary font-semibold hover:underline">Sign up free</Link></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium flex items-center gap-2">
                <span className="text-red-500">⚠</span> {formError}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  className="pl-11 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-13 btn-glow text-white font-bold rounded-xl text-base mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</span>
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">New to Codovate Meet? <Link href="/register" className="text-primary font-bold hover:underline">Create a free account →</Link></p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
