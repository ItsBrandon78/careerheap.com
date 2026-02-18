import { ToolPageTemplate } from '../page'

interface LockedToolPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function LockedToolPage({ params }: LockedToolPageProps) {
  const { slug } = await params
  return <ToolPageTemplate slug={slug} locked />
}

