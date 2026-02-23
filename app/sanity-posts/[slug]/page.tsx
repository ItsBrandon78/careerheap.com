import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { PortableText, type SanityDocument } from 'next-sanity'
import { sanityClient } from '@/lib/sanity/client'

const POST_QUERY = `*[_type == "post" && slug.current == $slug][0]`
const options = { next: { revalidate: 30 } }

export default async function SanityPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (!sanityClient) {
    notFound()
  }

  const resolvedParams = await params
  const post = await sanityClient.fetch<SanityDocument>(
    POST_QUERY,
    resolvedParams,
    options
  )

  if (!post) {
    notFound()
  }

  const { projectId, dataset } = sanityClient.config()
  const urlFor = (source: SanityImageSource) =>
    projectId && dataset
      ? imageUrlBuilder({ projectId, dataset }).image(source)
      : null

  const postImageUrl = post.image
    ? urlFor(post.image)?.width(550).height(310).url()
    : null

  return (
    <main className="container mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-8">
      <Link href="/sanity-posts" className="hover:underline">
        Back to posts
      </Link>
      {postImageUrl ? (
        <Image
          src={postImageUrl}
          alt={
            post.title
              ? `${post.title} cover illustration`
              : 'Blog post cover illustration'
          }
          className="aspect-video rounded-xl"
          width={550}
          height={310}
        />
      ) : null}
      <h1 className="mb-2 text-4xl font-bold text-text-primary">{post.title}</h1>
      <div className="space-y-4 text-text-primary">
        {post.publishedAt ? (
          <p className="text-text-secondary">
            Published: {new Date(post.publishedAt).toLocaleDateString()}
          </p>
        ) : null}
        {Array.isArray(post.body) ? <PortableText value={post.body} /> : null}
      </div>
    </main>
  )
}
