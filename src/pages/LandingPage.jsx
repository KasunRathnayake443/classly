import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* Glow blobs */}
      <div style={{ position: 'absolute', top: -120, left: '10%', width: 500, height: 500, borderRadius: '50%', background: '#4f46e5', opacity: 0.12, filter: 'blur(120px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, right: '5%', width: 400, height: 400, borderRadius: '50%', background: '#7c3aed', opacity: 0.12, filter: 'blur(100px)', pointerEvents: 'none' }} />

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 40px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
           <img src="/logo.png" alt="Skooly" className="w-12 h-12 rounded-lg object-cover" />
          <span style={{ color: 'white', fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em' }}>Skooly</span>
        </div>
        
      </nav>

      {/* Hero */}
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 24px' }}>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)', color: '#a5b4fc', fontSize: 12, fontWeight: 500, padding: '6px 16px', borderRadius: 999, marginBottom: 36 }}>
          <div style={{ width: 6, height: 6, background: '#818cf8', borderRadius: '50%' }} />
          Built for modern classrooms
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(42px, 7vw, 72px)', fontWeight: 700, color: 'white', marginBottom: 20, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          Where learning<br />
          <span style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            comes alive
          </span>
        </h1>

        <p style={{ color: '#6b7280', fontSize: 17, maxWidth: 480, marginBottom: 52, lineHeight: 1.7 }}>
          Skooly gives teachers the tools to create, share, and track — and gives students a focused space to learn.
        </p>

        {/* CTA cards */}
        <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 480, flexWrap: 'wrap' }}>

          {/* Teacher card */}
          <div style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, textAlign: 'left' }}>
            <div style={{ width: 36, height: 36, background: 'rgba(79,70,229,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <svg width="18" height="18" fill="none" stroke="#818cf8" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p style={{ color: 'white', fontWeight: 500, fontSize: 14, marginBottom: 4 }}>I'm a teacher</p>
            <p style={{ color: '#4b5563', fontSize: 12, marginBottom: 16 }}>Create spaces, add content, track progress</p>
            <Link to="/teacher/signup" style={{ display: 'block', textAlign: 'center', fontSize: 13, background: '#4f46e5', color: 'white', fontWeight: 500, padding: '9px 0', borderRadius: 8, textDecoration: 'none', marginBottom: 8 }}>
              Get started free
            </Link>
            <Link to="/teacher/login" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: '#6b7280', textDecoration: 'none', padding: '4px 0' }}
              onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#6b7280'}>
              Sign in
            </Link>
          </div>

          {/* Student card */}
          <div style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, textAlign: 'left' }}>
            <div style={{ width: 36, height: 36, background: 'rgba(124,58,237,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <svg width="18" height="18" fill="none" stroke="#a78bfa" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p style={{ color: 'white', fontWeight: 500, fontSize: 14, marginBottom: 4 }}>I'm a student</p>
            <p style={{ color: '#4b5563', fontSize: 12, marginBottom: 16 }}>Join classes, take quizzes, submit work</p>
            <Link to="/student/signup" style={{ display: 'block', textAlign: 'center', fontSize: 13, background: '#7c3aed', color: 'white', fontWeight: 500, padding: '9px 0', borderRadius: 8, textDecoration: 'none', marginBottom: 8 }}>
              Create account
            </Link>
            <Link to="/student/login" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: '#6b7280', textDecoration: 'none', padding: '4px 0' }}
              onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#6b7280'}>
              Sign in
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 10, textAlign: 'center', paddingBottom: 32 }}>
        <p style={{ color: '#374151', fontSize: 12 }}>© 2025 Skooly. Built for teachers and students.</p>
      </footer>
    </div>
  )
}
