import Link from 'next/link'

export default function NotFound() {
	return (
		<div className="text-center py-12">
			<h1 className="text-4xl font-bold mb-4">Статья не найдена</h1>
			<p className="text-gray-600 mb-8">Запрошенная статья не существует или была удалена</p>
			<Link 
				href="/blog"
				className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
			>
				Вернуться к блогу
			</Link>
		</div>
	)
}
