import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
	title: 'Мое портфолио',
	description: 'Сайт-портфолио разработчика',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="ru">
			<body className={inter.className}>
				<header className="bg-gray-800 text-white p-4">
					<nav className="container mx-auto">
						<ul className="flex gap-6">
							<li><a href="/" className="hover:text-blue-300">Главная</a></li>
							<li><a href="/about" className="hover:text-blue-300">Обо мне</a></li>
							<li><a href="/blog" className="hover:text-blue-300">Блог</a></li>
							<li><a href="/projects" className="hover:text-blue-300">Проекты</a></li>
						</ul>
					</nav>
				</header>
				<main className="container mx-auto p-4">
					{children}
				</main>
				<footer className="bg-gray-800 text-white p-4 text-center">
					<p>© Мое портфолио. Все права защищены.</p>
				</footer>
			</body>
		</html>
	)
}
