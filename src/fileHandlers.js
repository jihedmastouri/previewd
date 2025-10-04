import { readFile, readFileSync, statSync, readdir } from 'fs';
import { join, relative, dirname, extname } from 'path';
import { exec } from 'child_process';
import matter from 'gray-matter';
import { generateBreadcrumb, defaultTemplate } from './templates.js';

export const makeCSSHandler = (res) => (filePath) => {
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

export function generateDirList(dirPath, files, basePath, isDirectoryInit) {
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

export function handleDirectory(res, requestedPath, basePath, isDirectoryInit) {
	readdir(requestedPath, (err, files) => {
		if (err) {
			res.writeHead(500, { 'Content-Type': 'text/plain' });
			res.end('Error reading directory.');
			return;
		}
		const html = generateDirList(requestedPath, files, basePath, isDirectoryInit);
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
}

export function handleRawFile(res, requestedPath) {
	readFile(requestedPath, (err, data) => {
		if (err) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('File not found.');
			return;
		}
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		res.end(data);
	});
}

export function handlePDFFile(res, requestedPath) {
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
}

export function handleLaTeXFile(res, requestedPath, isDirectoryInit) {
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
}

export function handleMarkdownFile(res, requestedPath, md, isDirectoryInit) {
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
