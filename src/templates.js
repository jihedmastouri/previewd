import { relative } from 'path';

export function generateBreadcrumb(dirPath) {
	const relPath = relative(process.cwd(), dirPath) || '.';
	if (relPath === '.') {
		return `<h1>Directory: <a href="/">root</a></h1>`;
	}
	const parts = relPath.split('/');
	let currentPath = '';
	const links = parts
		.map((part) => {
			currentPath += '/' + part;
			return `<a href="${currentPath}">${part}</a>`;
		})
		.join(' / ');
	return `<h1>Directory: ${links}</h1>`;
}

export function defaultTemplate(
	content,
	title,
	navigation = '',
	isDirectoryInit = false,
	enableRefresh = false
) {
	const directoryCSS = isDirectoryInit
		? '<link rel="stylesheet" href="/directory.css">'
		: '';
	const refreshScript = enableRefresh
		? `<script>
			const evtSource = new EventSource('/events');
			evtSource.onmessage = function(event) {
				if (event.data === 'refresh') {
					location.reload();
				}
			};
		</script>`
		: '';
	return `
<html>
  <head>
    <title>${title}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<link rel="stylesheet" href="/bamboo.css">
	<link rel="stylesheet" href="/hjs.css">
	<link rel="stylesheet" href="/hjs-dark.css">
	${directoryCSS}
  </head>
  <body>
    ${navigation}
    <main class="content">${content}</main>
	${refreshScript}
  </body>
</html>
`;
}
