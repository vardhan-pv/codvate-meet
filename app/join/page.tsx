'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GradientBlob } from '@/components/common/gradient-blob'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { meetingService } from '@/services/meeting'

export default function JoinMeetingPage() {
  const { user, loadProfile } = useAuth()
  const [meetingCode, setMeetingCode] = useState('')
  const [userName, setUserName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    // Attempt to load profile if token exists to pre-populate name
    const init = async () => {
      try {
        await loadProfile()
      } catch (e) {}
    }
    init()

    // Grab code param from URL if joining via link redirection
    const params = new URLSearchParams(window.location.search)
    const codeParam = params.get('code')
    if (codeParam) {
      setMeetingCode(codeParam.toUpperCase())
    }
  }, [])

  useEffect(() => {
    if (user) {
      setUserName(user.name)
    }
  }, [user])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinError(null)

    if (!meetingCode.trim()) {
      setJoinError('Please enter a meeting code')
      return
    }
    if (!userName.trim()) {
      setJoinError('Please enter your name')
      return
    }

    setIsLoading(true)

    try {
      const cleanCode = meetingCode.trim().toUpperCase()
      // Validate meeting exists in DB
      await meetingService.validateMeeting(cleanCode)
      
      // Store guest join name locally so the room can read it
      localStorage.setItem('joinName', userName.trim())

      // Redirect to the room
      window.location.href = `/room/${cleanCode}`
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid meeting code. Verify and try again.'
      setJoinError(msg)
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background to-blue-50/50 flex items-center justify-center">
      {/* Animated blobs */}
      <GradientBlob className="top-0 left-0 w-96 h-96" variant="blue-cyan" />
      <GradientBlob className="bottom-0 right-0 w-96 h-96" variant="cyan-blue" />

      {/* Back button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-50 p-2.5 rounded-full bg-white border border-border shadow-sm hover:bg-slate-50 transition flex items-center justify-center text-foreground/75"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="bg-white border border-border rounded-2xl p-8 shadow-lg space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-foreground tracking-tight">Join a Meeting</h1>
            <p className="text-muted-foreground text-sm">Enter meeting code and your name to join</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            {joinError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium text-center flex items-center justify-center gap-2">
                <span>⚠</span> {joinError}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">
                Your Name
              </label>
              <Input
                type="text"
                placeholder="Enter your name"
                className="bg-white border-border focus:border-primary rounded-xl h-12 text-base"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">
                Meeting Code
              </label>
              <Input
                type="text"
                placeholder="CDV-XXXX-XXXX"
                className="bg-white border-border focus:border-primary rounded-xl h-12 uppercase font-mono tracking-widest text-center text-lg font-bold"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 btn-glow text-white font-bold rounded-xl mt-2"
              disabled={isLoading}
            >
              {isLoading ? 'Joining...' : (
                <span className="flex items-center justify-center gap-2">
                  Join Meeting <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="border-t border-border pt-4 text-center">
            <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
              Sign in instead
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
