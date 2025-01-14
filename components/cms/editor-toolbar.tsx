import { EditorView } from "prosemirror-view"
import { toggleMark, wrapIn, /*lift, selectParentNode*/ } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { Button } from "@/components/ui/button"
import { 
  Bold, 
  Italic, 
  Code, 
  Link, 
  Undo, 
  Redo, 
  List, 
  ListOrdered, 
  Quote,
  /* Box */
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface EditorToolbarProps {
  view: EditorView | null
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  title: string
  onClick: () => void
  disabled?: boolean
}

function ToolbarButton({ icon, title, onClick, disabled }: ToolbarButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className="h-8 w-8"
            disabled={disabled}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function EditorToolbar({ view }: EditorToolbarProps) {
  if (!view) return null

  const runCommand = (command: any) => {
    return () => {
      command(view.state, view.dispatch, view)
    }
  }

  const toggleMarkCommand = (markType: string) => {
    const mark = view.state.schema.marks[markType]
    return runCommand(toggleMark(mark))
  }

  const wrapInCommand = (nodeType: string) => {
    const node = view.state.schema.nodes[nodeType]
    return runCommand(wrapIn(node))
  }

  const canUndo = () => undo(view.state)
  const canRedo = () => redo(view.state)

  return (
    <div className="flex items-center gap-1 p-1 mb-2 border rounded-md bg-background">
      {/* Text formatting */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        title="Toggle bold"
        onClick={toggleMarkCommand("strong")}
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        title="Toggle italic"
        onClick={toggleMarkCommand("em")}
      />
      <ToolbarButton
        icon={<Code className="h-4 w-4" />}
        title="Toggle code"
        onClick={toggleMarkCommand("code")}
      />
      <ToolbarButton
        icon={<Link className="h-4 w-4" />}
        title="Add or remove link"
        onClick={toggleMarkCommand("link")}
      />

      <div className="w-px h-4 bg-border mx-1" />

      {/* History */}
      <ToolbarButton
        icon={<Undo className="h-4 w-4" />}
        title="Undo"
        onClick={runCommand(undo)}
        disabled={!canUndo()}
      />
      <ToolbarButton
        icon={<Redo className="h-4 w-4" />}
        title="Redo"
        onClick={runCommand(redo)}
        disabled={!canRedo()}
      />

      <div className="w-px h-4 bg-border mx-1" />

      {/* Lists and quotes */}
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        title="Wrap in bullet list"
        onClick={wrapInCommand("bullet_list")}
      />
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        title="Wrap in ordered list"
        onClick={wrapInCommand("ordered_list")}
      />
      <ToolbarButton
        icon={<Quote className="h-4 w-4" />}
        title="Wrap in block quote"
        onClick={wrapInCommand("blockquote")}
      />

      <div className="w-px h-4 bg-border mx-1" />

      {/* Node selection */}
      {
        /*
          <ToolbarButton
            icon={<Box className="h-4 w-4" />}
            title="Select parent node"
            onClick={runCommand(selectParentNode)}
        />
        */
      }
    </div>
  )
}
