// Renders HTML from Tiptap safely with proper styling
export default function RichTextRenderer({ html }) {
  if (!html) return <p className="text-gray-400 italic text-sm">No content.</p>

  return (
    <div
      className="rich-text"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
