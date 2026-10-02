'use client'

import Intercom, { shutdown } from '@intercom/messenger-js-sdk'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

const INTERCOM_APP_ID = 'jv6m7ylw'

export default function IntercomMessenger() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      if (status === 'unauthenticated') shutdown()
      return
    }

    const user = session.user
    const createdAt = Number(user.createdAt)

    Intercom({
      app_id: INTERCOM_APP_ID,
      user_id: user.id,
      name: user.name,
      email: user.email,
      ...(Number.isFinite(createdAt) && createdAt > 0 ? { created_at: createdAt } : {}),
    })

    return () => shutdown()
  }, [session, status])

  return null
}
