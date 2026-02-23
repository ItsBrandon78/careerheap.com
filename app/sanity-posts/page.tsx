import Link from 'next/link'
import { type SanityDocument } from 'next-sanity'
import { sanityClient } from '@/lib/sanity/client'

const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[0...12]{
  _id,
  title,
  slug,
  publishedAt
}`

const options = { next: { revalidate: 30 } }

export default async function SanityPostsPage() {
  if (!sanityClient) {
    return (
      <main className="container mx-auto min-h-screen max-w-3xl p-8">
        <h1 className="mb-4 text-3xl font-bold text-text-primary">Posts</h1>
        <p className="text-text-secondary">
          Sanity is not configured. Set your `SANITY_PROJECT_ID` and
          `SANITY_DATASET` values in `.env.local`.
        </p>
      </main>
    )
  }

  const posts = await sanityClient.fetch<SanityDocument[]>(
    POSTS_QUERY,
    {},
    options
  )

  return (
    <main className="container mx-auto min-h-screen max-w-3xl p-8">
      <h1 className="mb-8 text-4xl font-bold text-text-primary">Posts</h1>
      <ul className="flex flex-col gap-y-4">
        {posts.map((post) => (
          <li className="hover:underline" key={post._id}>
            <Link href={`/sanity-posts/${post.slug.current}`}>
              <h2 className="text-xl font-semibold text-text-primary">
                {post.title}
              </h2>
              <p className="text-text-secondary">
                {new Date(post.publishedAt).toLocaleDateString()}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
