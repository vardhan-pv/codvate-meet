import api from '@/lib/api'

export const meetingService = {
  async createMeeting(data: { roomName: string; scheduledAt: string }) {
    const response = await api.post('/api/meetings', data)
    return response.data
  },

  async validateMeeting(code: string) {
    const response = await api.get(`/api/meetings?code=${encodeURIComponent(code)}`)
    return response.data
  },

  async getRecentMeetings() {
    const response = await api.get('/api/meetings')
    return response.data
  },

  async endMeeting(meetingCode: string, durationSeconds: number) {
    const response = await api.post('/api/meetings/end', { meetingCode, durationSeconds })
    return response.data
  },

  async fetchMessages(meetingCode: string) {
    const response = await api.get(`/api/messages?roomId=${meetingCode}`)
    return response.data
  },

  async sendMessage(meetingCode: string, message: string) {
    const response = await api.post('/api/messages', { meetingCode, message })
    return response.data
  }
}
