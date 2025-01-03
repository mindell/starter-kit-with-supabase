'use client'

import type { ForwardedRef } from 'react'
import { MDXEditor } from '@mdxeditor/editor'
import {
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  Separator,
  InsertImage,
  CodeToggle,
  ConditionalContents,
  DiffSourceToggleWrapper,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  directivesPlugin,
  frontmatterPlugin,
  type MDXEditorMethods,
  type MDXEditorProps,
} from '@mdxeditor/editor'

// Custom Toolbar Component
const TwoRowToolbar = () => (
  <div className="flex flex-col space-y-2 p-2 border-b border-gray-200">
    {/* First Row */}
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <UndoRedo />
        <Separator />
        <BoldItalicUnderlineToggles />
        <Separator />
        <BlockTypeSelect />
      </div>
    </div>
    
    {/* Second Row */}
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <CreateLink />
        <InsertImage />
        <InsertTable />
        <Separator />
        <ListsToggle />
        <CodeToggle />
        <InsertThematicBreak />
        <DiffSourceToggleWrapper>
          <ConditionalContents
            options={[
              {
                when: (editor) => editor?.editorType === 'codeblock',
                contents: () => (
                  <>
                    {/* Code-specific controls here if needed */}
                  </>
                )
              }
            ]}
          />
        </DiffSourceToggleWrapper>
      </div>
    </div>
  </div>
)

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
            toolbarContents: () => <TwoRowToolbar />
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
        aria-multiline="true"
      />
    </div>
  )
}
