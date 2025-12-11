'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/portal')
  }, [router])

  return (
    <div className={styles.loading}>
      Redirecting to portal...
    </div>
  )
}

