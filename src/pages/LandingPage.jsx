import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}

function Counter({ target, duration = 1800 }) {
  const [count, setCount] = useState(0)
  const [ref, inView] = useInView(0.5)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(ease * target))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target])
  return <span ref={ref}>{count.toLocaleString()}</span>
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`
    }}>
      {children}
    </div>
  )
}

// Fake app UI screenshots built in code
function DashboardMockup() {
  const spaces = [
    { name: 'Year 10 Biology', subject: 'Science', color: '#4F46E5', icon: '🔬', students: 24, content: 8 },
    { name: 'Mathematics A', subject: 'Maths', color: '#059669', icon: '🧮', students: 31, content: 12 },
    { name: 'English Literature', subject: 'English', color: '#DB2777', icon: '📖', students: 18, content: 6 },
  ]
  return (
    <div style={{ background: '#f8f8f7', borderRadius: 16, padding: 20, fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
        <span style={{ marginLeft: 8, color: '#999', fontSize: 11 }}>Skooly — Dashboard</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[['Active classes', '3', '#4F46E5'], ['Total students', '73', '#059669'], ['Content items', '26', '#D97706']].map(([l,v,c]) => (
          <div key={l} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #eee' }}>
            <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 8 }}>YOUR CLASSES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {spaces.map(s => (
          <div key={s.name} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#111', fontSize: 12 }}>{s.name}</div>
              <div style={{ color: '#aaa', fontSize: 10 }}>{s.subject}</div>
            </div>
            <div style={{ fontSize: 10, color: '#bbb' }}>{s.students} students · {s.content} items</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuizMockup() {
  const questions = [
    { q: 'Which organelle is known as the "powerhouse of the cell"?', opts: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi apparatus'], correct: 0 },
    { q: 'What is the process by which plants make food using sunlight?', opts: ['Respiration', 'Photosynthesis', 'Fermentation', 'Digestion'], correct: 1 },
    { q: 'What is the chemical symbol for water?', opts: ['CO₂', 'O₂', 'H₂O', 'NaCl'], correct: 2 },
    { q: 'How many chromosomes do humans have?', opts: ['23', '44', '46', '48'], correct: 2 },
    { q: 'Which planet is closest to the Sun?', opts: ['Venus', 'Earth', 'Mars', 'Mercury'], correct: 3 },
  ]
  const [qIdx, setQIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const q = questions[qIdx]
  const selected = answers[qIdx]
  const score = submitted ? questions.filter((q, i) => answers[i] === q.correct).length : null

  function selectOpt(i) { if (!submitted) setAnswers(prev => ({ ...prev, [qIdx]: i })) }

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #eee', fontFamily: 'Geist, sans-serif', fontSize: 13 }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#4F46E5', letterSpacing: '0.08em' }}>QUIZ · QUESTION {qIdx + 1} OF {questions.length}</div>
        <div style={{ fontSize: 10, color: '#bbb' }}>{Object.keys(answers).length}/{questions.length} answered</div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, background: '#f0f0f0', borderRadius: 99, marginBottom: 14 }}>
        <div style={{ height: '100%', width: `${((qIdx + 1) / questions.length) * 100}%`, background: '#4F46E5', borderRadius: 99, transition: 'width 0.3s' }} />
      </div>

      {submitted ? (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: score >= 4 ? '#059669' : score >= 3 ? '#D97706' : '#ef4444', marginBottom: 6 }}>{score}/{questions.length}</div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>{score >= 4 ? '🎉 Excellent work!' : score >= 3 ? '👍 Good effort!' : '💪 Keep practising!'}</div>
          <button onClick={() => { setAnswers({}); setQIdx(0); setSubmitted(false) }}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#4F46E5', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontWeight: 600, color: '#111', fontSize: 14, marginBottom: 14, lineHeight: 1.4 }}>{q.q}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {q.opts.map((opt, i) => {
              const isSelected = selected === i
              return (
                <button key={i} onClick={() => selectOpt(i)}
                  style={{ padding: '9px 13px', borderRadius: 9, border: '2px solid', borderColor: isSelected ? '#4F46E5' : '#eee', background: isSelected ? '#eef2ff' : '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, transition: 'all 0.12s' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid', borderColor: isSelected ? '#4F46E5' : '#ddd', background: isSelected ? '#4F46E5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, color: '#fff' }}>
                    {isSelected ? '✓' : ''}
                  </span>
                  <span style={{ color: '#333', fontSize: 13 }}>{opt}</span>
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, gap: 8 }}>
            <button onClick={() => setQIdx(i => Math.max(0, i - 1))} disabled={qIdx === 0}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #eee', background: '#fff', cursor: qIdx === 0 ? 'not-allowed' : 'pointer', color: qIdx === 0 ? '#ccc' : '#444', fontSize: 12, fontWeight: 500 }}>
              ← Back
            </button>
            {qIdx < questions.length - 1 ? (
              <button onClick={() => setQIdx(i => i + 1)}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Next →
              </button>
            ) : (
              <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: Object.keys(answers).length < questions.length ? '#ccc' : '#059669', color: '#fff', cursor: Object.keys(answers).length < questions.length ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                Submit quiz
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [
    { q: 'Is Skooly free to use?', a: 'Yes — teachers get a free plan with 3 classes and 20 students per class. Upgrade for more.' },
    { q: 'Do students need to pay?', a: 'Never. Skooly is always completely free for students.' },
    { q: 'How do students join a class?', a: "Teachers share a unique join code. Students enter it on their dashboard — that's it." },
    { q: 'Can I use Skooly on mobile?', a: 'Yes. Skooly is fully responsive and works well on phones and tablets for both teachers and students.' },
    { q: 'What types of content can I create?', a: 'Rich text notes with formatting, auto-graded multiple choice quizzes, and assignments with file upload support.' },
    { q: 'Can I control when content is available?', a: "Yes — you can schedule notes, quizzes, and assignments to open and close at specific times. Students see a countdown until content opens." },
  ]

  return (
    <div className="landing-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Geist:wght@300;400;500;600;700&display=swap');

        .landing-page {
          font-family: 'Geist', -apple-system, sans-serif;
          background: #fafaf8;
          color: #1a1a18;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .landing-page * { box-sizing: border-box; }

        /* Nav */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 60px; display: flex; align-items: center;
          padding: 0 clamp(1.25rem, 5vw, 3rem);
          background: rgba(250,250,248,0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .lp-nav-logo { display: flex; align-items: center; gap: 9px; text-decoration: none; flex-shrink: 0; }
        .lp-nav-logo img { width: 28px; height: 28px; border-radius: 7px; object-fit: cover; }
        .lp-nav-logo span { font-family: 'Geist', sans-serif; font-weight: 700; font-size: 1rem; color: #1a1a18; letter-spacing: -0.03em; }
        .lp-nav-links { display: flex; gap: 2rem; margin: 0 auto; }
        .lp-nav-links a { font-size: 0.875rem; color: #666; text-decoration: none; transition: color 0.15s; font-weight: 500; }
        .lp-nav-links a:hover { color: #1a1a18; }
        .lp-nav-actions { display: flex; gap: 0.75rem; align-items: center; flex-shrink: 0; margin-left: auto; }

        .btn-nav-ghost { font-family: 'Geist', sans-serif; font-size: 0.8rem; font-weight: 500; color: #555; text-decoration: none; padding: 0.4rem 0.9rem; border-radius: 8px; border: 1px solid #ddd; transition: all 0.15s; background: #fff; }
        .btn-nav-ghost:hover { border-color: #bbb; color: #1a1a18; }
        .btn-nav-primary { font-family: 'Geist', sans-serif; font-size: 0.8rem; font-weight: 600; color: #fff; background: #1a1a18; text-decoration: none; padding: 0.4rem 1rem; border-radius: 8px; border: 1px solid #1a1a18; transition: all 0.15s; }
        .btn-nav-primary:hover { background: #333; }

        /* Hero */
        .lp-hero {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 6rem clamp(1.25rem, 5vw, 3rem) 3rem;
          text-align: center;
          position: relative;
        }

        /* Subtle grid bg */
        .lp-hero::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, black 20%, transparent 80%);
          pointer-events: none;
        }

        .lp-badge {
          display: inline-flex; align-items: center; gap: 7px;
          background: #fff; border: 1px solid #e5e5e0;
          color: #555; padding: 0.3rem 0.875rem; border-radius: 999px;
          font-size: 0.75rem; font-weight: 500; margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .lp-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #D97706; }

        .lp-hero-title {
          font-family: 'Nunito', sans-serif;
          font-size: clamp(2.8rem, 6.5vw, 5.5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: #1a1a18;
          max-width: 820px;
          margin: 0 auto 1.5rem;
        }
        .lp-hero-title em { font-style: normal; color: #D97706; font-weight: 900; }

        .lp-hero-sub {
          font-size: clamp(1rem, 1.8vw, 1.15rem);
          color: #777;
          max-width: 500px;
          line-height: 1.75;
          margin: 0 auto 2.5rem;
          font-weight: 400;
        }

        .lp-ctas { display: flex; gap: 0.875rem; justify-content: center; flex-wrap: wrap; }

        .btn-primary-lp {
          display: inline-flex; align-items: center; gap: 7px;
          background: #1a1a18; color: #fff;
          padding: 0.8rem 1.75rem; border-radius: 10px;
          font-family: 'Geist', sans-serif; font-size: 0.9rem; font-weight: 600;
          text-decoration: none; border: none; cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .btn-primary-lp:hover { background: #333; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }

        .btn-secondary-lp {
          display: inline-flex; align-items: center; gap: 7px;
          background: #fff; color: #444;
          padding: 0.8rem 1.75rem; border-radius: 10px;
          font-family: 'Geist', sans-serif; font-size: 0.9rem; font-weight: 500;
          text-decoration: none; border: 1px solid #ddd; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary-lp:hover { border-color: #bbb; color: #1a1a18; background: #f5f5f3; }

        /* Stats bar */
        .lp-stats {
          display: flex; gap: clamp(2rem, 5vw, 4rem); justify-content: center; flex-wrap: wrap;
          margin-top: clamp(3rem, 6vw, 5rem);
          padding-top: 2.5rem;
          border-top: 1px solid #e5e5e0;
          position: relative; z-index: 1;
        }
        .lp-stat-num { font-family: 'Geist', sans-serif; font-size: clamp(1.8rem, 3.5vw, 2.5rem); font-weight: 700; color: #1a1a18; line-height: 1; letter-spacing: -0.04em; }
        .lp-stat-label { font-size: 0.8rem; color: #999; margin-top: 4px; font-weight: 400; }

        /* Sections */
        .lp-section { padding: clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 3rem); position: relative; }
        .lp-section-inner { max-width: 1100px; margin: 0 auto; }
        .lp-section-tag { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #D97706; margin-bottom: 0.875rem; }
        .lp-section-title { font-family: 'Nunito', sans-serif; font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 800; color: #1a1a18; margin: 0 0 1rem; letter-spacing: -0.02em; line-height: 1.1; }
        .lp-section-sub { font-size: 1rem; color: #777; max-width: 480px; line-height: 1.75; }

        /* Feature grid */
        .lp-features-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1px;
          background: #e5e5e0; border: 1px solid #e5e5e0; border-radius: 16px; overflow: hidden;
          margin-top: 3rem;
        }
        .lp-feature-card {
          background: #fafaf8; padding: clamp(1.5rem, 3vw, 2.25rem);
          transition: background 0.2s;
        }
        .lp-feature-card:hover { background: #fff; }
        .lp-feature-icon { font-size: 1.5rem; margin-bottom: 1rem; }
        .lp-feature-title { font-family: 'Geist', sans-serif; font-weight: 600; font-size: 0.95rem; color: #1a1a18; margin: 0 0 0.5rem; }
        .lp-feature-desc { font-size: 0.85rem; color: #777; line-height: 1.7; margin: 0; }

        /* Mockup section */
        .lp-mockup-section { background: #fff; border-top: 1px solid #e5e5e0; border-bottom: 1px solid #e5e5e0; }
        .lp-mockup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; }
        @media (max-width: 768px) { .lp-mockup-grid { grid-template-columns: 1fr; } }

        /* Audience */
        .lp-audience-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 3rem; }
        @media (max-width: 640px) { .lp-audience-grid { grid-template-columns: 1fr; } }

        .lp-audience-card {
          border-radius: 16px; padding: clamp(1.75rem, 3vw, 2.5rem);
          border: 1px solid #e5e5e0;
        }
        .lp-audience-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.25rem 0.75rem; border-radius: 999px; margin-bottom: 1.25rem; }
        .tag-teacher { background: #eef2ff; color: #4F46E5; }
        .tag-student { background: #f0fdf4; color: #059669; }
        .lp-audience-title { font-family: 'Nunito', sans-serif; font-size: 1.6rem; font-weight: 800; color: #1a1a18; margin: 0 0 0.875rem; line-height: 1.2; }
        .lp-audience-desc { font-size: 0.875rem; color: #777; line-height: 1.75; margin: 0 0 1.5rem; }
        .lp-audience-list { list-style: none; padding: 0; margin: 0 0 2rem; display: flex; flex-direction: column; gap: 0.6rem; }
        .lp-audience-list li { display: flex; align-items: center; gap: 9px; font-size: 0.875rem; color: #444; }
        .lp-audience-list li::before { content: ''; width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; background: currentColor; }
        .li-t { color: #4F46E5 !important; }
        .li-t::before { background: #4F46E5 !important; }
        .li-s { color: #059669 !important; }
        .li-s::before { background: #059669 !important; }
        .lp-audience-list li span { color: #333; }

        .btn-audience-t { display: inline-flex; align-items: center; gap: 7px; background: #1a1a18; color: #fff; padding: 0.7rem 1.5rem; border-radius: 9px; font-family: 'Geist', sans-serif; font-size: 0.875rem; font-weight: 600; text-decoration: none; transition: all 0.2s; }
        .btn-audience-t:hover { background: #333; }
        .btn-audience-s { display: inline-flex; align-items: center; gap: 7px; background: rgba(5,150,105,0.08); color: #059669; padding: 0.7rem 1.5rem; border-radius: 9px; font-family: 'Geist', sans-serif; font-size: 0.875rem; font-weight: 600; text-decoration: none; border: 1px solid rgba(5,150,105,0.2); transition: all 0.2s; }
        .btn-audience-s:hover { background: rgba(5,150,105,0.15); }

        /* FAQ */
        .lp-faq { max-width: 680px; margin: 3rem auto 0; }
        .lp-faq-item { border-bottom: 1px solid #e5e5e0; }
        .lp-faq-q { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 0; background: none; border: none; cursor: pointer; text-align: left; font-family: 'Geist', sans-serif; font-size: 0.95rem; font-weight: 600; color: #1a1a18; gap: 1rem; }
        .lp-faq-q:hover { color: #D97706; }
        .lp-faq-icon { flex-shrink: 0; transition: transform 0.2s; font-size: 1.1rem; color: #999; }
        .lp-faq-a { padding: 0 0 1.25rem; font-size: 0.875rem; color: #666; line-height: 1.75; }

        /* CTA */
        .lp-cta-section { background: #1a1a18; color: #fff; text-align: center; padding: clamp(4rem, 8vw, 7rem) 1.5rem; }
        .lp-cta-title { font-family: 'Nunito', sans-serif; font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 800; margin: 0 0 1rem; letter-spacing: -0.02em; }
        .lp-cta-sub { color: rgba(255,255,255,0.5); font-size: 1rem; margin: 0 auto 2.5rem; max-width: 420px; line-height: 1.7; }

        .btn-cta-white { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1a1a18; padding: 0.875rem 2rem; border-radius: 10px; font-family: 'Geist', sans-serif; font-size: 0.95rem; font-weight: 700; text-decoration: none; transition: all 0.2s; }
        .btn-cta-white:hover { background: #f5f5f3; transform: translateY(-1px); }

        /* Footer */
        .lp-footer { padding: 2.5rem clamp(1.25rem, 5vw, 3rem); border-top: 1px solid #e5e5e0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; max-width: 1200px; margin: 0 auto; }
        .lp-footer-brand { display: flex; align-items: center; gap: 9px; }
        .lp-footer-brand img { width: 24px; height: 24px; border-radius: 6px; object-fit: cover; }
        .lp-footer-brand span { font-weight: 700; font-size: 0.9rem; color: #1a1a18; }
        .lp-footer-links { display: flex; gap: 1.75rem; flex-wrap: wrap; }
        .lp-footer-links a { font-size: 0.8rem; color: #999; text-decoration: none; transition: color 0.15s; }
        .lp-footer-links a:hover { color: #1a1a18; }
        .lp-footer-copy { font-size: 0.75rem; color: #bbb; }

        @media (max-width: 768px) {
          .lp-nav-links { display: none; }
          .btn-nav-ghost, .btn-nav-primary { font-size: 0.72rem; padding: 0.35rem 0.7rem; white-space: nowrap; }
          .lp-footer { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* Nav */}
      <nav className="lp-nav">
        <Link to="/" className="lp-nav-logo">
          <img src="/logo.png" alt="Skooly" />
          <span>Skooly</span>
        </Link>
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#see-it">See it</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="lp-nav-actions">
          <Link to="/student/login" className="btn-nav-ghost"><span>Student login</span></Link>
          <Link to="/teacher/login" className="btn-nav-primary"><span>Teacher login</span></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div className="lp-badge">
            <div className="lp-badge-dot" />
            Built for real classrooms
          </div>

          <h1 className="lp-hero-title">
            The classroom platform<br />
            teachers <em>actually</em> enjoy using
          </h1>

          <p className="lp-hero-sub">
            Create classes, build quizzes, assign work, track progress — without the complexity of enterprise software.
          </p>

          <div className="lp-ctas">
            <Link to="/teacher/signup" className="btn-primary-lp">
              Start teaching free
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </Link>
            <Link to="/student/login" className="btn-secondary-lp">
              I'm a student →
            </Link>
          </div>

          <div className="lp-stats">
            {[
              { value: 2400, label: 'Students taught', suffix: '+' },
              { value: 380, label: 'Active teachers', suffix: '+' },
              { value: 98, label: 'Satisfaction rate', suffix: '%' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div className="lp-stat-num"><Counter target={s.value} />{s.suffix}</div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <Reveal>
            <div className="lp-section-tag">Everything you need</div>
            <h2 className="lp-section-title">One platform.<br />Every classroom tool.</h2>
            <p className="lp-section-sub">Stop switching between apps. Skooly puts your content, students, and grades in one place.</p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="lp-features-grid">
              {[
                { icon: '📝', title: 'Rich notes', desc: 'Write beautifully formatted lesson notes with headings, bullet points, code blocks and more.' },
                { icon: '🧠', title: 'Auto-graded quizzes', desc: 'Build quizzes in minutes. Students get instant results. You get a full score breakdown.' },
                { icon: '📎', title: 'Assignment submissions', desc: 'Students upload files or write answers directly. Review and score in one place.' },
                { icon: '📊', title: 'Progress tracking', desc: 'See exactly where each student stands across every quiz and assignment.' },
                { icon: '📣', title: 'Announcements', desc: 'Post class updates instantly — Zoom links, deadline reminders, or pinned notices.' },
                { icon: '⏰', title: 'Scheduling', desc: 'Schedule content to open and close at specific times. Students see a countdown.' },
              ].map((f, i) => (
                <Reveal key={f.title} delay={i * 0.05}>
                  <div className="lp-feature-card">
                    <div className="lp-feature-icon">{f.icon}</div>
                    <h3 className="lp-feature-title">{f.title}</h3>
                    <p className="lp-feature-desc">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* App screenshots */}
      <section className="lp-section lp-mockup-section" id="see-it">
        <div className="lp-section-inner">
          <div className="lp-mockup-grid">
            <Reveal>
              <div className="lp-section-tag">See it in action</div>
              <h2 className="lp-section-title">Your dashboard, your way</h2>
              <p className="lp-section-sub" style={{ marginBottom: '1.5rem' }}>
                Get a clear view of all your classes, student counts, and content at a glance. Colour-code each class with a custom icon.
              </p>
              <p style={{ fontSize: '0.8rem', color: '#aaa', fontStyle: 'italic' }}>← Interactive — click the quiz options</p>
            </Reveal>
            <Reveal delay={0.1}>
              <DashboardMockup />
            </Reveal>
          </div>

          <div className="lp-mockup-grid" style={{ marginTop: '5rem' }}>
            <Reveal delay={0.1}>
              <QuizMockup />
            </Reveal>
            <Reveal>
              <div className="lp-section-tag">For students</div>
              <h2 className="lp-section-title">Quizzes that give instant feedback</h2>
              <p className="lp-section-sub">
                Students know immediately if they got it right. Wrong answers show the correct one — so learning happens at the moment of confusion.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Teacher + Student */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <Reveal style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <div className="lp-section-tag" style={{ textAlign: 'center' }}>Built for everyone</div>
            <h2 className="lp-section-title" style={{ textAlign: 'center' }}>For teachers. For students.</h2>
          </Reveal>
          <div className="lp-audience-grid">
            <Reveal>
              <div className="lp-audience-card" style={{ background: '#fafbff', borderColor: '#e0e5ff' }}>
                <div className="lp-audience-tag tag-teacher">👩‍🏫 Teachers</div>
                <h3 className="lp-audience-title">Set up in minutes</h3>
                <p className="lp-audience-desc">No training. No manuals. Just create a class and share the join code.</p>
                <ul className="lp-audience-list">
                  {['Create classes with a unique code', 'Build quizzes in under 2 minutes', 'Review all submissions in one place', 'Schedule content for future dates', 'Send announcements instantly'].map(i => (
                    <li key={i} className="li-t"><span>{i}</span></li>
                  ))}
                </ul>
                <Link to="/teacher/signup" className="btn-audience-t">Start teaching free →</Link>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="lp-audience-card" style={{ background: '#f0fdf8', borderColor: '#c6f0de' }}>
                <div className="lp-audience-tag tag-student">🎓 Students</div>
                <h3 className="lp-audience-title">Learning made simple</h3>
                <p className="lp-audience-desc">Join with a code, find everything in one place, see your grades instantly.</p>
                <ul className="lp-audience-list">
                  {['Join any class with a 7-character code', 'Read lesson notes anytime', 'Take quizzes and see scores instantly', 'Submit assignments from your phone', 'Never miss a class announcement'].map(i => (
                    <li key={i} className="li-s"><span>{i}</span></li>
                  ))}
                </ul>
                <Link to="/student/login" className="btn-audience-s">Join a class →</Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section" style={{ background: '#fff', borderTop: '1px solid #e5e5e0' }} id="faq">
        <div className="lp-section-inner" style={{ textAlign: 'center' }}>
          <Reveal>
            <div className="lp-section-tag">FAQ</div>
            <h2 className="lp-section-title">Common questions</h2>
          </Reveal>
          <div className="lp-faq">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 0.04}>
                <div className="lp-faq-item">
                  <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    {faq.q}
                    <span className="lp-faq-icon" style={{ transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
                  </button>
                  {openFaq === i && <div className="lp-faq-a">{faq.a}</div>}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta-section">
        <Reveal>
          <h2 className="lp-cta-title">Ready to run a better classroom?</h2>
          <p className="lp-cta-sub">Free for teachers. Free forever for students. No credit card required.</p>
          <Link to="/teacher/signup" className="btn-cta-white">
            Create your first class
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
            </svg>
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer>
        <div className="lp-footer">
          <div className="lp-footer-brand">
            <img src="/logo.png" alt="Skooly" />
            <span>Skooly</span>
          </div>
          <div className="lp-footer-links">
            <Link to="/teacher/signup">Sign up</Link>
            <Link to="/teacher/login">Teacher login</Link>
            <Link to="/student/login">Student login</Link>
            <a href="#faq">FAQ</a>
          </div>
          <div className="lp-footer-copy">© {new Date().getFullYear()} Skooly</div>
        </div>
      </footer>
    </div>
  )
}