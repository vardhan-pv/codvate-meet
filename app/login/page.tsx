'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, ArrowLeft, Video, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { login } = useAuth()

  // Custom states for MFA and Signup Verification
  const [unverifiedUserId, setUnverifiedUserId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  
  const [mfaUserId, setMfaUserId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Listen to URL parameters (redirect from registration)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const rUserId = params.get('userId')
      const rEmail = params.get('email')
      const isReg = params.get('registered')
      
      if (rUserId) {
        setUnverifiedUserId(rUserId)
        if (rEmail) setEmail(rEmail)
        if (isReg) setFormError('Account created successfully! Please enter the 6-digit code generated in your server console.')
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError(null)
    try {
      const success = await login(email, password)
      if (success) {
        const params = new URLSearchParams(window.location.search)
        window.location.href = params.get('redirect') || '/dashboard'
      }
    } catch (err: any) {
      const data = err.response?.data
      if (data?.isUnverified) {
        setUnverifiedUserId(data.userId)
        setFormError('Account not verified. Enter verification code.')
      } else if (data?.mfaRequired) {
        setMfaUserId(data.userId)
        setFormError(null)
      } else {
        setFormError(data?.error || 'Invalid credentials or connection error.')
      }
      setIsLoading(false)
    }
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyCode.trim()) return
    setIsVerifying(true)
    setFormError(null)
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: unverifiedUserId, code: verifyCode })
      })
      const data = await response.json()
      if (response.ok) {
        alert('Email successfully verified! You can now sign in.')
        setUnverifiedUserId(null)
        setVerifyCode('')
        setFormError(null)
      } else {
        setFormError(data.error || 'Invalid verification code')
      }
    } catch {
      setFormError('Failed to connect to verification server')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaCode.trim()) return
    setIsVerifying(true)
    setFormError(null)
    try {
      const response = await fetch('/api/mfa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: mfaUserId, code: mfaCode })
      })
      const data = await response.json()
      if (response.ok) {
        localStorage.setItem('token', data.token)
        useAuth.setState({ token: data.token, user: data.user })
        window.location.href = '/dashboard'
      } else {
        setFormError(data.error || 'Invalid 2FA verification code (Hint: Use 123456)')
      }
    } catch {
      setFormError('Failed to verify Two-Factor code')
    } finally {
      setIsVerifying(false)
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
            Sign in to access your meetings, start a new call, or configure your security settings.
          </p>
          <div className="space-y-3">
            {['HD video conferencing', 'Real-time chat & screen share', 'Multi-factor authentication (MFA)'].map(f => (
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
          {unverifiedUserId ? (
            <form onSubmit={handleVerifySubmit} className="space-y-5 animate-in fade-in zoom-in-95">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 text-amber-500">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">Confirm your email</h1>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Enter the 6-digit confirmation code generated in your server console output to activate your account.
                </p>
              </div>

              {formError && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl font-medium">
                  ⚠ {formError}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">6-Digit Code</label>
                <Input
                  type="text"
                  placeholder="e.g. 123456"
                  maxLength={6}
                  className="h-12 tracking-widest text-center font-bold text-lg"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-13 btn-glow text-white font-bold rounded-xl text-base mt-2"
                disabled={isVerifying}
              >
                {isVerifying ? 'Activating...' : 'Verify & Continue'}
              </Button>

              <button
                type="button"
                onClick={() => setUnverifiedUserId(null)}
                className="w-full text-center text-xs text-primary font-bold hover:underline mt-2"
              >
                Back to Sign In
              </button>
            </form>
          ) : mfaUserId ? (
            <form onSubmit={handleMfaSubmit} className="space-y-5 animate-in fade-in zoom-in-95">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 text-primary">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">Two-Factor Auth</h1>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  MFA is enabled on your account. Please input your 2FA verification code to proceed.
                </p>
              </div>

              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                  ⚠ {formError}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Verification Code</label>
                <Input
                  type="text"
                  placeholder="e.g. 123456"
                  maxLength={6}
                  className="h-12 tracking-widest text-center font-bold text-lg"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-13 btn-glow text-white font-bold rounded-xl text-base mt-2"
                disabled={isVerifying}
              >
                {isVerifying ? 'Authenticating...' : 'Confirm & Sign In'}
              </Button>

              <button
                type="button"
                onClick={() => setMfaUserId(null)}
                className="w-full text-center text-xs text-primary font-bold hover:underline mt-2"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <>
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
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-foreground">Password</label>
                  </div>
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
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
