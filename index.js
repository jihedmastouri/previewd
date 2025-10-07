#!/usr/bin/env node

import { isAbsolute } from 'path';
import { join } from 'path';
import { parseArgs } from './src/utils.js';
import { initializePaths } from './src/utils.js';
import { createAppServer, startServer } from './src/server.js';

const { port, rawMode, pathname, format } = parseArgs(process.argv.slice(2));

const originalPath = isAbsolute(pathname)
	? pathname
	: join(process.cwd(), pathname);
const { basePath, serveFileOnRoot, isDirectoryInit } =
	initializePaths(originalPath);

const server = createAppServer(
	basePath,
	serveFileOnRoot,
	isDirectoryInit,
	originalPath,
	rawMode,
	format
);

startServer(server, port);
