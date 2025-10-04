import { test, describe } from 'node:test';
import assert from 'node:assert';
import { initializePaths } from './index.js';

describe('initializePaths', () => {
	test('should handle directory path', () => {
		const result = initializePaths('/some/dir');
		assert.strictEqual(result.basePath, '/some/dir');
		assert.strictEqual(result.serveFileOnRoot, false);
		assert.strictEqual(result.isDirectoryInit, true);
	});

	test('should handle file path', () => {
		const result = initializePaths('/some/file.md');
		assert.strictEqual(result.basePath, '/some');
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