export interface BlogPost {
	id: number
	title: string
	slug: string
	excerpt: string
	content: string
	date: string
	author: string
}

export const blogPosts: BlogPost[] = [
	{
		id: 1,
		title: 'Введение в Next.js',
		slug: 'introduction-to-nextjs',
		excerpt: 'Основы Next.js и преимущества серверного рендеринга',
		content: 'Полный текст статьи о Next.js...',
		date: '2026-01-15',
		author: 'Иван Иванов'
	},
	{
		id: 2,
		title: 'Почему стоит использовать TypeScript',
		slug: 'why-typescript',
		excerpt: 'Преимущества статической типизации в современных проектах',
		content: 'TypeScript помогает избегать ошибок и ускоряет разработку...',
		date: '2026-02-10',
		author: 'Иван Иванов'
	},
	{
		id: 3,
		title: 'Tailwind CSS для быстрого прототипирования',
		slug: 'tailwind-for-prototyping',
		excerpt: 'Как Tailwind CSS ускоряет создание интерфейсов',
		content: 'Tailwind CSS — это утилитарный CSS-фреймворк...',
		date: '2026-03-01',
		author: 'Иван Иванов'
	}
]
