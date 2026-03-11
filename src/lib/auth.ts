import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import bcrypt from 'bcryptjs'

const DATA_DIR = join(process.cwd(), 'data')
const USERS_FILE = join(DATA_DIR, 'users.json')

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  require('fs').mkdirSync(DATA_DIR, { recursive: true })
}

// Initialize users file if it doesn't exist
if (!existsSync(USERS_FILE)) {
  writeFileSync(USERS_FILE, '[]')
}

function getUsers() {
  try {
    return JSON.parse(readFileSync(USERS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveUser(user: any) {
  const users = getUsers()
  const existingIndex = users.findIndex((u: any) => u.email === user.email)
  if (existingIndex >= 0) {
    users[existingIndex] = user
  } else {
    users.push(user)
  }
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        action: { label: 'Action', type: 'text', defaultValue: 'login' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        const users = getUsers()
        
        if (credentials.action === 'register') {
          if (users.find((u: any) => u.email === credentials.email)) {
            throw new Error('User already exists')
          }
          const hashedPassword = await bcrypt.hash(credentials.password, 10)
          const newUser = {
            id: Date.now().toString(),
            email: credentials.email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
          }
          saveUser(newUser)
          return { id: newUser.id, email: newUser.email }
        }

        const user = users.find((u: any) => u.email === credentials.email)
        if (!user) {
          throw new Error('User not found')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error('Invalid password')
        }

        return { id: user.id, email: user.email }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'
}