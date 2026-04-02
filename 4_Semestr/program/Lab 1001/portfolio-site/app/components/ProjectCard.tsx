interface ProjectCardProps {
	title: string
	description: string
	technologies: string[]
	link?: string
}

export default function ProjectCard({ 
	title, 
	description, 
	technologies,
	link 
}: ProjectCardProps) {
	return (
		<div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
			<h3 className="text-xl font-semibold mb-2">{title}</h3>
			<p className="text-gray-600 mb-4">{description}</p>
			<div className="mb-4">
				<span className="text-sm font-medium">Технологии: </span>
				{technologies.map((tech) => (
					<span key={tech} className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded mr-2 text-xs">{tech}</span>
				))}
			</div>
			{link && (
				<a 
					href={link}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-block text-blue-600 hover:text-blue-800"
				>
					Посмотреть проект →
				</a>
			)}
		</div>
	)
}
