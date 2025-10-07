import { createServer } from 'http';
import { join, extname, isAbsolute } from 'path';
import { homedir } from 'os';
import { stat, watch } from 'fs';
import { exec } from 'child_process';

import {
	handleDirectory,
	handleLaTeXFile,
	handleMarkdownFile,
	handleGenericFile,
	handleHtmlFile,
} from './fileHandlers.js';

import hljs from 'highlight.js';
import markdownit from 'markdown-it';
import { createMathjaxInstance, mathjax } from '@mdit/plugin-mathjax';

const mathjaxInstance = createMathjaxInstance();

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
}).use(mathjax, mathjaxInstance);

const dirname = import.meta.dirname;
const getInternFilePath = (pathname) => join(dirname, '..', pathname);

const randomPrefix = Math.random().toString(36).substring(10);
const internalFiles = Object.freeze({
	[`/${randomPrefix}-bamboo.css`]: {
		format: 'text/css',
		path: getInternFilePath('styles/bamboo/style.min.css'),
	},
	[`/${randomPrefix}-hjs.css`]: {
		format: 'text/css',
		path: getInternFilePath('styles/hjs/github.min.css'),
	},
	[`/${randomPrefix}-hjs-dark.css`]: {
		format: 'text/css',
		path: getInternFilePath('styles/hjs/github-dark.min.css'),
	},
	[`/${randomPrefix}-directory.css`]: {
		format: 'text/css',
		path: getInternFilePath('./styles/directory.css'),
	},
});

const alwaysRaw = Object.freeze({
	'.pdf': 'application/pdf',
	'.json': 'application/json',
	'.html': 'text/html',
});

const imageExts = [
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.webp',
	'.svg',
	'.bmp',
	'.ico',
];

/**
 * Creates an HTTP server for serving files and directories.
 * @param {string} basePath - The base path for serving files.
 * @param {boolean} serveFileOnRoot - Whether to serve a file on root.
 * @param {boolean} isDirectoryInit - Whether initialized from a directory.
 * @param {string} originalPath - The original path provided.
 * @param {boolean} rawMode - Whether to serve in raw mode.
 * @param {string} format - The content type format.
 * @returns {http.Server} The created HTTP server.
 */
export function createAppServer(
	basePath,
	serveFileOnRoot,
	isDirectoryInit,
	originalPath,
	rawMode,
	format
) {
	const clients = new Set();

	const server = createServer((req, res) => {
		if (handlerInternalFiles(req.url, res)) return;

		if (req.url === '/events') {
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
			});
			clients.add(res);
			req.on('close', () => clients.delete(res));
			return;
		}

		if (req.url.startsWith('/raw/')) {
			const rawPath = decodeURIComponent(req.url.slice(5));
			const fullPath = join(basePath, rawPath);
			handleGenericFile(res, 'text/plain', fullPath);
			return;
		}

		let requestedPath;
		if (req.url === '/' && serveFileOnRoot) {
			requestedPath = originalPath;
		} else {
			requestedPath =
				req.url === '/'
					? basePath
					: join(basePath, decodeURIComponent(req.url));
		}

		const ext = extname(requestedPath).toLowerCase();
		if (imageExts.includes(ext)) {
			if (req.url.startsWith('/~')) {
				const path = join(homedir(), req.url.slice(2));
				const mime =
					ext === '.jpg'
						? 'image/jpeg'
						: ext === '.svg'
							? 'image/svg+xml'
							: 'image/' + ext.slice(1);
				handleGenericFile(res, mime, path);
				return;
			}
			// For images, check if req.url exists as absolute path
			stat(req.url, (err, stats) => {
				if (!err && stats.isFile()) {
					requestedPath =
						(req.url || '').length > 0 ? req.url.slice(1) : '';
				}

				if (requestedPath.length > 0 && requestedPath[0] == '~') {
					requestedPath = requestedPath.replace(/~/, homedir());
				}

				const originalPath = isAbsolute(requestedPath)
					? requestedPath
					: join(process.cwd(), requestedPath);

				const mime =
					ext === '.jpg'
						? 'image/jpeg'
						: ext === '.svg'
							? 'image/svg+xml'
							: 'image/' + ext.slice(1);

				handleGenericFile(res, mime, originalPath);
			});
			return;
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
					isDirectoryInit,
					format,
					randomPrefix
				);
				return;
			}

			if (rawMode) {
				handleGenericFile(res, format || 'text/plain', requestedPath);
				return;
			}

			const ext = extname(requestedPath).toLowerCase();
			if (Object.keys(alwaysRaw).includes(ext)) {
				const format = alwaysRaw[ext];
				handleGenericFile(res, format, requestedPath);
				return;
			}

			if (ext === '.html') {
				handleHtmlFile(res, requestedPath, randomPrefix);
				return;
			}

			if (ext === '.tex') {
				handleLaTeXFile(
					res,
					requestedPath,
					isDirectoryInit,
					format,
					randomPrefix
				);
				return;
			}

			handleMarkdownFile(
				res,
				requestedPath,
				md,
				isDirectoryInit,
				format,
				randomPrefix
			);
		});
	});

	const watchedPath = serveFileOnRoot ? originalPath : basePath;
	watch(watchedPath, { recursive: true }, (eventType, filename) => {
		if (eventType === 'change' && filename) {
			clients.forEach((client) => {
				client.write('data: refresh\n\n');
			});
		}
	});

	return server;
}

/**
 * Starts the server on the specified port and opens it in the default browser.
 * @param {http.Server} server - The server to start.
 * @param {number} port - The port to listen on.
 */
export function startServer(server, port) {
	server.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`);
		const initCommand =
			process.platform === 'darwin'
				? 'open'
				: process.platform === 'win32'
					? 'start ""'
					: 'xdg-open';

		exec(`${initCommand} "http://localhost:${port}"`, (err) => {
			if (err) {
				console.error(
					`Failed to open URL \`${err}\`... You gotta go there yourself I guess!`
				);
			}
		});
	});
}

/**
 * Handles requests for internal files like CSS.
 * @param {string} reqUrl - The request URL.
 * @param {http.ServerResponse} res - The response object.
 * @returns {boolean} True if handled, false otherwise.
 */
function handlerInternalFiles(reqUrl, res) {
	if (Object.keys(internalFiles).includes(reqUrl)) {
		const file = internalFiles[reqUrl];
		handleGenericFile(res, file.format, file.path);
		return true;
	}
	return false;
}
