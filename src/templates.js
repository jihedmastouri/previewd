import { relative, sep } from 'path';

/**
 * Generates breadcrumb navigation HTML for a directory path.
 * @param {string} dirPath - The directory path.
 * @returns {string} The breadcrumb HTML.
 */
export function generateBreadcrumb(dirPath) {
	const relPath = relative(process.cwd(), dirPath) || '.';
	const root = `<a href="/">root</a>`;
	if (relPath === '.') {
		return `<h1>Directory: ${root}</h1>`;
	}
	const parts = relPath.split(sep);
	let currentPath = '';
	const links = parts
		.map((part) => {
			currentPath += '/' + part;
			return `<a href="${currentPath}">${part}</a>`;
		})
		.join(' / ');
	return `<h1>Directory: ${root} / ${links}</h1>`;
}

/**
 * Generates HTML for displaying metadata in a table.
 * @param {Object} metadata - The metadata object.
 * @returns {string} The metadata HTML.
 */
export function generateHtmlMetadata(metadata) {
	if (!metadata || Object.keys(metadata).length === 0) return '';

	const tableRows = Object.entries(metadata)
		.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
		.join('');

	return `
<div class="metadata">
<button onclick="toggleMetadata()">Toggle Metadata</button>
<table id="metadataTable" style="display:none; border-collapse: collapse;">
<thead><tr><th style="border: 1px solid #ccc; padding: 8px;">Key</th><th style="border: 1px solid #ccc; padding: 8px;">Value</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>
<script>
function toggleMetadata() {
  const table = document.getElementById('metadataTable');
  table.style.display = table.style.display === 'none' ? 'table' : 'none';
}
</script>
</div>
`;
}

/**
 * Generates the default HTML template for pages.
 * @param {string} content - The main content.
 * @param {string} title - The page title.
 * @param {string} [navigation=''] - The navigation HTML.
 * @param {boolean} [isDirectoryInit=false] - Whether initialized from directory.
 * @param {string} [internalPrefix=''] - The CSS prefix for internal files.
 * @returns {string} The full HTML template.
 */
export function defaultTemplate(
	content,
	title,
	navigation = '',
	isDirectoryInit = false,
	internalPrefix = ''
) {
	const prefix = internalPrefix ? `${internalPrefix}-` : '';
	const directoryCSS = isDirectoryInit
		? `<link rel="stylesheet" href="/${prefix}directory.css">`
		: '';
	const refreshScript = `<script>
			const evtSource = new EventSource('/events');
			evtSource.onmessage = function(event) {
				if (event.data === 'refresh') {
					location.reload();
				}
			};
		</script>`;
	return `
<html>
  <head>
    <title>${title}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<link rel="stylesheet" href="/${prefix}bamboo.css">
	<link rel="stylesheet" href="/${prefix}hjs.css">
	<link rel="stylesheet" href="/${prefix}hjs-dark.css">
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
