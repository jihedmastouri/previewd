import { readFile, statSync, createReadStream } from 'fs';
import { readdir } from 'fs/promises';
import { join, relative, dirname, extname, sep } from 'path';
import { exec } from 'child_process';
import matter from 'gray-matter';
import {
	generateBreadcrumb,
	defaultTemplate,
	generateHtmlMetadata,
} from './templates.js';
import { buffer } from 'stream/consumers';

/**
 * Handles serving a generic file with the specified content type.
 * @param {http.ServerResponse} res - The response object.
 * @param {string} contentType - The content type of the file.
 * @param {string} filePath - The path to the file.
 */
export function handleGenericFile(res, contentType, filePath) {
	readFile(filePath, (err, data) => {
		if (err) {
			console.error(err);
			res.writeHead(404, { 'Content-Type': contentType });
			res.end('File not found.');
			return;
		}
		res.writeHead(200, { 'Content-Type': contentType });
		res.end(data);
	});
}

/**
 * Generates an HTML list item for a file or directory.
 * @param {string} dirPath - The directory path.
 * @param {string} file - The file name.
 * @param {string} basePath - The base path.
 * @returns {Promise<string>} The generated HTML.
 */
async function generateListItem(dirPath, file, basePath) {
	const fullPath = join(dirPath, file);
	const link =
		'/' +
		relative(basePath, fullPath)
			.split(sep)
			.map(encodeURIComponent)
			.join('/');
	const stats = statSync(fullPath);
	const ext = extname(file).toLowerCase();
	const preview = await createPreviewContent(file, stats, ext);
	const target = stats.isDirectory()
		? ''
		: ext === '.pdf' || ext === '.json' || ext === '.html'
			? ' target="_blank"'
			: '';

	let rawLink = '';
	if (
		!stats.isDirectory() &&
		ext !== '.pdf' &&
		ext !== '.json' &&
		ext !== '.html' &&
		preview !== 'Empty file'
	) {
		rawLink = ` <a href="/raw${link}" target="_blank" style="margin-left: 10px; font-size: 0.8em;">raw ↗</a>`;
	}
	const filenameDisplay =
		ext === '.pdf' || ext === '.json' || ext === '.html'
			? `↗ ${file}`
			: file;
	return `
<div class="file-item">
	<a href="${link}"${target} title="${file}">
		<div class="preview">${preview}</div>
		<div class="filename">${filenameDisplay}</div>
	</a>${rawLink}
</div>
	`;
}

/**
 * Generates HTML list for directory contents.
 * @param {string} dirPath - The directory path.
 * @param {Array<string>} files - List of files in the directory.
 * @param {string} basePath - The base path.
 * @param {boolean} isDirectoryInit - Whether initialized from directory.
 * @returns {Promise<string>} The generated HTML.
 */
export async function generateDirList(
	dirPath,
	files,
	basePath,
	isDirectoryInit
) {
	// Separate directories and files
	const directories = [];
	const fileItems = [];

	files.forEach((file) => {
		const fullPath = join(dirPath, file);
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
			directories.push(file);
		} else {
			fileItems.push(file);
		}
	});

	// Sort both arrays alphabetically
	directories.sort();
	fileItems.sort();

	// Generate HTML for files first, then directories
	const fileHtml = (
		await Promise.allSettled(
			fileItems.map((file) => generateListItem(dirPath, file, basePath))
		)
	)
		.map((result) => (result.status === 'fulfilled' ? result.value : ''))
		.join('');

	const dirHtml = (
		await Promise.allSettled(
			directories.map((file) => generateListItem(dirPath, file, basePath))
		)
	)
		.map((result) => (result.status === 'fulfilled' ? result.value : ''))
		.join('');

	const breadcrumb = generateBreadcrumb(dirPath);
	let content = breadcrumb;

	if (fileHtml) {
		content += `<h2>Files</h2><div class="directory-grid">${fileHtml}</div>`;
	}

	if (dirHtml) {
		content += `<h2>Directories</h2><div class="directory-grid">${dirHtml}</div>`;
	}

	return content;
}

/**
 * Handles directory requests by generating and serving directory listing.
 * @param {http.ServerResponse} res - The response object.
 * @param {string} requestedPath - The requested directory path.
 * @param {string} basePath - The base path.
 * @param {boolean} isDirectoryInit - Whether initialized from directory.
 * @param {string} format - The content type format.
 * @param {string} internalPrefix - The CSS prefix for internal files.
 */
export async function handleDirectory(
	res,
	requestedPath,
	basePath,
	isDirectoryInit,
	format,
	internalPrefix
) {
	try {
		const files = await readdir(requestedPath);
		const html = await generateDirList(
			requestedPath,
			files,
			basePath,
			isDirectoryInit
		);
		const contentType = format || 'text/html';
		res.writeHead(200, { 'Content-Type': contentType });
		res.end(
			defaultTemplate(
				html,
				`Directory: ${relative(process.cwd(), requestedPath) || '.'}`,
				'',
				isDirectoryInit,
				internalPrefix
			)
		);
	} catch (err) {
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end('Error reading directory.');
	}
}

/**
 * Handles LaTeX file requests by converting to HTML using pandoc.
 * @param {http.ServerResponse} res - The response object.
 * @param {string} requestedPath - The path to the LaTeX file.
 * @param {boolean} isDirectoryInit - Whether initialized from directory.
 * @param {string} format - The content type format.
 * @param {string} internalPrefix - The CSS prefix for internal files.
 */
export function handleLaTeXFile(
	res,
	requestedPath,
	isDirectoryInit,
	format,
	internalPrefix
) {
	exec(
		`pandoc -f latex -t html "${requestedPath}"`,
		(err, stdout, stderr) => {
			if (err) {
				res.writeHead(500, {
					'Content-Type': 'text/plain',
				});
				const errorMsg =
					stderr ||
					'Pandoc not found or failed to convert. Please ensure pandoc is installed and available in your PATH.';
				res.end('Error converting LaTeX: ' + errorMsg);
				return;
			}
			const bodyMatch = stdout.match(/<body[^>]*>(.*)<\/body>/s);
			const content = bodyMatch ? bodyMatch[1] : stdout;
			const title = relative(process.cwd(), requestedPath);
			const navigation = isDirectoryInit
				? generateBreadcrumb(dirname(requestedPath))
				: '';
			const contentType = format || 'text/html';
			res.writeHead(200, { 'Content-Type': contentType });
			res.end(
				defaultTemplate(
					content,
					title,
					navigation,
					isDirectoryInit,
					internalPrefix
				)
			);
		}
	);
}

/**
 * Handles HTML file requests by serving raw HTML with optional refresh script.
 * @param {http.ServerResponse} res - The response object.
 * @param {string} requestedPath - The path to the HTML file.
 * @param {string} internalPrefix - The CSS prefix for internal files.
 */
export function handleHtmlFile(res, requestedPath, internalPrefix) {
	readFile(requestedPath, (err, data) => {
		if (err) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('File not found.');
			return;
		}
		let html = data.toString();
		const refreshScript = `<script>
				const evtSource = new EventSource('/events');
				evtSource.onmessage = function(event) {
					if (event.data === 'refresh') {
						location.reload();
					}
				};
			</script>`;
		if (html.includes('</body>')) {
			html = html.replace('</body>', refreshScript + '</body>');
		} else {
			html += refreshScript;
		}
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(html);
	});
}

/**
 * Handles Markdown file requests by rendering to HTML.
 * @param {http.ServerResponse} res - The response object.
 * @param {string} requestedPath - The path to the Markdown file.
 * @param {string} basePath - The base path for serving files.
 * @param {markdownit} md - The markdown-it instance.
 * @param {boolean} isDirectoryInit - Whether initialized from directory.
 * @param {string} format - The content type format.
 * @param {string} internalPrefix - The CSS prefix for internal files.
 */
export function handleMarkdownFile(
	res,
	requestedPath,
	md,
	isDirectoryInit,
	format,
	internalPrefix
) {
	readFile(requestedPath, (err, data) => {
		if (err) {
			res.writeHead(404, {
				'Content-Type': 'text/plain',
			});
			res.end('File not found.');
			return;
		}
		const { content, data: metadata } = matter(data.toString());
		let parsedHtml = md.render(content);
		let metadataHtml = generateHtmlMetadata(metadata);
		const fullContent = metadataHtml + parsedHtml;
		const title = metadata.title || relative(process.cwd(), requestedPath);
		const navigation = isDirectoryInit
			? generateBreadcrumb(dirname(requestedPath))
			: '';
		const contentType = format || 'text/html';
		res.writeHead(200, { 'Content-Type': contentType });
		res.end(
			defaultTemplate(
				fullContent,
				title,
				navigation,
				isDirectoryInit,
				internalPrefix
			)
		);
	});
}

/**
 * Reads a chunk of a file as a string.
 * @param {string} path - The file path.
 * @param {AbortController} [abortController] - Optional abort controller.
 * @param {number} [chunkSize=67108864] - The chunk size in bytes.
 * @returns {Promise<string>} The file content as a string.
 */
async function readChunk(
	path,
	abortController = undefined,
	chunkSize = 64 * 1024 * 1024
) {
	const rl = createReadStream(path, {
		encoding: 'utf8',
		highWaterMark: chunkSize,
		autoClose: true,
		...(abortController ? { signal: abortController } : {}),
	});

	const buf = await buffer(rl);
	return buf.toString();
}

/**
 * Creates preview content for a file based on its type and content.
 * @param {string} file - The file path.
 * @param {fs.Stats} stats - The file stats.
 * @param {string} ext - The file extension.
 * @returns {Promise<string>} The preview content.
 */
async function createPreviewContent(file, stats, ext) {
	if (stats.isDirectory()) return 'Directory';

	const noPreviewFiles = {
		'.pdf': 'PDF Document',
		'.tex': 'LaTeX Document',
	};

	const textFiles = {
		'.md': 'Markdown Document',
		'.txt': 'Text Document',
	};

	if (Object.keys(noPreviewFiles).includes(ext)) {
		return noPreviewFiles[ext] || 'FILE';
	}

	let content = '';
	try {
		content = await readChunk(file);
	} catch {
		return 'FILE';
	}

	if (content.length == 0) return 'Empty File';

	if (Object.keys(textFiles).includes(ext)) {
		return content;
	}

	return `<pre>${content}</pre>`;
}
