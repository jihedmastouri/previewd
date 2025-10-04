import { createServer } from 'http';
import { join, extname } from 'path';
import { stat } from 'fs';
import markdownit from 'markdown-it';
import hljs from 'highlight.js';
import {
	makeCSSHandler,
	handleDirectory,
	handleRawFile,
	handlePDFFile,
	handleLaTeXFile,
	handleMarkdownFile,
} from './fileHandlers.js';

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

export function createAppServer(
	basePath,
	serveFileOnRoot,
	isDirectoryInit,
	originalPath,
	rawMode
) {
	const server = createServer((req, res) => {
		const cssFile = makeCSSHandler(res);
		if (req.url === '/bamboo.css') cssFile('./styles/bamboo/style.min.css');
		else if (req.url === '/hjs.css') cssFile('./styles/hjs/github.min.css');
		else if (req.url === '/hjs-dark.css')
			cssFile('./styles/hjs/github-dark.min.css');
		else if (req.url === '/directory.css')
			cssFile('./styles/directory.css');
		else if (req.url.startsWith('/raw/')) {
			const rawPath = req.url.slice(5);
			const fullPath = join(basePath, rawPath);
			handleRawFile(res, fullPath);
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
					handleDirectory(
						res,
						requestedPath,
						basePath,
						isDirectoryInit
					);
				} else if (rawMode) {
					handleRawFile(res, requestedPath);
				} else {
					const ext = extname(requestedPath).toLowerCase();
					if (ext === '.pdf') {
						handlePDFFile(res, requestedPath);
					} else if (ext === '.tex') {
						handleLaTeXFile(res, requestedPath, isDirectoryInit);
					} else {
						handleMarkdownFile(
							res,
							requestedPath,
							md,
							isDirectoryInit
						);
					}
				}
			});
		}
	});

	return server;
}

export function startServer(server, port) {
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
}

