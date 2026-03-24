import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from './useAuth'
import { PAGE_KEYS } from '../lib/constants'

export function usePageTracking() {
  const location = useLocation()
  const { user } = useAuth()
  const lastPath = useRef<string>('')

  useEffect(() => {
    if (!user) return

    const segments = location.pathname.replace('/app/', '').split('/')
    const pageKey = segments.length > 1 && segments[0] === 'admin'
      ? `admin/${segments[1]}`
      : PAGE_KEYS[segments[0]] ?? null

    if (!pageKey || pageKey === lastPath.current) return
    lastPath.current = pageKey

    supabase
      .from('access_logs')
      .insert({
        user_id: user.id,
        event_type: 'page_view',
        page_key: pageKey,
        user_agent: navigator.userAgent,
      })
      .then(() => {})
  }, [location.pathname, user])
}
