export default function AboutPage() {
	return (
		<div className="max-w-3xl mx-auto">
			<h1 className="text-3xl font-bold mb-6">Обо мне</h1>
			<div className="bg-white p-6 rounded-lg shadow-lg mb-6">
				<h2 className="text-xl font-semibold mb-3">Навыки</h2>
				<ul className="list-disc pl-5 space-y-1">
					<li>JavaScript/TypeScript</li>
					<li>React & Next.js</li>
					<li>HTML, CSS, Tailwind CSS</li>
					<li>Node.js</li>
					<li>Работа с REST API</li>
				</ul>
			</div>
			<div className="bg-white p-6 rounded-lg shadow-lg">
				<h2 className="text-xl font-semibold mb-3">Опыт работы</h2>
				<div className="space-y-4">
					<div>
						<strong>Frontend Developer</strong> — 2025-2026<br />
						Разработка SPA и SSR-приложений на React/Next.js
					</div>
					<div>
						<strong>Web-разработчик (фриланс)</strong> — 2024-2025<br />
						Верстка, интеграция, поддержка сайтов
					</div>
				</div>
			</div>
		</div>
	)
}
