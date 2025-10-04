import { statSync } from 'fs';
import { dirname } from 'path';
import yargs from 'yargs';

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
	const argv = yargs(args)
		.scriptName('previewd')
		.usage('previewd [path] [options]')
		.option('port', {
			alias: 'p',
			type: 'number',
			default: 8601,
			describe: 'Port to run the server on'
		})
		.option('raw', {
			type: 'boolean',
			default: false,
			describe: 'Serve files in raw text mode without rendering'
		})
		.option('format', {
			type: 'string',
			describe: 'Override the default content type (e.g., text/plain, application/json)'
		})
		.option('html', {
			type: 'boolean',
			default: false,
			describe: 'Set content type to text/html'
		})
		.option('refresh', {
			type: 'boolean',
			default: false,
			describe: 'Enable auto-refresh when files change'
		})
		.option('help', {
			alias: 'h',
			type: 'boolean',
			describe: 'Show help'
		})

		.help()
		.epilogue(`
EXAMPLES:
  previewd                    # Preview README.md in current directory
  previewd myfile.md          # Preview specific markdown file
  previewd .                  # Preview current directory
  previewd --port 3000        # Run on port 3000
  previewd --refresh          # Enable live reload
  previewd --raw myfile.txt   # View raw text file

FEATURES:
  • Renders Markdown files with syntax highlighting and frontmatter support
  • Converts LaTeX (.tex) files to HTML (requires pandoc)
  • Access raw files and PDFs
  • Directory browsing with file previews
  • Live reload when files change (--refresh)

The server starts on http://localhost:<port> and automatically opens in your default browser.
`)
		.argv;

	return {
		port: argv.port,
		rawMode: argv.raw,
		pathname: argv._[0] || 'README.md',
		format: argv.format,
		htmlMode: argv.html,
		enableRefresh: argv.refresh,
	};
}


