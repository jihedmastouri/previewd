A (vibe-coded) CLI tool that lets you preview files and directories in your browser.

- Opens single files or directories.
- Renders Markdown files with syntax highlighting and frontmatter support.
- Converts LaTeX (.tex) files to HTML (requires `pandoc` to be installed).
- Access raw files and PDFs.

## Installation

```bash
npm install -g previewd
```

Or if using pnpm:

```bash
pnpm install -g previewd
```

## Usage

Run the CLI with an optional path to a file or directory:

```bash
preview [path] [--port <number>] [--raw]
```

- If no path is provided, defaults to `README.md` in the current directory.
- If a file is specified, serves that file at the root URL.
- If a directory is specified, serves the directory listing at the root URL.
- `--port <number>`: Specify the port to run the server on (default: 8601).
- `--raw`: Serve files in raw text mode without rendering.

The server starts on `http://localhost:<port>` and automatically opens in your default browser.

---

### Dependencies

- NPM Dependencies:
  - **[markdown-it](https://www.npmjs.com/package/markdown-it)**: Renders Markdown to HTML.
  - **[highlight.js](https://www.npmjs.com/package/highlight.js)**: Provides syntax highlighting for code blocks in Markdown.
  - **[gray-matter](https://www.npmjs.com/package/gray-matter)**: Parses YAML frontmatter from Markdown files.
- CLI Dependencies:
  - **[pandoc](https://pandoc.org/)**: Required for converting LaTeX (.tex) files to HTML (must be installed separately).
