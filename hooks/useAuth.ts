import { create } from 'zustand'
import { authService } from '@/services/auth'

interface User {
  id: string
  name: string
  email: string
  is_verified?: boolean
  mfa_enabled?: boolean
  role?: string
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<any>
  logout: () => void
  loadProfile: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const data = await authService.login(email, password)
      localStorage.setItem('token', data.token)
      set({ token: data.token, user: data.user, loading: false })
      return true
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid credentials'
      set({ error: msg, loading: false })
      throw err
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null })
    try {
      const data = await authService.register(name, email, password)
      set({ loading: false })
      return data
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed'
      set({ error: msg, loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null, error: null })
  },

  loadProfile: async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    set({ loading: true })
    try {
      const user = await authService.getProfile()
      set({ user, loading: false })
    } catch (err) {
      console.error('Failed to load user profile, logging out:', err)
      localStorage.removeItem('token')
      set({ token: null, user: null, loading: false })
    }
  }
}))
