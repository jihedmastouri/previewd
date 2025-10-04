import { createServer } from 'http';
import { readFile } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { isAbsolute } from 'path';
import markdownit from 'markdown-it';
import hljs from 'highlight.js';

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

const port = 8601;
const pathname =
	process.argv.length >= 2 ? process.argv.slice(2).join() : 'README.md';

const server = createServer((req, res) => {
	const cssFile = makeCSSHandler(res);
	if (req.url === '/bamboo.css') cssFile('./bamboo/style.min.css');
	else if (req.url === '/hjs.css') cssFile('./hjs/github.min.css');
	else if (req.url === '/hjs-dark.css') cssFile('./hjs/github-dark.min.css');
	else {
		const filePath = isAbsolute(pathname)
			? pathname
			: join(process.cwd(), pathname);

		readFile(filePath, async (err, data) => {
			if (err) {
				console.error(err);
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('File not found.');
				return;
			}
			const parsedHtml = md.render(data.toString());
			res.writeHead(200, { 'Content-Type': 'text/html' });
			res.end(defaultTemplate(parsedHtml, filePath));
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

function defaultTemplate(content, title) {
	return `
<html>
  <head>
    <title>${title}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<link rel="stylesheet" href="/bamboo.css">
	<link rel="stylesheet" href="/hjs.css">
	<link rel="stylesheet" href="/hjs-dark.css">
  </head>
  <body>
    <main class="content">${content}</main>
  </body>
</html>
`;
}
