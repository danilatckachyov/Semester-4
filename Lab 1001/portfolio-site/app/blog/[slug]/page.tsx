import { notFound } from 'next/navigation'
import { blogPosts } from '../data'
import Link from 'next/link'

export async function generateStaticParams() {
	return blogPosts.map((post) => ({
		slug: post.slug,
	}))
}

export default function BlogPostPage({
	params,
}: {
	params: { slug: string }
}) {
	const post = blogPosts.find(p => p.slug === params.slug)
	if (!post) {
		notFound()
	}
	return (
		<article className="max-w-3xl mx-auto">
			<header className="mb-8">
				<h1 className="text-3xl font-bold mb-2">{post.title}</h1>
				<div className="flex justify-between text-gray-600">
					<span>{post.date}</span>
					<span>Автор: {post.author}</span>
				</div>
			</header>
			<div className="prose max-w-none">
				<p className="text-lg mb-4">{post.excerpt}</p>
				<div>{post.content}</div>
			</div>
			<div className="mt-8 pt-4 border-t">
				<Link href="/blog" className="text-blue-600 hover:text-blue-800">
					← Вернуться к списку статей
				</Link>
			</div>
		</article>
	)
}
