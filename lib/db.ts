import fs from 'fs'
import path from 'path'

// Path to database.json inside workspace
const DB_FILE = path.join(process.cwd(), 'database.json')

export interface User {
  name: string
  email: string
  password?: string
  phone?: string
  bio?: string
  avatar?: string
  company?: string
  jobTitle?: string
}

export interface Meeting {
  id: string
  roomName: string
  hostId?: string
  hostName?: string
  date: string
  time: string
  duration: string
  status?: string
  type?: string
  participants?: string[]
  createdAt?: string
}

export interface Proposal {
  id: string
  title: string
  clientName: string
  clientEmail: string
  meetingId: string
  date: string
  value: string
  status: string
  content: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  senderName: string
  senderEmail: string
  text: string
  timestamp: string
}

export interface DatabaseSchema {
  users: User[]
  meetings: Meeting[]
  proposals: Proposal[]
  chats: Record<string, ChatMessage[]>
  transcripts: Record<string, { text: string; updatedAt: string }>
}

function getInitialDB(): DatabaseSchema {
  return {
    users: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password',
        phone: '+1 (555) 000-0000',
        bio: 'Product Manager at Codovate. Experienced in scaling engineering teams.',
        avatar: 'JD',
        company: 'Codovate',
        jobTitle: 'Product Manager'
      }
    ],
    meetings: [],
    proposals: [],
    chats: {},
    transcripts: {}
  }
}

export function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDB()
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8')
      return initial
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading database.json:', error)
    return getInitialDB()
  }
}

export function writeDB(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing database.json:', error)
  }
}
