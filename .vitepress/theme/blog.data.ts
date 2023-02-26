import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { createMarkdownRenderer, MarkdownRenderer } from 'vitepress'
import { fileURLToPath } from 'url'

let md: MarkdownRenderer
const dirname = path.dirname(fileURLToPath(import.meta.url))
const postDir = path.resolve(dirname, '../../blog')

export interface Post {
  title: string
  href: string
  date: {
    time: number
    string: string
  }
  description: string | undefined
  data?: Record<string, any>
}

interface PostWithData extends Post {
  data: Record<string, any>
}

declare const data: Post[]
export { data }

async function load(): Promise<Post[]>
async function load(asFeed: boolean): Promise<PostWithData[]>
async function load(asFeed = false) {
  md = md || (await createMarkdownRenderer(process.cwd()))
  return fs
    .readdirSync(postDir)
    .map((file) => getArticle(file, postDir, asFeed))
    .sort((a, b) => b.date.time - a.date.time)
}

export default {
  watch: path.join(postDir, '*.md'),
  load
}

const cache = new Map()

function getArticle(file: string, postDir: string, asFeed = false): Post {
  const fullPath = path.join(postDir, file)
  const timestamp = fs.statSync(fullPath).mtimeMs

  const cached = cache.get(fullPath)
  if (cached && timestamp === cached.timestamp) {
    return cached.post
  }

  const src = fs.readFileSync(fullPath, 'utf-8')
  const { data } = matter(src)

  const post: Post = {
    title: data.title,
    href: `/blog/${file.replace(/\.md$/, '.html')}`,
    date: formatDate(data.date),
    description: data.description && md.render(data.description)
  }
  if (asFeed) {
    // only attach these when building the RSS feed to avoid bloating the client bundle size
    post.data = data
  }

  cache.set(fullPath, {
    timestamp,
    post: post
  })

  return post
}

function formatDate(date: string | Date): Post['date'] {
  if (!(date instanceof Date)) {
    date = new Date(date)
  }
  date.setUTCHours(12)
  return {
    time: +date,
    string: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}
