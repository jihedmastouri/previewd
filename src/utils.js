import { statSync } from 'fs';
import { dirname } from 'path';

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

export function parseArgs(args) {
	let port = 8601;
	let rawMode = false;
	let pathname = 'README.md';

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

	return { port, rawMode, pathname };
}
