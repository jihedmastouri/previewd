import { relative } from 'path';

export function generateBreadcrumb(dirPath) {
	const relPath = relative(process.cwd(), dirPath) || '.';
	if (relPath === '.') {
		return '<h1>Directory: <a href="/">root</a></h1>';
	} else {
		const parts = relPath.split('/');
		let currentPath = '';
		const links = parts
			.map((part, index) => {
				currentPath += (index > 0 ? '/' : '') + part;
				return `<a href="/${currentPath}">${part}</a>`;
			})
			.join(' / ');
		return `<h1>Directory: ${links}</h1>`;
	}
}

export function defaultTemplate(
	content,
	title,
	navigation = '',
	isDirectoryInit = false
) {
	const directoryCSS = isDirectoryInit
		? '<link rel="stylesheet" href="/directory.css">'
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
  </body>
</html>
`;
}