import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchPlans } from '../lib/planEngine'

// Animated counter
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const step = target / 60
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return <>{count.toLocaleString()}{suffix}</>
}

export default function LandingPage() {
  const [plans, setPlans] = useState([])
  const [billing, setBilling] = useState('monthly')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetchPlans().then(setPlans)
    // Scroll reveal
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed') }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const paidPlans = plans.filter(p => !p.is_free)
  const freePlan = plans.find(p => p.is_free)

  return (
    <div className="landing">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@300;400;500&display=swap');

        .landing {
          font-family: 'Inter', sans-serif;
          background: #080c14;
          color: #e8eaf0;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .landing * { box-sizing: border-box; }

        /* Noise overlay */
        .landing::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.4;
        }

        /* Grid bg */
        .grid-bg {
          position: absolute; inset: 0; z-index: 0;
          background-image:
            linear-gradient(rgba(79,70,229,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,70,229,0.07) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%);
        }

        /* Glow orbs */
        .orb {
          position: absolute; border-radius: 50%;
          filter: blur(80px); pointer-events: none;
        }
        .orb-1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(79,70,229,0.25) 0%, transparent 70%); top: -200px; left: 50%; transform: translateX(-50%); }
        .orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%); bottom: 0; right: -100px; }
        .orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%); top: 40%; left: -100px; }

        /* Nav */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 0 2rem;
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
          background: rgba(8,12,20,0.8);
        }

        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-logo img { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; }
        .nav-logo span { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 1.1rem; color: #fff; letter-spacing: -0.02em; }

        .nav-links { display: flex; align-items: center; gap: 2rem; }
        .nav-links a { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.875rem; transition: color 0.2s; }
        .nav-links a:hover { color: #fff; }

        .nav-actions { display: flex; align-items: center; gap: 0.75rem; }

        .btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); padding: 0.5rem 1.25rem; border-radius: 10px; font-size: 0.875rem; cursor: pointer; text-decoration: none; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: #fff; background: rgba(255,255,255,0.05); }

        .btn-primary-l { background: #4f46e5; border: none; color: #fff; padding: 0.5rem 1.25rem; border-radius: 10px; font-size: 0.875rem; cursor: pointer; text-decoration: none; transition: all 0.2s; font-family: 'Inter', sans-serif; font-weight: 500; }
        .btn-primary-l:hover { background: #4338ca; transform: translateY(-1px); box-shadow: 0 8px 25px rgba(79,70,229,0.4); }

        /* Hero */
        .hero {
          position: relative; min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 6rem 1.5rem 4rem;
          overflow: hidden;
        }

        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(79,70,229,0.15); border: 1px solid rgba(79,70,229,0.3);
          color: #a5b4fc; padding: 0.375rem 1rem; border-radius: 999px;
          font-size: 0.8rem; font-weight: 500; margin-bottom: 2rem;
          animation: fadeSlideDown 0.6s ease both;
        }

        .hero-badge-dot { width: 6px; height: 6px; background: #818cf8; border-radius: 50%; animation: pulse 2s infinite; }

        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

        .hero-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(3rem, 7vw, 5.5rem);
          font-weight: 800; line-height: 1.0;
          letter-spacing: -0.04em;
          color: #fff; margin: 0 0 1.5rem;
          animation: fadeSlideUp 0.7s ease 0.1s both;
          max-width: 900px;
        }

        .hero-title .accent {
          background: linear-gradient(135deg, #818cf8 0%, #6ee7b7 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          font-size: clamp(1rem, 2vw, 1.15rem); color: rgba(255,255,255,0.5);
          max-width: 540px; line-height: 1.75; margin: 0 auto 2.5rem;
          animation: fadeSlideUp 0.7s ease 0.2s both;
          font-weight: 400;
        }

        .hero-ctas {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          animation: fadeSlideUp 0.7s ease 0.3s both;
        }

        .btn-hero-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #4f46e5; color: #fff; padding: 0.875rem 2rem;
          border-radius: 12px; font-size: 1rem; font-weight: 500;
          text-decoration: none; transition: all 0.25s;
          font-family: 'Inter', sans-serif; border: none; cursor: pointer;
          box-shadow: 0 0 0 1px rgba(79,70,229,0.5), 0 8px 30px rgba(79,70,229,0.3);
        }
        .btn-hero-primary:hover { background: #4338ca; transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(79,70,229,0.7), 0 16px 40px rgba(79,70,229,0.4); }

        .btn-hero-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8);
          padding: 0.875rem 2rem; border-radius: 12px; font-size: 1rem;
          font-weight: 400; text-decoration: none; transition: all 0.25s;
          border: 1px solid rgba(255,255,255,0.1); font-family: 'Inter', sans-serif;
        }
        .btn-hero-secondary:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2); }

        /* Stats */
        .stats {
          display: flex; gap: 3rem; justify-content: center; flex-wrap: wrap;
          margin-top: 5rem; padding-top: 3.5rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          animation: fadeSlideUp 0.7s ease 0.5s both;
        }
        .stat-item { text-align: center; }
        .stat-num { font-family: 'Bricolage Grotesque', sans-serif; font-size: 2.5rem; font-weight: 800; color: #fff; line-height: 1; }
        .stat-label { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: 4px; }

        /* UI preview card */
        .hero-preview {
          margin-top: 5rem; position: relative;
          animation: fadeSlideUp 0.8s ease 0.4s both;
          max-width: 800px; width: 100%;
        }
        .preview-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
        }
        .preview-bar {
          display: flex; align-items: center; gap: 8px; padding: 12px 16px;
          background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .preview-dot { width: 10px; height: 10px; border-radius: 50%; }
        .preview-content { padding: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .preview-mini-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 16px;
        }
        .preview-label { font-size: 0.65rem; color: rgba(255,255,255,0.3); margin-bottom: 6px; }
        .preview-value { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.4rem; font-weight: 700; color: #fff; }
        .preview-bar-item { height: 4px; border-radius: 2px; margin-top: 8px; }

        /* Section */
        section { position: relative; z-index: 1; }
        .section-inner { max-width: 1100px; margin: 0 auto; padding: 7rem 1.5rem; }

        .section-label {
          font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: #818cf8; margin-bottom: 1rem;
        }

        .section-title {
          font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800; color: #fff; margin: 0 0 1rem;
          letter-spacing: -0.03em; line-height: 1.1;
        }

        .section-sub { font-size: 1rem; color: rgba(255,255,255,0.45); max-width: 500px; line-height: 1.7; font-weight: 300; }

        /* Reveal animation */
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.revealed { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }

        /* Features */
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5px; background: rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }

        .feature-card {
          background: #080c14; padding: 2.75rem 2.5rem;
          transition: background 0.2s;
          position: relative; overflow: hidden;
        }
        .feature-card:hover { background: rgba(79,70,229,0.06); }
        .feature-card::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(circle at 0% 0%, rgba(79,70,229,0.08) 0%, transparent 60%);
          opacity: 0; transition: opacity 0.3s;
        }
        .feature-card:hover::before { opacity: 1; }

        .feature-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.25rem; font-size: 1.3rem;
        }

        .feature-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0 0 0.6rem; }
        .feature-desc { font-size: 0.875rem; color: rgba(255,255,255,0.45); line-height: 1.7; margin: 0; font-weight: 300; }

        /* Audience split */
        .audience-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 640px) { .audience-grid { grid-template-columns: 1fr; } }

        .audience-card {
          border-radius: 20px; padding: 3rem 2.5rem;
          border: 1px solid rgba(255,255,255,0.08);
          position: relative; overflow: hidden;
        }
        .audience-card-teacher { background: linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(79,70,229,0.05) 100%); }
        .audience-card-student { background: linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%); }

        .audience-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 0.25rem 0.75rem;
          border-radius: 999px; margin-bottom: 1.5rem;
        }
        .tag-teacher { background: rgba(79,70,229,0.2); color: #a5b4fc; }
        .tag-student { background: rgba(16,185,129,0.2); color: #6ee7b7; }

        .audience-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.6rem; font-weight: 800; color: #fff; margin: 0 0 1rem; line-height: 1.2; }
        .audience-desc { font-size: 0.9rem; color: rgba(255,255,255,0.5); line-height: 1.75; margin: 0 0 2.5rem; font-weight: 300; }

        .audience-list { list-style: none; padding: 0; margin: 0 0 2rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .audience-list li { display: flex; align-items: center; gap: 10px; font-size: 0.875rem; color: rgba(255,255,255,0.7); }
        .audience-list li::before { content: ''; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .teacher-li::before { background: #818cf8; }
        .student-li::before { background: #6ee7b7; }

        .audience-cta {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 0.75rem 1.5rem; border-radius: 10px;
          font-size: 0.875rem; font-weight: 500; text-decoration: none;
          transition: all 0.2s; font-family: 'Inter', sans-serif;
        }
        .cta-teacher { background: #4f46e5; color: #fff; }
        .cta-teacher:hover { background: #4338ca; box-shadow: 0 8px 20px rgba(79,70,229,0.4); }
        .cta-student { background: rgba(16,185,129,0.2); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
        .cta-student:hover { background: rgba(16,185,129,0.3); }

        /* Footer */
        .footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 4rem 1.5rem;
          max-width: 1100px; margin: 0 auto;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem;
        }
        .footer-brand { display: flex; align-items: center; gap: 10px; }
        .footer-brand img { width: 28px; height: 28px; border-radius: 7px; object-fit: cover; }
        .footer-brand span { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; color: rgba(255,255,255,0.8); }
        .footer-links { display: flex; gap: 2rem; }
        .footer-links a { font-size: 0.8rem; color: rgba(255,255,255,0.35); text-decoration: none; transition: color 0.2s; }
        .footer-links a:hover { color: rgba(255,255,255,0.7); }
        .footer-copy { font-size: 0.75rem; color: rgba(255,255,255,0.2); }

        /* Mobile nav */
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .features-grid { grid-template-columns: 1fr; }
          .preview-content { grid-template-columns: 1fr 1fr; }
          .nav-actions { gap: 0.5rem; }
          .btn-ghost { padding: 0.4rem 0.75rem; font-size: 0.75rem; }
          .btn-primary-l { padding: 0.4rem 0.75rem; font-size: 0.75rem; }
          .hero { padding: 7rem 1.25rem 5rem; }
          .hero-title { font-size: clamp(2.4rem, 9vw, 3.5rem); letter-spacing: -0.03em; }
          .hero-ctas { gap: 0.75rem; }
          .btn-hero-primary, .btn-hero-secondary { padding: 0.75rem 1.5rem; font-size: 0.9rem; }
          .stats { gap: 2rem; margin-top: 3.5rem; }
          .stat-num { font-size: 2rem; }
          .footer { flex-direction: column; align-items: flex-start; gap: 1.25rem; }
          .footer-links { gap: 1.25rem; flex-wrap: wrap; }
        }

        @media (max-width: 420px) {
          .nav-actions .btn-ghost span, .nav-actions .btn-primary-l span { display: none; }
          .btn-ghost { padding: 0.4rem 0.6rem; }
          .btn-primary-l { padding: 0.4rem 0.6rem; }
        }

        /* Divider glow */
        .glow-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(79,70,229,0.4), transparent); margin: 0; }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <Link to="/" className="nav-logo">
          <img src="/logo.png" alt="Skooly" />
          <span>Skooly</span>
        </Link>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#for-you">For you</a>
        </div>
        <div className="nav-actions">
          <Link to="/student/login" className="btn-ghost"><span>Student login</span></Link>
          <Link to="/teacher/login" className="btn-primary-l"><span>Teacher login</span></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="grid-bg" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            Built for modern classrooms
          </div>

          <h1 className="hero-title">
            The classroom platform<br />
            teachers <span className="accent">actually love</span>
          </h1>

          <p className="hero-sub">
            Create spaces, assign quizzes, track progress, and keep students engaged — all in one beautifully simple platform.
          </p>

          <div className="hero-ctas">
            <Link to="/teacher/signup" className="btn-hero-primary">
              Start teaching free
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link to="/student/login" className="btn-hero-secondary">
              I'm a student
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Fake UI preview */}
          <div className="hero-preview">
            <div className="preview-card">
              <div className="preview-bar">
                <div className="preview-dot" style={{ background: '#ff5f57' }} />
                <div className="preview-dot" style={{ background: '#febc2e' }} />
                <div className="preview-dot" style={{ background: '#28c840' }} />
                <div style={{ marginLeft: 8, fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>Skooly Dashboard</div>
              </div>
              <div className="preview-content">
                <div className="preview-mini-card">
                  <div className="preview-label">Active Spaces</div>
                  <div className="preview-value">8</div>
                  <div className="preview-bar-item" style={{ background: 'linear-gradient(90deg, #4f46e5, #818cf8)', width: '75%' }} />
                </div>
                <div className="preview-mini-card">
                  <div className="preview-label">Total Students</div>
                  <div className="preview-value">142</div>
                  <div className="preview-bar-item" style={{ background: 'linear-gradient(90deg, #10b981, #6ee7b7)', width: '88%' }} />
                </div>
                <div className="preview-mini-card">
                  <div className="preview-label">Avg. Quiz Score</div>
                  <div className="preview-value">79%</div>
                  <div className="preview-bar-item" style={{ background: 'linear-gradient(90deg, #f59e0b, #fcd34d)', width: '79%' }} />
                </div>
              </div>
            </div>
            {/* Glow under card */}
            <div style={{ position: 'absolute', bottom: -40, left: '10%', right: '10%', height: 80, background: 'radial-gradient(ellipse, rgba(79,70,229,0.3) 0%, transparent 70%)', filter: 'blur(20px)', zIndex: -1 }} />
          </div>

          <div className="stats">
            <div className="stat-item">
              <div className="stat-num"><Counter target={2400} />+</div>
              <div className="stat-label">Students taught</div>
            </div>
            <div className="stat-item">
              <div className="stat-num"><Counter target={380} />+</div>
              <div className="stat-label">Active teachers</div>
            </div>
            <div className="stat-item">
              <div className="stat-num"><Counter target={98} />%</div>
              <div className="stat-label">Satisfaction rate</div>
            </div>
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* Features */}
      <section id="features">
        <div className="section-inner">
          <div className="reveal" style={{ maxWidth: 600 }}>
            <div className="section-label">Everything you need</div>
            <h2 className="section-title">One platform.<br />Every classroom tool.</h2>
            <p className="section-sub">Stop juggling five different apps. Skooly brings your content, students, and insights together.</p>
          </div>

          <div className="features-grid reveal" style={{ marginTop: '4rem' }}>
            {[
              { icon: '📝', color: 'rgba(79,70,229,0.2)', title: 'Rich notes & content', desc: 'Write beautiful lesson notes with headings, bullet points, code blocks, and more. Students read them in a clean, distraction-free view.' },
              { icon: '🧠', color: 'rgba(245,158,11,0.2)', title: 'Auto-graded quizzes', desc: 'Build multiple choice quizzes in minutes. Students get instant feedback, you get a full breakdown of scores without lifting a pen.' },
              { icon: '📎', color: 'rgba(16,185,129,0.2)', title: 'Assignment submissions', desc: 'Students upload files or write answers directly. Review submissions, leave scores, and track who has and hasn\'t submitted.' },
              { icon: '📊', color: 'rgba(139,92,246,0.2)', title: 'Progress tracking', desc: 'See at a glance how every student is doing across every piece of content. Spot who needs help before they fall behind.' },
              { icon: '📣', color: 'rgba(236,72,153,0.2)', title: 'Announcements', desc: 'Post updates to your class instantly. Share Zoom links, remind students about deadlines, or pin important notices.' },
              { icon: '🔒', color: 'rgba(20,184,166,0.2)', title: 'Approval-based joining', desc: 'Control who enters your space. Accept or deny join requests individually, keeping your classroom safe and organised.' },
            ].map((f, i) => (
              <div key={f.title} className="feature-card reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* For teachers + students */}
      <section id="for-you">
        <div className="section-inner">
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="section-label">Built for everyone</div>
            <h2 className="section-title">For teachers. For students.</h2>
          </div>
          <div className="audience-grid">
            <div className="audience-card audience-card-teacher reveal">
              <div className="audience-tag tag-teacher">👩‍🏫 For teachers</div>
              <h3 className="audience-title">Your classroom, your way.</h3>
              <p className="audience-desc">Set up in minutes. No training needed. Built by teachers who know what actually matters in a classroom tool.</p>
              <ul className="audience-list">
                {['Create spaces with a unique join code', 'Build quizzes in under 2 minutes', 'Review every submission in one place', 'Track student progress at a glance', 'Send announcements instantly'].map(item => (
                  <li key={item} className="teacher-li">{item}</li>
                ))}
              </ul>
              <Link to="/teacher/signup" className="audience-cta cta-teacher">
                Start for free →
              </Link>
            </div>

            <div className="audience-card audience-card-student reveal reveal-delay-1">
              <div className="audience-tag tag-student">🎓 For students</div>
              <h3 className="audience-title">Learning made simple.</h3>
              <p className="audience-desc">Join your teacher's space with a code. Everything you need — notes, quizzes, assignments — in one place.</p>
              <ul className="audience-list">
                {['Join any class with a 6-digit code', 'Read lesson notes anytime', 'Take quizzes and see scores instantly', 'Submit assignments from your device', 'Never miss an announcement'].map(item => (
                  <li key={item} className="student-li">{item}</li>
                ))}
              </ul>
              <Link to="/student/login" className="audience-cta cta-student">
                Join a class →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1 }}>
        <div className="footer">
          <div className="footer-brand">
            <img src="/logo.png" alt="Skooly" />
            <span>Skooly</span>
          </div>
          <div className="footer-links">
            <Link to="/teacher/signup">Sign up</Link>
            <Link to="/teacher/login">Teacher login</Link>
            <Link to="/student/login">Student login</Link>
          </div>
          <div className="footer-copy">© {new Date().getFullYear()} Skooly. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}