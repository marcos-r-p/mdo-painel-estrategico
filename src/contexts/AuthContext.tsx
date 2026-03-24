import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { fetchUserProfile } from '../services/api/auth'
import type { UserProfile } from '../types/database'

// ─── Context type ────────────────────────────────────────────
export interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  authLoading: boolean
  isAdmin: boolean
  isAuthenticated: boolean
  isPasswordRecovery: boolean
  login: (email: string, password: string) => Promise<unknown>
  logout: () => Promise<void>
  loadProfile: (userId: string, email?: string) => Promise<UserProfile | null>
  clearPasswordRecovery: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

// ─── Provider ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  const loadProfile = useCallback(
    async (userId: string, email?: string): Promise<UserProfile | null> => {
      try {
        const profile = await fetchUserProfile(userId, email)
        console.log('[Auth] Perfil carregado:', profile)
        setUserProfile(profile)
        return profile
      } catch (err) {
        console.error('Erro ao carregar perfil:', err)
        setUserProfile(null)
        return null
      }
    },
    [],
  )

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error

    // Check if user is deactivated
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ativo, deleted_at')
      .eq('id', data.user.id)
      .single()

    if (profile && (!profile.ativo || profile.deleted_at)) {
      await supabase.auth.signOut()
      throw new Error('Conta desativada. Entre em contato com o administrador.')
    }

    return data
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setUserProfile(null)
  }

  useEffect(() => {
    let mounted = true

    // Safety timeout — never stay loading forever
    const timeout = setTimeout(() => {
      if (mounted) setAuthLoading(false)
    }, 5000)

    // Check current session on mount
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          loadProfile(currentUser.id, currentUser.email).finally(() => {
            if (mounted) {
              clearTimeout(timeout)
              setAuthLoading(false)
            }
          })
        } else {
          clearTimeout(timeout)
          setAuthLoading(false)
        }
      })
      .catch((err: unknown) => {
        console.error('Erro ao verificar sessão:', err)
        if (mounted) {
          clearTimeout(timeout)
          setAuthLoading(false)
        }
      })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (_event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }

      if (currentUser) {
        await loadProfile(currentUser.id, currentUser.email)
      } else {
        setUserProfile(null)
      }

      setAuthLoading(false)
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), [])

  const isAdmin = userProfile?.role_nome === 'admin'
  const isAuthenticated = !!user

  const value: AuthContextType = {
    user,
    userProfile,
    authLoading,
    isAdmin,
    isAuthenticated,
    isPasswordRecovery,
    login,
    logout,
    loadProfile,
    clearPasswordRecovery,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
