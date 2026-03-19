import ProjectCard from '../components/ProjectCard'

const projects = [
	{
		title: 'Интернет-магазин',
		description: 'Полнофункциональный интернет-магазин с корзиной и оплатой',
		technologies: ['Next.js', 'TypeScript', 'Stripe'],
		link: 'https://example.com'
	},
	{
		title: 'Личный блог',
		description: 'Платформа для публикации статей и заметок',
		technologies: ['Next.js', 'Tailwind CSS'],
		link: 'https://example.com/blog'
	},
	{
		title: 'Портфолио',
		description: 'Сайт-портфолио для демонстрации проектов',
		technologies: ['React', 'TypeScript'],
		link: 'https://example.com/portfolio'
	}
]

export default function ProjectsPage() {
	return (
		<div>
			<h1 className="text-3xl font-bold mb-8">Мои проекты</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{projects.map((project) => (
					<ProjectCard key={project.title} {...project} />
				))}
			</div>
		</div>
	)
}
