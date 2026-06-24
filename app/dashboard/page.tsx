'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { meetingService } from '@/services/meeting'
import { LogOut, Plus, Video, Copy, Check, ArrowRight, Clock, Calendar, LayoutDashboard, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

interface MeetingRecord {
  id: string
  meeting_code: string
  created_at: string
  room_name?: string
  scheduled_at?: string
}

export default function DashboardPage() {
  const { user, token, loadProfile, logout } = useAuth()
  const [recentMeetings, setRecentMeetings] = useState<MeetingRecord[]>([])
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { window.location.href = '/login'; return }
    const init = async () => {
      await loadProfile()
      try {
        const meetings = await meetingService.getRecentMeetings()
        setRecentMeetings(meetings)
      } catch (err) { console.error(err) }
    }
    init()
  }, [token])

  const handleCreateMeeting = async () => {
    setIsCreating(true)
    try {
      const data = await meetingService.createMeeting({ roomName, scheduledAt })
      setCreatedCode(data.meetingId)
      const meetings = await meetingService.getRecentMeetings()
      setRecentMeetings(meetings)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create meeting.')
    } finally { setIsCreating(false) }
  }

  const handleCopyLink = () => {
    if (!createdCode) return
    navigator.clipboard.writeText(`${window.location.origin}/room/${createdCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setIsJoining(true); setJoinError(null)
    try {
      const cleanCode = joinCode.trim().toUpperCase()
      await meetingService.validateMeeting(cleanCode)
      window.location.href = `/room/${cleanCode}`
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Invalid meeting code')
      setIsJoining(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── HEADER ── */}
      <header className="bg-primary px-6 flex items-center justify-between z-50 h-16 shadow-lg shadow-primary/25" style={{ borderBottom: '2px solid rgba(147,210,255,0.55)' }}>
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
            <Video className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">Codovate-Meet</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-sm font-bold text-white">{user.name}</p>
            <p className="text-xs text-blue-200/70">{user.email}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <Button variant="outline" size="sm" onClick={logout}
            className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:border-white/50 font-semibold">
            <LogOut className="h-4 w-4 mr-1.5" /> Logout
          </Button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-10">

        {/* Welcome banner */}
        <motion.div {...fadeInUp} className="relative overflow-hidden hero-gradient rounded-2xl p-8 shadow-lg">
          <div className="orb w-64 h-64 bg-blue-300/20 top-[-40px] right-0" />
          <div className="relative z-10">
            <p className="text-blue-200 text-sm font-semibold mb-1">👋 Welcome back</p>
            <h1 className="text-3xl font-black text-white mb-2">{user.name}</h1>
            <p className="text-blue-100/80 text-sm">You have {recentMeetings.length} meeting{recentMeetings.length !== 1 ? 's' : ''} in your history.</p>
          </div>
        </motion.div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Create Meeting */}
          <motion.div {...fadeInUp} className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-blue-50 border-b border-border px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-sm shadow-primary/30">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">New Meeting</h2>
                <p className="text-xs text-muted-foreground">Generate a shareable meeting link</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {createdCode ? (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Your meeting link</p>
                    <p className="font-mono text-sm font-bold text-primary truncate">
                      {typeof window !== 'undefined' ? `${window.location.origin}/room/${createdCode}` : createdCode}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleCopyLink} className="flex-1 rounded-xl font-semibold border-border">
                      {copied ? <><Check className="h-4 w-4 mr-2 text-green-500" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy Link</>}
                    </Button>
                    <Button className="flex-1 btn-glow text-white font-bold rounded-xl"
                      onClick={() => window.location.href = `/room/${createdCode}`}>
                      Start Call <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                  <button className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => { setCreatedCode(null); setRoomName(''); setScheduledAt('') }}>
                    + Create another meeting
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <LayoutDashboard className="h-3.5 w-3.5 text-primary" /> Meeting Name
                    </label>
                    <Input placeholder="e.g. Daily Standup, Sprint Review"
                      value={roomName} onChange={(e) => setRoomName(e.target.value)}
                      className="bg-background border-border rounded-xl h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Schedule <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </label>
                    <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                      className="bg-background border-border rounded-xl h-11" />
                  </div>
                  <Button className="w-full btn-glow text-white font-bold rounded-xl h-12"
                    onClick={handleCreateMeeting} disabled={isCreating}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isCreating ? 'Creating...' : 'Create Meeting'}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Join Meeting */}
          <motion.div {...fadeInUp} className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-border px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm shadow-indigo-500/30">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">Join Meeting</h2>
                <p className="text-xs text-muted-foreground">Enter a meeting code to join</p>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleJoinMeeting} className="space-y-4">
                {joinError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                    ⚠ {joinError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Meeting Code</label>
                  <Input placeholder="CDV-XXXX-XXXX"
                    className="bg-background border-border rounded-xl h-12 uppercase font-mono tracking-widest text-center text-lg font-bold"
                    value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required />
                  <p className="text-xs text-muted-foreground text-center">Paste the meeting code shared with you</p>
                </div>
                <Button type="submit"
                  className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 text-white shadow-md shadow-indigo-500/20"
                  disabled={isJoining}>
                  {isJoining ? 'Joining...' : <><ArrowRight className="h-4 w-4 mr-2" />Join Meeting</>}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Recent Meetings */}
        <motion.section {...fadeInUp} className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-black text-foreground uppercase tracking-widest text-xs">Meeting History</h2>
          </div>

          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
            {recentMeetings.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground mb-1">No meetings yet</p>
                  <p className="text-sm text-muted-foreground">Create your first meeting above to get started.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/40 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Meeting</th>
                      <th className="text-left px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Code</th>
                      <th className="text-left px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Duration</th>
                      <th className="text-right px-6 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentMeetings.map((m) => (
                      <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-6 py-4 font-semibold text-foreground text-sm">{m.room_name || 'Untitled Meeting'}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">
                            {m.meeting_code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {new Date(m.scheduled_at || m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {(m as any).duration ? `${Math.round((m as any).duration / 60)} min` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button size="sm" onClick={() => window.location.href = `/room/${m.meeting_code}`}
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-white border-0 font-semibold rounded-lg transition-all">
                            Rejoin →
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.section>
      </main>
    </div>
  )
}
