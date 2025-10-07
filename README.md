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
previewd [path] [options]
```

### Arguments

- `path`: Path to file or directory to preview (default: `README.md`)

### Options

- `-h, --help`: Show help message
- `--port <number>`: Specify the port to run the server on (default: 8601)
- `--raw`: Serve files in raw text mode without rendering
- `--format <content-type>`: Override the default content type (e.g., `text/plain`, `application/json`)

### Examples

```bash
previewd                    # Preview README.md in current directory
previewd myfile.md          # Preview specific markdown file
previewd .                  # Preview current directory
previewd --port 3000        # Run on port 3000
previewd --raw myfile.txt   # View raw text file
previewd --help             # Show help
```

### Behavior

- If no path is provided, defaults to `README.md` in the current directory
- If a file is specified, serves that file at the root URL
- If a directory is specified, serves the directory listing at the root URL
- The server starts on `http://localhost:<port>` and automatically opens in your default browser

---

### Dependencies

- NPM Dependencies:
    - **[yargs](https://www.npmjs.com/package/yargs)**: Handles command-line argument parsing.
    - **[markdown-it](https://www.npmjs.com/package/markdown-it)**: Renders Markdown to HTML.
        - [@mdit/plugin-mathjax](https://www.npmjs.com/package/@mdit/plugin-mathjax): MarkdownIt plugin for displaying math
    - **[highlight.js](https://www.npmjs.com/package/highlight.js)**: Provides syntax highlighting for code blocks in Markdown.
        - **[gray-matter](https://www.npmjs.com/package/gray-matter)**: Parses YAML frontmatter from Markdown files.
- CLI Dependencies:
    - **[pandoc](https://pandoc.org/)**: Required for converting LaTeX (.tex) files to HTML (must be installed separately).

---

This project was done by `grok-code` and [opencode](https://opencode.ai).
