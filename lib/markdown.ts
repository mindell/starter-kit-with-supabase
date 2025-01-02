import MarkdownIt from "markdown-it"

export const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})

export function htmlToMarkdown(html: string): string {
  // Convert <p> to regular text
  let markdown = html.replace(/<p>(.*?)<\/p>/g, "$1\n\n")

  // Convert <strong> to **
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, "**$1**")

  // Convert <em> to *
  markdown = markdown.replace(/<em>(.*?)<\/em>/g, "*$1*")

  // Convert <ul> and <li>
  markdown = markdown.replace(/<ul>(.*?)<\/ul>/gs, (_, list) => {
    return list
      .replace(/<li>(.*?)<\/li>/g, "- $1\n")
      .trim()
      .concat("\n\n")
  })

  // Convert <ol> and <li>
  markdown = markdown.replace(/<ol>(.*?)<\/ol>/gs, (_, list) => {
    let index = 1
    return list
      .replace(/<li>(.*?)<\/li>/g, () => `${index++}. $1\n`)
      .trim()
      .concat("\n\n")
  })

  // Convert <blockquote>
  markdown = markdown.replace(
    /<blockquote>(.*?)<\/blockquote>/gs,
    (_, content) => `> ${content.trim()}\n\n`
  )

  // Convert <a>
  markdown = markdown.replace(
    /<a href="(.*?)">(.*?)<\/a>/g,
    (_, href, text) => `[${text}](${href})`
  )

  // Clean up extra newlines
  markdown = markdown.replace(/\n\s*\n\s*\n/g, "\n\n").trim()

  return markdown
}

export function markdownToHtml(markdown: string): string {
  return md.render(markdown)
}
