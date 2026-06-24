import api from '@/lib/api'

export const authService = {
  async register(name: string, email: string, password: string) {
    const response = await api.post('/api/register', { name, email, password })
    return response.data
  },

  async login(email: string, password: string) {
    const response = await api.post('/api/login', { email, password })
    return response.data
  },

  async getProfile() {
    const response = await api.get('/api/profile')
    return response.data
  }
}
