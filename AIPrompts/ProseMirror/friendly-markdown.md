Friendly Markdown
Imagine you have a site that allows users to enter comments, and you've decided to use Markdown for the comment input. Your target group mostly knows how to use Markdown, and finds it convenient. But you may also have some non-technical users, for whom learning arcane syntactic rules does not come naturally.

Without changing anything in your backend, you can drop in ProseMirror as an alternative input editor. People can even switch between both views as they are editing!

This is a comment written in [Markdown]. *You* may know the syntax for inserting a link, but does your whole audience?

So you can give people the **choice** to use a more familiar, discoverable interface.
Markdown     WYSIWYM
The prosemirror-markdown package defines a ProseMirror schema that can express exactly the things that can be expressed in Markdown. It also comes with a parser and serializer that convert documents in this schema to and from Markdown text.

To abstract the actual editor, we first create a simple interface around a textarea:

class MarkdownView {
  constructor(target, content) {
    this.textarea = target.appendChild(document.createElement("textarea"))
    this.textarea.value = content
  }

  get content() { return this.textarea.value }
  focus() { this.textarea.focus() }
  destroy() { this.textarea.remove() }
}
And then implement the same interface for a Markdown-enabled ProseMirror instance. The in- and output of this interface is still Markdown text, which it internally converts to a ProseMirror document.

import {EditorView} from "prosemirror-view"
import {EditorState} from "prosemirror-state"
import {schema, defaultMarkdownParser,
        defaultMarkdownSerializer} from "prosemirror-markdown"
import {exampleSetup} from "prosemirror-example-setup"

class ProseMirrorView {
  constructor(target, content) {
    this.view = new EditorView(target, {
      state: EditorState.create({
        doc: defaultMarkdownParser.parse(content),
        plugins: exampleSetup({schema})
      })
    })
  }

  get content() {
    return defaultMarkdownSerializer.serialize(this.view.state.doc)
  }
  focus() { this.view.focus() }
  destroy() { this.view.destroy() }
}
Finally, we can wire up some radio buttons to allow users to switch between these two representations.

let place = document.querySelector("#editor")
let view = new MarkdownView(place, document.querySelector("#content").value)

document.querySelectorAll("input[type=radio]").forEach(button => {
  button.addEventListener("change", () => {
    if (!button.checked) return
    let View = button.value == "markdown" ? MarkdownView : ProseMirrorView
    if (view instanceof View) return
    let content = view.content
    view.destroy()
    view = new View(place, content)
    view.focus()
  })
})
