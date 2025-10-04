import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createAppServer } from '../src/server.js';
import { initializePaths } from '../src/utils.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import http from 'http';

function makeRequest(url) {
	return new Promise((resolve, reject) => {
		const req = http.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => resolve({ statusCode: res.statusCode, data }));
		});
		req.on('error', reject);
	});
}

describe('E2E Tests', () => {
	test('should serve directory listing', async () => {
		const tempDir = join(tmpdir(), 'preview-test-dir');
		mkdirSync(tempDir, { recursive: true });
		writeFileSync(join(tempDir, 'test.md'), '# Test');

		const { basePath, serveFileOnRoot, isDirectoryInit } =
			initializePaths(tempDir);
		const server = createAppServer(
			basePath,
			serveFileOnRoot,
			isDirectoryInit,
			tempDir,
			false
		);

		await new Promise((resolve) => server.listen(0, resolve));
		const port = server.address().port;

		try {
			const { statusCode, data } = await makeRequest(
				`http://localhost:${port}/`
			);
			assert.strictEqual(statusCode, 200);
			assert(data.includes('Directory:'));
			assert(data.includes('test.md'));
		} finally {
			server.close();
		}
	});

	test('should serve markdown file', async () => {
		const tempFile = join(tmpdir(), 'test.md');
		writeFileSync(tempFile, '# Hello World');

		const { basePath, serveFileOnRoot, isDirectoryInit } =
			initializePaths(tempFile);
		const server = createAppServer(
			basePath,
			serveFileOnRoot,
			isDirectoryInit,
			tempFile,
			false
		);

		await new Promise((resolve) => server.listen(0, resolve));
		const port = server.address().port;

		try {
			const { statusCode, data } = await makeRequest(
				`http://localhost:${port}/`
			);
			assert.strictEqual(statusCode, 200);
			assert(data.includes('<h1>Hello World</h1>'));
		} finally {
			server.close();
		}
	});
});
