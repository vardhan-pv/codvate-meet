import api from '@/lib/api'

export const livekitService = {
  async getRoomToken(room: string, identity: string) {
    const response = await api.get(`/api/livekit/token?room=${encodeURIComponent(room)}&identity=${encodeURIComponent(identity)}`)
    return response.data
  }
}
