import { test, describe } from 'node:test';
import assert from 'node:assert';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { initializePaths, parseArgs } from '../src/utils.js';
import { generateBreadcrumb, defaultTemplate } from '../src/templates.js';

describe('initializePaths', () => {
	test('should handle directory path', () => {
		const tempDir = join(tmpdir(), 'test-dir');
		mkdirSync(tempDir, { recursive: true });
		const result = initializePaths(tempDir);
		assert.strictEqual(result.basePath, tempDir);
		assert.strictEqual(result.serveFileOnRoot, false);
		assert.strictEqual(result.isDirectoryInit, true);
	});

	test('should handle file path', () => {
		const tempFile = join(tmpdir(), 'test-file.md');
		writeFileSync(tempFile, '# test');
		const result = initializePaths(tempFile);
		assert.strictEqual(result.basePath, tmpdir());
		assert.strictEqual(result.serveFileOnRoot, true);
		assert.strictEqual(result.isDirectoryInit, false);
	});

	test('should handle invalid path', () => {
		const result = initializePaths('/nonexistent');
		assert.strictEqual(result.basePath, process.cwd());
		assert.strictEqual(result.serveFileOnRoot, false);
		assert.strictEqual(result.isDirectoryInit, false);
	});
});

describe('parseArgs', () => {
	test('should parse default args', () => {
		const result = parseArgs([]);
		assert.strictEqual(result.port, 8601);
		assert.strictEqual(result.rawMode, false);
		assert.strictEqual(result.pathname, 'README.md');
		assert.strictEqual(result.format, undefined);
	});

	test('should parse port', () => {
		const result = parseArgs(['--port', '3000']);
		assert.strictEqual(result.port, 3000);
	});

	test('should parse raw mode', () => {
		const result = parseArgs(['--raw']);
		assert.strictEqual(result.rawMode, true);
	});

	test('should parse pathname', () => {
		const result = parseArgs(['test.md']);
		assert.strictEqual(result.pathname, 'test.md');
	});

	test('should parse format', () => {
		const result = parseArgs(['--format', 'text/plain']);
		assert.strictEqual(result.format, 'text/plain');
	});

	test('should parse all args', () => {
		const result = parseArgs([
			'--port',
			'4000',
			'--raw',
			'--format',
			'application/json',
			'file.txt',
		]);
		assert.strictEqual(result.port, 4000);
		assert.strictEqual(result.rawMode, true);
		assert.strictEqual(result.format, 'application/json');
		assert.strictEqual(result.pathname, 'file.txt');
	});
});

describe('generateBreadcrumb', () => {
	test('should generate breadcrumb for root', () => {
		const result = generateBreadcrumb(process.cwd());
		assert(result.includes('<h1>Directory: <a href="/">root</a></h1>'));
	});

	test('should generate breadcrumb for subdirectory', () => {
		const subDir = join(process.cwd(), 'subdir');
		const result = generateBreadcrumb(subDir);
		assert(result.includes('subdir'));
		assert(result.includes('<a href="/subdir">subdir</a>'));
	});
});

describe('defaultTemplate', () => {
	test('should generate HTML template', () => {
		const result = defaultTemplate('<p>content</p>', 'Test Title');
		assert(result.includes('<title>Test Title</title>'));
		assert(result.includes('<p>content</p>'));
		assert(result.includes('/bamboo.css'));
	});

	test('should include directory CSS when isDirectoryInit', () => {
		const result = defaultTemplate(
			'<p>content</p>',
			'Test Title',
			'',
			true
		);
		assert(result.includes('/directory.css'));
	});

	test('should include refresh script when enableRefresh', () => {
		const result = defaultTemplate(
			'<p>content</p>',
			'Test Title',
			'',
			false,
			true
		);
		assert(result.includes('EventSource'));
		assert(result.includes('/events'));
	});
});
