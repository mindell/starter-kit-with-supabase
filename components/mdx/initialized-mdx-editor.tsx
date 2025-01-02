'use client'

import type { ForwardedRef } from 'react'
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  toolbarPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  directivesPlugin,
  frontmatterPlugin,
  KitchenSinkToolbar
} from '@mdxeditor/editor'
import '@/styles/mdx-editor.css'

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return (
    <div className="mdx-editor-wrapper">
      <MDXEditor
        plugins={[
          // Toolbar
          toolbarPlugin({
            toolbarContents: () => <KitchenSinkToolbar />
          }),
          
          // Core plugins
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          
          // Advanced plugins
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          codeBlockPlugin(),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: 'JavaScript',
              ts: 'TypeScript',
              css: 'CSS',
              html: 'HTML',
              json: 'JSON',
              md: 'Markdown'
            }
          }),
          diffSourcePlugin(),
          directivesPlugin(),
          frontmatterPlugin()
        ]}
        {...props}
        ref={editorRef}
        contentEditableClassName="prose max-w-none"
        className="mdx-editor"
        aria-label="MDX Editor"
        role="textbox"
        aria-multiline="true"
      />
    </div>
  )
}
