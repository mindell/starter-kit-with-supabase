import { useEffect, useRef, useState } from "react"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema } from "prosemirror-model"
import { baseKeymap } from "prosemirror-commands"
import { keymap } from "prosemirror-keymap"
import { history } from "prosemirror-history"
import { EditorToolbar } from "./editor-toolbar"
import { schema, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown"
import { Textarea } from "@/components/ui/textarea"
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis } from "prosemirror-inputrules"

// Markdown input rules
function markdownInputRules(schema: any) {
  const rules = [
    // ** for bold
    wrappingInputRule(/(?:\*\*|__)([^*_]+)(?:\*\*|__)$/, schema.marks.strong),
    
    // * for italic
    wrappingInputRule(/(?:^|[^*_])(?:\*|_)([^*_]+)(?:\*|_)$/, schema.marks.em),
    
    // ` for code
    wrappingInputRule(/`([^`]+)`$/, schema.marks.code),
    
    // Smart quotes, ellipsis, em-dashes
    ...smartQuotes,
    ellipsis,
    emDash,
    
    // Block quotes
    textblockTypeInputRule(/^>\s$/, schema.nodes.blockquote),
    
    // Headings
    textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, match => ({
      level: match[1].length
    })),
    
    // Lists
    wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bullet_list),
    wrappingInputRule(/^\s*(\d+)\.\s$/, schema.nodes.ordered_list),
  ]
  
  return inputRules({ rules })
}

interface ProseMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  mode?: "markdown" | "richtext"
}

// Markdown view component using textarea
function MarkdownView({ 
  value, 
  onChange, 
  onBlur 
}: Omit<ProseMirrorEditorProps, "mode">) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="min-h-[200px] font-mono"
      placeholder="Write your content in markdown..."
    />
  )
}

// Rich text view component using ProseMirror
function RichTextView({ 
  value, 
  onChange, 
  onBlur 
}: Omit<ProseMirrorEditorProps, "mode">) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Create editor view
  useEffect(() => {
    if (!editorRef.current) return

    // Initialize editor state with markdown support
    const state = EditorState.create({
      doc: defaultMarkdownParser.parse(value || ''),
      schema,
      plugins: [
        history(),
        keymap(baseKeymap),
        markdownInputRules(schema) // Add markdown input rules
      ]
    })

    // Create editor view
    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction)
        view.updateState(newState)
        
        if (transaction.docChanged) {
          // Convert document to markdown when content changes
          const markdown = defaultMarkdownSerializer.serialize(newState.doc)
          onChange(markdown)
        }
      },
      handleDOMEvents: {
        blur: () => {
          onBlur?.()
          return false
        }
      }
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, []) // Only create view once

  // Update view when value changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentMarkdown = defaultMarkdownSerializer.serialize(view.state.doc)
    if (currentMarkdown !== value) {
      const newState = EditorState.create({
        doc: defaultMarkdownParser.parse(value || ''),
        schema,
        plugins: view.state.plugins
      })
      view.updateState(newState)
    }
  }, [value]) // Update when value changes

  return (
    <div className="space-y-2 prose">
      <EditorToolbar view={viewRef.current} />
      <div ref={editorRef} className="prosemirror-editor" />
    </div>
  )
}

// Main editor component that switches between views
export function ProseMirrorEditor({ 
  value, 
  onChange, 
  onBlur, 
  mode = "markdown" 
}: ProseMirrorEditorProps) {
  // Use single source of truth - the parent's value
  const handleChange = (newValue: string) => {
    onChange(newValue)
  }

  // Render appropriate view based on mode
  return mode === "markdown" ? (
    <MarkdownView 
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
    />
  ) : (
    <RichTextView
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
    />
  )
}
