import { groq } from 'next-sanity'

const postFields = groq`
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  readTime,
  seoTitle,
  seoDescription,
  coverImage{
    alt,
    crop,
    hotspot,
    asset,
    "dimensions": asset->metadata.dimensions{
      width,
      height
    }
  },
  category->{
    title,
    "slug": slug.current
  },
  author->{
    name,
    bio,
    avatar{
      alt,
      asset
    }
  },
  body
`

export const allPublishedPostsQuery = groq`
  *[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    !(_id in path("drafts.**"))
  ] | order(publishedAt desc) {
    ${postFields}
  }
`

export const postBySlugQuery = groq`
  *[
    _type == "post" &&
    slug.current == $slug &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    !(_id in path("drafts.**"))
  ][0]{
    ${postFields}
  }
`

export const relatedPostsQuery = groq`
  *[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    !(_id in path("drafts.**")) &&
    _id != $postId &&
    category->slug.current == $categorySlug
  ] | order(publishedAt desc)[0...$limit] {
    ${postFields}
  }
`

export const fallbackRelatedPostsQuery = groq`
  *[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    !(_id in path("drafts.**")) &&
    _id != $postId
  ] | order(publishedAt desc)[0...$limit] {
    ${postFields}
  }
`

export const blogSlugsQuery = groq`
  *[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    publishedAt <= now() &&
    !(_id in path("drafts.**"))
  ]{
    "slug": slug.current
  }
`

export const blogCategoriesQuery = groq`
  *[_type == "category"] | order(title asc) {
    title,
    "slug": slug.current
  }
`
