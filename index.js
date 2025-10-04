import { createServer } from 'http';
import { readFile, readFileSync, stat, readdir, statSync } from 'fs';
import { join, relative, dirname, extname } from 'path';
import { exec } from 'child_process';
import { isAbsolute } from 'path';
import markdownit from 'markdown-it';
import hljs from 'highlight.js';
import matter from 'gray-matter';

const md = markdownit({
	highlight: function (str, lang) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(str, { language: lang }).value;
			} catch (__) {}
		}
		return '';
	},
	html: true,
	typographer: true,
	linkify: true,
});

const makeCSSHandler = (res) => (filePath) => {
	readFile(filePath, (err, data) => {
		if (err) {
			console.error(err);
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('File not found.');
			return;
		}
		res.writeHead(200, { 'Content-Type': 'text/css' });
		res.end(data);
	});
};

export function initializePaths(originalPath) {
	let basePath;
	let serveFileOnRoot = false;
	let isDirectoryInit = false;
	try {
		const stats = statSync(originalPath);
		if (stats.isDirectory()) {
			basePath = originalPath;
			isDirectoryInit = true;
		} else {
			basePath = dirname(originalPath);
			serveFileOnRoot = true;
		}
	} catch {
		basePath = process.cwd();
	}
	return { basePath, serveFileOnRoot, isDirectoryInit };
}

let port = 8601;
let rawMode = false;
let pathname = 'README.md';

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
	if (args[i] === '--port' && i + 1 < args.length) {
		const parsedPort = parseInt(args[i + 1]);
		if (!isNaN(parsedPort)) {
			port = parsedPort;
		}
		i++;
	} else if (args[i] === '--raw') {
		rawMode = true;
	} else if (!args[i].startsWith('--')) {
		pathname = args[i];
	}
}

const originalPath = isAbsolute(pathname)
	? pathname
	: join(process.cwd(), pathname);

const { basePath, serveFileOnRoot, isDirectoryInit } =
	initializePaths(originalPath);

const server = createServer((req, res) => {
	const cssFile = makeCSSHandler(res);
	if (req.url === '/bamboo.css') cssFile('./styles/bamboo/style.min.css');
	else if (req.url === '/hjs.css') cssFile('./styles/hjs/github.min.css');
	else if (req.url === '/hjs-dark.css')
		cssFile('./styles/hjs/github-dark.min.css');
	else if (req.url === '/directory.css') cssFile('./styles/directory.css');
	else if (req.url.startsWith('/raw/')) {
		const rawPath = req.url.slice(5);
		const fullPath = join(basePath, rawPath);
		readFile(fullPath, (err, data) => {
			if (err) {
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('File not found.');
				return;
			}
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end(data);
		});
		return;
	} else {
		let requestedPath;
		if (req.url === '/' && serveFileOnRoot) {
			requestedPath = originalPath;
		} else {
			requestedPath =
				req.url === '/' ? basePath : join(basePath, req.url);
		}

		stat(requestedPath, (err, stats) => {
			if (err) {
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('Not found.');
				return;
			}
			if (stats.isDirectory()) {
				readdir(requestedPath, (err, files) => {
					if (err) {
						res.writeHead(500, { 'Content-Type': 'text/plain' });
						res.end('Error reading directory.');
						return;
					}
					const html = generateDirList(requestedPath, files);
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.end(
						defaultTemplate(
							html,
							`Directory: ${relative(process.cwd(), requestedPath) || '.'}`,
							'',
							isDirectoryInit
						)
					);
				});
			} else if (rawMode) {
				readFile(requestedPath, (err, data) => {
					if (err) {
						res.writeHead(404, { 'Content-Type': 'text/plain' });
						res.end('File not found.');
						return;
					}
					res.writeHead(200, { 'Content-Type': 'text/plain' });
					res.end(data);
				});
			} else {
				const ext = extname(requestedPath).toLowerCase();
				if (ext === '.pdf') {
					readFile(requestedPath, (err, data) => {
						if (err) {
							res.writeHead(404, {
								'Content-Type': 'text/plain',
							});
							res.end('File not found.');
							return;
						}
						res.writeHead(200, {
							'Content-Type': 'application/pdf',
						});
						res.end(data);
					});
				} else if (ext === '.tex') {
					exec(
						`pandoc -f latex -t html "${requestedPath}"`,
						(err, stdout, stderr) => {
							if (err) {
								res.writeHead(500, {
									'Content-Type': 'text/plain',
								});
								res.end('Error converting LaTeX: ' + stderr);
								return;
							}
							const bodyMatch = stdout.match(
								/<body[^>]*>(.*)<\/body>/s
							);
							const content = bodyMatch ? bodyMatch[1] : stdout;
							const title = relative(
								process.cwd(),
								requestedPath
							);
							const navigation = isDirectoryInit
								? generateBreadcrumb(dirname(requestedPath))
								: '';
							res.writeHead(200, { 'Content-Type': 'text/html' });
							res.end(
								defaultTemplate(
									content,
									title,
									navigation,
									isDirectoryInit
								)
							);
						}
					);
				} else {
					readFile(requestedPath, (err, data) => {
						if (err) {
							res.writeHead(404, {
								'Content-Type': 'text/plain',
							});
							res.end('File not found.');
							return;
						}
						const { content, data: metadata } = matter(
							data.toString()
						);
						const parsedHtml = md.render(content);
						let metadataHtml = '';
						if (Object.keys(metadata).length > 0) {
							const tableRows = Object.entries(metadata)
								.map(
									([k, v]) =>
										`<tr><td>${k}</td><td>${v}</td></tr>`
								)
								.join('');
							metadataHtml = `
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
						const fullContent = metadataHtml + parsedHtml;
						const title =
							metadata.title ||
							relative(process.cwd(), requestedPath);
						const navigation = isDirectoryInit
							? generateBreadcrumb(dirname(requestedPath))
							: '';
						res.writeHead(200, { 'Content-Type': 'text/html' });
						res.end(
							defaultTemplate(
								fullContent,
								title,
								navigation,
								isDirectoryInit
							)
						);
					});
				}
			}
		});
	}
});

server.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);

	const initCommand =
		process.platform === 'darwin'
			? 'open'
			: process.platform === 'win32'
				? 'start'
				: 'xdg-open';
	exec(`${initCommand} http://localhost:${port}`);
});

function generateDirList(dirPath, files) {
	const items = files
		.map((file) => {
			const fullPath = join(dirPath, file);
			const link = '/' + relative(basePath, fullPath).replace(/\\/g, '/');
			const stats = statSync(fullPath);
			const ext = extname(file).toLowerCase();
			let preview = '';
			if (stats.isDirectory()) {
				preview = 'Directory';
			} else {
				if (ext === '.pdf') {
					preview = 'PDF Document';
				} else if (ext === '.tex') {
					preview = 'LaTeX Document';
				} else if (
					[
						'.txt',
						'.md',
						'.js',
						'.go',
						'.json',
						'.html',
						'.css',
					].includes(ext)
				) {
					try {
						const data = readFileSync(fullPath, 'utf8').substring(
							0,
							200
						);
						preview = data || 'Empty file';
					} catch {
						preview = 'Text file';
					}
				} else {
					preview = ext
						? ext.substring(1).toUpperCase() + ' file'
						: 'File';
				}
			}
			const target = stats.isDirectory()
				? ''
				: ext === '.pdf' || ext === '.json'
					? ' target="_blank"'
					: '';
			let rawLink = '';
			if (!stats.isDirectory() && ext !== '.pdf') {
				rawLink = ` <a href="/raw${link}" target="_blank" style="margin-left: 10px; font-size: 0.8em;">raw</a>`;
			}
			return `
<div class="file-item">
	<a href="${link}"${target}>
		<div class="preview">${preview}</div>
		<div class="filename">${file}</div>
	</a>${rawLink}
</div>
		`;
		})
		.join('');
	const breadcrumb = generateBreadcrumb(dirPath);
	return breadcrumb + `<div class="directory-grid">${items}</div>`;
}

function generateBreadcrumb(dirPath) {
	const relPath = relative(process.cwd(), dirPath) || '.';
	if (relPath === '.') {
		return '<h1>Directory: <a href="/">root</a></h1>';
	} else {
		const parts = relPath.split('/');
		let currentPath = '';
		const links = parts
			.map((part, index) => {
				if (index > 0) currentPath += '/' + part;
				return `<a href="/${currentPath}">${part}</a>`;
			})
			.join(' / ');
		return `<h1>Directory: ${links}</h1>`;
	}
}

function defaultTemplate(
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
