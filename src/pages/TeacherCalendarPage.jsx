import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import CreateContentModal from '../components/content/CreateContentModal'

const TODAY = new Date()
const todayKey = TODAY.toISOString().slice(0, 10)

function toKey(date) { return new Date(date).toISOString().slice(0, 10) }
function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function fmtDateLong(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

const TYPE_CONFIG = {
  reminder: { label: 'Reminder', color: '#7C3AED', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
  task:     { label: 'Task',     color: '#D97706', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  event:    { label: 'Event',    color: '#0891B2', bg: 'bg-cyan-50',   text: 'text-cyan-700',   dot: 'bg-cyan-400'  },
}

const CONTENT_COLORS = {
  quiz:       { dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Quiz' },
  assignment: { dot: 'bg-pink-400',  bg: 'bg-pink-50',  text: 'text-pink-700',  label: 'Assignment' },
  note:       { dot: 'bg-green-400', bg: 'bg-green-50', text: 'text-green-700', label: 'Note' },
}

// ── Add Personal Item Modal ───────────────────────────────────────────────────
function ItemModal({ initial, defaultDate, onSave, onDelete, onClose }) {
  const isEdit = !!initial?.id
  const [type, setType] = useState(initial?.type || 'reminder')
  const [title, setTitle] = useState(initial?.title || '')
  const [date, setDate] = useState(initial?.date || defaultDate || todayKey)
  const [time, setTime] = useState(initial?.time || '')
  const [note, setNote] = useState(initial?.note || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError] = useState('')
  const titleRef = useRef()
  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 60) }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true); setSaveError('')
    try { await onSave({ id: initial?.id, type, title: title.trim(), date, time, note: note.trim() }) }
    catch (err) { setSaveError(err?.message || 'Failed to save.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit item' : 'Add to calendar'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="flex gap-2">
            {Object.entries(TYPE_CONFIG).map(([t, cfg]) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${type === t ? 'border-current' : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                style={type === t ? { color: cfg.color, background: cfg.color + '18', borderColor: cfg.color } : {}}>
                {t === 'reminder' ? '🔔' : t === 'task' ? '✅' : '📅'} {cfg.label}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Title <span className="text-red-400">*</span></label>
            <input ref={titleRef} className="input" placeholder="e.g. Grade papers" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div><label className="label">Time <span className="text-gray-400 font-normal">(opt)</span></label><input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} /></div>
          </div>
          <div>
            <label className="label">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="input resize-none" rows={2} value={note} onChange={e => setNote(e.target.value)} />
          </div>
          {saveError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">{saveError}</div>}
          <div className="flex gap-2 pt-1">
            {isEdit && !confirmDelete && (
              <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-ghost text-red-500 hover:bg-red-50 text-sm px-3">Delete</button>
            )}
            {isEdit && confirmDelete && (
              <button type="button" onClick={async () => { setDeleting(true); await onDelete(initial.id); setDeleting(false) }} disabled={deleting}
                className="btn btn-danger text-sm px-3">{deleting ? 'Deleting...' : 'Confirm delete'}</button>
            )}
            <button type="submit" disabled={saving || !title.trim()} className="btn btn-primary flex-1 text-sm">
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add to calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Quick Content Create — pick classes then open CreateContentModal ──────────
function QuickContentModal({ defaultDate, spaces, onClose, onCreated }) {
  const [selectedSpaces, setSelectedSpaces] = useState([])
  const [step, setStep] = useState('pick') // 'pick' | 'create'
  const [currentSpaceIdx, setCurrentSpaceIdx] = useState(0)
  const [results, setResults] = useState([]) // { spaceName, success }

  function toggleSpace(id) {
    setSelectedSpaces(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  if (step === 'create') {
    const spaceId = selectedSpaces[currentSpaceIdx]
    const space = spaces.find(s => s.id === spaceId)
    return (
      <CreateContentModal
        spaceId={spaceId}
        defaultDate={defaultDate}
        onClose={() => {
          if (currentSpaceIdx + 1 < selectedSpaces.length) {
            setCurrentSpaceIdx(i => i + 1)
          } else {
            onClose()
          }
        }}
        onCreated={() => {
          setResults(prev => [...prev, { spaceName: space?.name, success: true }])
          if (currentSpaceIdx + 1 < selectedSpaces.length) {
            setCurrentSpaceIdx(i => i + 1)
          } else {
            onCreated()
            onClose()
          }
        }}
        headerNote={selectedSpaces.length > 1
          ? `Creating for ${space?.name} (${currentSpaceIdx + 1}/${selectedSpaces.length})`
          : null}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add content</h2>
            <p className="text-xs text-gray-400 mt-0.5">For {new Date(defaultDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Select classes <span className="text-gray-400 font-normal">(select one or more)</span></label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {spaces.map(space => {
                const selected = selectedSpaces.includes(space.id)
                return (
                  <button key={space.id} type="button" onClick={() => toggleSpace(space.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selected ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${selected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'}`}>
                      {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: space.cover_color || '#4F46E5' }}>
                      {space.icon || '📚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{space.name}</p>
                      <p className="text-xs text-gray-400">{space.subject || 'No subject'}</p>
                    </div>
                  </button>
                )
              })}
              {spaces.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No classes yet.</p>}
            </div>
          </div>
          <button onClick={() => setStep('create')} disabled={selectedSpaces.length === 0}
            className="btn btn-primary w-full text-sm">
            Continue — create content {selectedSpaces.length > 1 ? `for ${selectedSpaces.length} classes` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Calendar Item Row ─────────────────────────────────────────────────────────
function CalItem({ item, onEdit }) {
  const cfg = item._class
    ? (CONTENT_COLORS[item.content_type] || CONTENT_COLORS.note)
    : (TYPE_CONFIG[item.type] || TYPE_CONFIG.reminder)
  const isLink = item._class && item.space_id && item.content_id
  const Wrapper = isLink ? Link : 'div'
  const wrapperProps = isLink
    ? { to: `/teacher/spaces/${item.space_id}/content/${item.content_id}` }
    : { onClick: !item._class ? () => onEdit(item) : undefined, style: !item._class ? { cursor: 'pointer' } : {} }

  return (
    <Wrapper {...wrapperProps}
      className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-gray-50 group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-600 transition-colors">{item.title}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
            {item._class ? cfg.label : cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.time && <span className="text-xs text-gray-400">{fmtTime('2000-01-01T' + item.time)}</span>}
          {item.spaceName && <span className="text-xs text-gray-400 truncate">{item.spaceName}</span>}
          {item.note && <span className="text-xs text-gray-400 truncate">{item.note}</span>}
        </div>
      </div>
      <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-400 flex-shrink-0 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {isLink
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          : <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
        }
      </svg>
    </Wrapper>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeacherCalendarPage() {
  const { user } = useAuth()
  const [viewDate, setViewDate] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [personalItems, setPersonalItems] = useState([])
  const [classItems, setClassItems] = useState([])
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)        // null | { mode: 'personal'|'edit', ... }
  const [contentModal, setContentModal] = useState(null) // null | { date }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [personalRes, spacesRes] = await Promise.all([
      supabase.from('teacher_calendar_items').select('*').eq('teacher_id', user.id).order('date').order('time'),
      supabase.from('spaces').select('id, name, subject, icon, cover_color').eq('teacher_id', user.id).order('created_at'),
    ])
    setPersonalItems(personalRes.data || [])
    const spaceList = spacesRes.data || []
    setSpaces(spaceList)

    if (spaceList.length > 0) {
      const spaceIds = spaceList.map(s => s.id)
      const spaceMap = Object.fromEntries(spaceList.map(s => [s.id, s.name]))
      const { data: contentData } = await supabase.from('content')
        .select('id, title, type, due_at, available_from, space_id')
        .in('space_id', spaceIds)
        .or('due_at.not.is.null,available_from.not.is.null')
      const items = (contentData || []).flatMap(c => {
        const out = []
        if (c.due_at) out.push({ id: c.id + '-due', content_id: c.id, space_id: c.space_id, title: `${c.title} due`, content_type: c.type, _class: true, _date: toKey(c.due_at), time: new Date(c.due_at).toTimeString().slice(0,5), spaceName: spaceMap[c.space_id], kind: 'due' })
        if (c.available_from) out.push({ id: c.id + '-start', content_id: c.id, space_id: c.space_id, title: `${c.title} opens`, content_type: c.type, _class: true, _date: toKey(c.available_from), time: new Date(c.available_from).toTimeString().slice(0,5), spaceName: spaceMap[c.space_id], kind: 'start' })
        return out
      })
      setClassItems(items)
    }
    setLoading(false)
  }

  // Build item map
  const itemMap = {}
  classItems.forEach(item => {
    const key = item._date
    if (!itemMap[key]) itemMap[key] = []
    itemMap[key].push(item)
  })
  personalItems.forEach(item => {
    const key = item.date
    if (!itemMap[key]) itemMap[key] = []
    itemMap[key].push({ ...item, _personal: true, type: item.type || 'reminder' })
  })

  // Build grid
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: prevMonthDays - firstDay + i + 1, current: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: true, dateStr, items: itemMap[dateStr] || [], isToday: dateStr === todayKey })
  }
  for (let i = 1; i <= 42 - cells.length; i++) cells.push({ day: i, current: false })

  const selectedItems = selectedDate ? (itemMap[selectedDate] || []) : []

  async function handleSavePersonal({ id, type, title, date, time, note }) {
    if (id) {
      const { data, error } = await supabase.from('teacher_calendar_items')
        .update({ type, title, date, time: time || null, note: note || null })
        .eq('id', id).eq('teacher_id', user.id).select().single()
      if (error) throw error
      setPersonalItems(prev => prev.map(i => i.id === id ? data : i))
    } else {
      const { data, error } = await supabase.from('teacher_calendar_items')
        .insert({ teacher_id: user.id, type, title, date, time: time || null, note: note || null })
        .select().single()
      if (error) throw error
      setPersonalItems(prev => [...prev, data])
    }
    setSelectedDate(date)
    setModal(null)
  }

  async function handleDeletePersonal(id) {
    await supabase.from('teacher_calendar_items').delete().eq('id', id).eq('teacher_id', user.id)
    setPersonalItems(prev => prev.filter(i => i.id !== id))
    setModal(null)
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {modal?.mode === 'personal' && (
        <ItemModal defaultDate={modal.defaultDate || selectedDate || todayKey}
          onSave={handleSavePersonal} onDelete={handleDeletePersonal} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <ItemModal initial={modal.item}
          onSave={handleSavePersonal} onDelete={handleDeletePersonal} onClose={() => setModal(null)} />
      )}
      {contentModal && (
        <QuickContentModal
          defaultDate={contentModal.date}
          spaces={spaces}
          onClose={() => setContentModal(null)}
          onCreated={() => { fetchAll(); setContentModal(null) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Your schedule, classes, and deadlines</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal({ mode: 'personal', defaultDate: selectedDate || todayKey })}
            className="btn btn-secondary text-sm gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span className="hidden sm:inline">Add reminder</span>
          </button>
          <button onClick={() => setContentModal({ date: selectedDate || todayKey })}
            className="btn btn-primary text-sm gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span className="hidden sm:inline">Add content</span>
            <span className="sm:hidden">Content</span>
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Calendar grid */}
        <div className="card p-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => { setViewDate(new Date(year, month - 1, 1)); setSelectedDate(null) }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={() => { setViewDate(new Date(year, month + 1, 1)); setSelectedDate(null) }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            <span className="text-sm font-semibold text-gray-900 flex-1">{monthName}</span>
            <button onClick={() => { setViewDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)); setSelectedDate(todayKey) }}
              className="text-xs text-brand-600 font-medium hover:underline">Today</button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const isSelected = cell.dateStr === selectedDate
              const hasClass = cell.items?.some(x => x._class)
              const hasPersonal = cell.items?.some(x => !x._class)
              return (
                <button key={i} disabled={!cell.current}
                  onClick={() => cell.current && setSelectedDate(prev => prev === cell.dateStr ? null : cell.dateStr)}
                  className={['relative flex flex-col items-center p-1 min-h-[52px] sm:min-h-[64px] rounded-xl transition-colors text-left w-full',
                    !cell.current ? 'cursor-default' : 'hover:bg-gray-50',
                    isSelected ? 'bg-brand-50 ring-2 ring-brand-400 ring-inset' : '',
                  ].join(' ')}>
                  <span className={['w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium',
                    !cell.current ? 'text-gray-300' : 'text-gray-700',
                    cell.isToday ? 'bg-brand-600 text-white font-bold' : '',
                    isSelected && !cell.isToday ? 'text-brand-700 font-semibold' : '',
                  ].join(' ')}>{cell.day}</span>
                  {cell.current && cell.items?.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {hasClass && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      {hasPersonal && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                    </div>
                  )}
                  <div className="hidden sm:block w-full mt-0.5 space-y-0.5 overflow-hidden">
                    {cell.items?.slice(0, 2).map((item, ii) => {
                      const cfg = item._class ? (CONTENT_COLORS[item.content_type] || CONTENT_COLORS.note) : (TYPE_CONFIG[item.type] || TYPE_CONFIG.reminder)
                      return (
                        <div key={ii} className={`text-xs px-1 py-0.5 rounded truncate font-medium ${cfg.bg} ${cfg.text}`}>{item.title}</div>
                      )
                    })}
                    {cell.items?.length > 2 && <div className="text-xs text-gray-400 px-1">+{cell.items.length - 2} more</div>}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-xs text-gray-400">Class content</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-400"/><span className="text-xs text-gray-400">Personal</span></div>
          </div>
        </div>

        {/* Day detail sidebar */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="card p-4 sticky top-6">
            {selectedDate ? (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</p>
                    <p className="text-lg font-bold text-gray-900 leading-tight">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ mode: 'personal', defaultDate: selectedDate })}
                      className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors" title="Add reminder">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    </button>
                    <button onClick={() => setContentModal({ date: selectedDate })}
                      className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 hover:bg-brand-100 transition-colors" title="Add content for this date">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </button>
                  </div>
                </div>
                {selectedItems.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"/></svg>
                    </div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Nothing scheduled</p>
                    <button onClick={() => setContentModal({ date: selectedDate })} className="text-xs text-brand-600 font-medium hover:underline mt-1">+ Add content for this day</button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {selectedItems.sort((a,b) => (a.time||'').localeCompare(b.time||'')).map((item, i) => (
                      <div key={i} className="py-1"><CalItem item={item} onEdit={item => setModal({ mode: 'edit', item })} /></div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center"><p className="text-xs text-gray-400">Click a day to see its items</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile day panel */}
      {selectedDate && (
        <div className="lg:hidden mt-4 card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">{fmtDateLong(selectedDate)}</p>
            <div className="flex gap-2">
              <button onClick={() => setModal({ mode: 'personal', defaultDate: selectedDate })} className="btn btn-secondary text-xs py-1.5 px-2.5">+ Reminder</button>
              <button onClick={() => setContentModal({ date: selectedDate })} className="btn btn-primary text-xs py-1.5 px-2.5">+ Content</button>
            </div>
          </div>
          {selectedItems.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">Nothing here. Add a reminder or content.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedItems.sort((a,b) => (a.time||'').localeCompare(b.time||'')).map((item, i) => (
                <div key={i} className="py-1"><CalItem item={item} onEdit={item => setModal({ mode: 'edit', item })} /></div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <div className="text-center py-10 text-sm text-gray-400">Loading calendar...</div>}
    </div>
  )
}
