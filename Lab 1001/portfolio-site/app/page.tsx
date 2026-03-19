export default function HomePage() {
	return (
		<div className="text-center py-12">
			<h1 className="text-4xl font-bold mb-4">Добро пожаловать в мое портфолио</h1>
			<p className="text-lg text-gray-600 mb-8">
				Я веб-разработчик, специализирующийся на современных технологиях
			</p>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
				<div className="bg-white p-6 rounded-lg shadow-lg">
					<h2 className="text-xl font-semibold mb-2">Next.js</h2>
					<p className="text-gray-600">Серверный рендеринг и статическая генерация</p>
				</div>
				<div className="bg-white p-6 rounded-lg shadow-lg">
					<h2 className="text-xl font-semibold mb-2">React</h2>
					<p className="text-gray-600">Компонентный подход и хуки</p>
				</div>
				<div className="bg-white p-6 rounded-lg shadow-lg">
					<h2 className="text-xl font-semibold mb-2">TypeScript</h2>
					<p className="text-gray-600">Статическая типизация для надежности</p>
				</div>
			</div>
		</div>
	)
}
