import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────
const TODAY = new Date()
const todayKey = TODAY.toISOString().slice(0, 10)

function toKey(date) { return new Date(date).toISOString().slice(0, 10) }
function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function fmtDateLong(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

const TYPE_CONFIG = {
  reminder: { label: 'Reminder', color: '#7C3AED', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
  task:     { label: 'Task',     color: '#D97706', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  event:    { label: 'Event',    color: '#0891B2', bg: 'bg-cyan-50',   text: 'text-cyan-700',   dot: 'bg-cyan-400'  },
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
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
    setSaving(true)
    setSaveError('')
    try {
      await onSave({ id: initial?.id, type, title: title.trim(), date, time, note: note.trim() })
    } catch (err) {
      setSaveError(err?.message || 'Failed to save. Make sure the calendar table exists in Supabase.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete(initial.id)
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle — mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit item' : 'Add to calendar'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {Object.entries(TYPE_CONFIG).map(([t, cfg]) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${type === t ? 'border-current' : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                style={type === t ? { color: cfg.color, background: cfg.color + '18', borderColor: cfg.color } : {}}>
                {t === 'reminder' ? '🔔' : t === 'task' ? '✅' : '📅'} {cfg.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="label">Title <span className="text-red-400">*</span></label>
            <input ref={titleRef} className="input" placeholder={
              type === 'reminder' ? 'e.g. Study for Biology exam'
              : type === 'task' ? 'e.g. Finish Math assignment'
              : 'e.g. Parent-teacher meeting'
            } value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Time <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="label">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="input resize-none" rows={2} placeholder="Any extra details..."
              value={note} onChange={e => setNote(e.target.value)} />
          </div>

          {/* Actions */}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
              {saveError}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            {isEdit && !confirmDelete && (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="btn btn-ghost text-red-500 hover:bg-red-50 text-sm px-3">
                Delete
              </button>
            )}
            {isEdit && confirmDelete && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="btn btn-danger text-sm px-3">
                {deleting ? 'Deleting...' : 'Confirm delete'}
              </button>
            )}
            <button type="submit" disabled={saving || !title.trim()}
              className="btn btn-primary flex-1 text-sm">
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add to calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Calendar Item Row ─────────────────────────────────────────────────────────
function CalItem({ item, onEdit }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.reminder
  const isLink = item.space_id && item.content_id
  const Wrapper = isLink ? Link : 'div'
  const wrapperProps = isLink
    ? { to: `/student/spaces/${item.space_id}/content/${item.content_id}` }
    : { onClick: item._personal ? () => onEdit(item) : undefined, style: item._personal ? { cursor: 'pointer' } : {} }

  return (
    <Wrapper {...wrapperProps}
      className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors group ${item._personal ? 'hover:bg-gray-50' : isLink ? 'hover:bg-gray-50' : ''}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-violet-600 transition-colors">
            {item.title}
          </p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.time && <span className="text-xs text-gray-400">{fmtTime('2000-01-01T' + item.time)}</span>}
          {item.spaceName && <span className="text-xs text-gray-400 truncate">{item.spaceName}</span>}
          {item.note && <span className="text-xs text-gray-400 truncate">{item.note}</span>}
        </div>
      </div>
      {item._personal && (
        <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-400 flex-shrink-0 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
        </svg>
      )}
      {isLink && (
        <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-400 flex-shrink-0 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      )}
    </Wrapper>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentCalendarPage() {
  const { user } = useAuth()
  const [viewDate, setViewDate] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [personalItems, setPersonalItems] = useState([])   // from supabase
  const [classItems, setClassItems] = useState([])          // quizzes/assignments
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)  // null | { mode: 'add'|'edit', item?: {} }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [personalRes, enrollRes] = await Promise.all([
      supabase.from('student_calendar_items').select('*').eq('student_id', user.id).order('date').order('time'),
      supabase.from('enrollments').select('space_id, spaces(id, name)').eq('student_id', user.id).eq('status', 'active'),
    ])

    if (personalRes.error) console.warn('Calendar table error (run the SQL migration):', personalRes.error.message)
    setPersonalItems(personalRes.data || [])

    const enrollments = enrollRes.data || []
    const spaceIds = enrollments.map(e => e.space_id)
    const spaceMap = Object.fromEntries(enrollments.map(e => [e.space_id, e.spaces?.name]))

    if (spaceIds.length > 0) {
      const [contentRes] = await Promise.all([
        supabase.from('content').select('id, title, type, due_at, available_from, space_id')
          .in('space_id', spaceIds).in('type', ['quiz', 'assignment'])
          .not('due_at', 'is', null),
      ])
      const items = (contentRes.data || []).flatMap(c => {
        const out = []
        if (c.due_at) out.push({ ...c, _date: toKey(c.due_at), _time: new Date(c.due_at).toTimeString().slice(0,5), kind: 'due', type: c.type === 'quiz' ? 'reminder' : 'task', title: c.title, spaceName: spaceMap[c.space_id], content_id: c.id })
        if (c.available_from) out.push({ ...c, _date: toKey(c.available_from), _time: new Date(c.available_from).toTimeString().slice(0,5), kind: 'start', type: 'event', title: `${c.title} opens`, spaceName: spaceMap[c.space_id], content_id: c.id })
        return out
      })
      setClassItems(items)
    }
    setLoading(false)
  }

  // Merge all items into a date map
  const itemMap = {}
  classItems.forEach(item => {
    const key = item._date
    if (!itemMap[key]) itemMap[key] = []
    itemMap[key].push({ ...item, time: item._time })
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

  async function handleSave({ id, type, title, date, time, note }) {
    try {
      if (id) {
        const { data, error } = await supabase.from('student_calendar_items')
          .update({ type, title, date, time: time || null, note: note || null })
          .eq('id', id).eq('student_id', user.id).select().single()
        if (error) throw error
        if (data) setPersonalItems(prev => prev.map(i => i.id === id ? data : i))
      } else {
        const { data, error } = await supabase.from('student_calendar_items')
          .insert({ student_id: user.id, type, title, date, time: time || null, note: note || null })
          .select().single()
        if (error) throw error
        if (data) setPersonalItems(prev => [...prev, data])
      }
      setSelectedDate(date)
      setModal(null)
    } catch (err) {
      console.error('Calendar save error:', err)
      // Surface a user-friendly error inside the modal via a thrown string
      throw err
    }
  }

  async function handleDelete(id) {
    await supabase.from('student_calendar_items').delete().eq('id', id).eq('student_id', user.id)
    setPersonalItems(prev => prev.filter(i => i.id !== id))
    setModal(null)
  }

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); setSelectedDate(null) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); setSelectedDate(null) }
  function goToday() { setViewDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)); setSelectedDate(todayKey) }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Modal */}
      {modal && (
        <ItemModal
          initial={modal.item}
          defaultDate={modal.defaultDate || selectedDate || todayKey}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">My calendar</h1>
          <p className="page-subtitle">Assignments, reminders, tasks and events</p>
        </div>
        <button onClick={() => setModal({ mode: 'add', defaultDate: selectedDate || todayKey })}
          className="btn btn-primary text-sm gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          <span className="hidden sm:inline">Add item</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Main two-column layout */}
      <div className="flex gap-5 items-start">

        {/* ── Calendar grid ── */}
        <div className="card p-4 flex-1 min-w-0">
          {/* Month nav */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            <span className="text-sm font-semibold text-gray-900 flex-1">{monthName}</span>
            <button onClick={goToday} className="text-xs text-violet-600 font-medium hover:underline">Today</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const isSelected = cell.dateStr === selectedDate
              const hasPersonal = cell.items?.some(x => x._personal)
              const hasClass = cell.items?.some(x => !x._personal)
              return (
                <button
                  key={i}
                  disabled={!cell.current}
                  onClick={() => cell.current && setSelectedDate(prev => prev === cell.dateStr ? null : cell.dateStr)}
                  className={[
                    'relative flex flex-col items-center p-1 min-h-[52px] sm:min-h-[64px] rounded-xl transition-colors text-left w-full',
                    !cell.current ? 'cursor-default' : 'hover:bg-gray-50',
                    isSelected ? 'bg-violet-50 ring-2 ring-violet-400 ring-inset' : '',
                  ].join(' ')}
                >
                  {/* Day number */}
                  <span className={[
                    'w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors',
                    !cell.current ? 'text-gray-300' : 'text-gray-700',
                    cell.isToday ? 'bg-violet-600 text-white font-bold' : '',
                    isSelected && !cell.isToday ? 'text-violet-700 font-semibold' : '',
                  ].join(' ')}>
                    {cell.day}
                  </span>

                  {/* Event dots */}
                  {cell.current && cell.items?.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {hasClass && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      {hasPersonal && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                    </div>
                  )}

                  {/* Item preview — desktop only */}
                  <div className="hidden sm:block w-full mt-0.5 space-y-0.5 overflow-hidden">
                    {cell.items?.slice(0, 2).map((item, ii) => {
                      const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.reminder
                      return (
                        <div key={ii} className={`text-xs px-1 py-0.5 rounded truncate font-medium ${cfg.bg} ${cfg.text}`}>
                          {item.title}
                        </div>
                      )
                    })}
                    {cell.items?.length > 2 && (
                      <div className="text-xs text-gray-400 px-1">+{cell.items.length - 2} more</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-xs text-gray-400">Class item</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-400" /><span className="text-xs text-gray-400">Personal</span></div>
          </div>
        </div>

        {/* ── Day detail sidebar ── */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="card p-4 sticky top-6">
            {selectedDate ? (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                    <p className="text-lg font-bold text-gray-900 leading-tight">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => setModal({ mode: 'add', defaultDate: selectedDate })}
                    className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 hover:bg-violet-100 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                  </button>
                </div>

                {selectedItems.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"/></svg>
                    </div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Nothing scheduled</p>
                    <p className="text-xs text-gray-400 mb-3">Tap + to add something</p>
                    <button onClick={() => setModal({ mode: 'add', defaultDate: selectedDate })}
                      className="text-xs text-violet-600 font-medium hover:underline">
                      + Add reminder, task or event
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {selectedItems
                      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                      .map((item, i) => (
                        <div key={i} className="py-1">
                          <CalItem item={item} onEdit={item => setModal({ mode: 'edit', item })} />
                        </div>
                      ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs text-gray-400">Click a day to see its items</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile: selected day panel below calendar ── */}
      {selectedDate && (
        <div className="lg:hidden mt-4 card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">{fmtDateLong(selectedDate)}</p>
            <button onClick={() => setModal({ mode: 'add', defaultDate: selectedDate })}
              className="btn btn-primary text-xs py-1.5 px-3">
              + Add
            </button>
          </div>
          {selectedItems.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">Nothing here. Tap Add to create a reminder, task or event.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedItems
                .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                .map((item, i) => (
                  <div key={i} className="py-1">
                    <CalItem item={item} onEdit={item => setModal({ mode: 'edit', item })} />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming personal items ── */}
      {!loading && personalItems.length > 0 && (() => {
        const upcoming = personalItems
          .filter(i => i.date >= todayKey)
          .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
          .slice(0, 8)
        if (!upcoming.length) return null
        return (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Upcoming personal items</h2>
            <div className="card divide-y divide-gray-50 overflow-hidden">
              {upcoming.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setModal({ mode: 'edit', item })}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${(TYPE_CONFIG[item.type] || TYPE_CONFIG.reminder).dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {item.time ? ` · ${fmtTime('2000-01-01T' + item.time)}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${(TYPE_CONFIG[item.type] || TYPE_CONFIG.reminder).bg} ${(TYPE_CONFIG[item.type] || TYPE_CONFIG.reminder).text}`}>
                    {(TYPE_CONFIG[item.type] || TYPE_CONFIG.reminder).label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {loading && (
        <div className="text-center py-10 text-sm text-gray-400">Loading calendar...</div>
      )}
    </div>
  )
}