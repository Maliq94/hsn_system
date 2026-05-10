'use client'
import { useState, useEffect, useRef } from 'react'
import TacticalDashboard from '@/components/TacticalDashboard'

export default function Home() {
  const [user, setUser] = useState(null)
  const [cases, setCases] = useState([])
  const [members, setMembers] = useState([])
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(false)
  const [loginStatus, setLoginStatus] = useState('')
  
  const phoneRef = useRef(null)
  const passRef = useRef(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('hsn_user')
    if (savedUser) {
      const u = JSON.parse(savedUser)
      if (u.role === 'MEMBER' || u.role === 'SPECIALIST') {
        window.location.href = '/mobile'
      } else {
        setUser(u)
        refreshData()
      }
    }
  }, [])

  const refreshData = () => {
    fetch('/api/members').then(r => r.json()).then(setMembers).catch(() => {})
    fetch('/api/cases').then(r => r.json()).then(setCases).catch(() => {})
    fetch('/api/visits').then(r => r.json()).then(setVisits).catch(() => {})
  }

  const handleLogin = async (e) => {
    if (e) e.preventDefault()
    const phone = phoneRef.current?.value.trim()
    const password = passRef.current?.value.trim()
    
    if (!phone || !password) {
      setLoginStatus('❌ يرجى إدخال رقم الهاتف وكلمة المرور')
      return
    }

    setLoading(true)
    setLoginStatus('جاري التحقق...')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('hsn_user', JSON.stringify(data.user || data))
        const finalUser = data.user || data
        if (finalUser.role === 'MEMBER') {
          window.location.href = '/mobile'
        } else {
          setUser(finalUser)
          setLoginStatus('')
          refreshData()
        }
      } else {
        setLoginStatus('❌ ' + (data.error || 'فشل تسجيل الدخول'))
      }
    } catch(err) {
      setLoginStatus('⚠️ خطأ في الشبكة')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('hsn_user')
    setUser(null)
  }

  if (!user) return (
    <div className="container" style={{ justifyContent: 'center', alignItems: 'center', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ width: '120px', height: '120px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', overflow: 'hidden' }}>
            <img src="/logo.png" alt="HSN Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '1rem', top: '1rem', color: '#475569' }}>person</span>
            <input 
              ref={phoneRef}
              type="text" 
              placeholder="رقم الهاتف" 
              className="bg-[#0f172a] border border-[#1e293b] text-[#fff] p-4 pr-12 rounded-xl focus:border-[#00E5FF] outline-none w-full"
            />
          </div>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '1rem', top: '1rem', color: '#475569' }}>lock</span>
            <input 
              ref={passRef}
              type="password" 
              placeholder="كلمة المرور" 
              className="bg-[#0f172a] border border-[#1e293b] text-[#fff] p-4 pr-12 rounded-xl focus:border-[#00E5FF] outline-none w-full"
              onKeyDown={(e) => { if(e.key === 'Enter') handleLogin() }}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            style={{ 
              background: '#00E5FF', 
              color: '#0f172a', 
              fontWeight: '900', 
              padding: '1.2rem', 
              borderRadius: '14px', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '1.1rem', 
              marginTop: '1rem',
              boxShadow: '0 4px 15px rgba(0,229,255,0.2)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول المركزي'}
          </button>
        </form>

        {loginStatus && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', color: loginStatus.includes('❌') ? '#ef4444' : '#00E5FF', fontSize: '0.9rem', fontWeight: 'bold' }}>
            {loginStatus}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <TacticalDashboard 
        user={user} 
        members={members} 
        cases={cases} 
        visits={visits}
        onRefresh={refreshData}
        logout={logout}
      />
    </div>
  )
}
