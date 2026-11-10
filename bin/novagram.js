#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.resolve(__dirname, '..', 'server.js');
const child = spawn(process.execPath, [serverPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
});

child.on('error', (error) => {
    console.error('Could not start Novagram:', error.message);
    process.exitCode = 1;
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exitCode = code ?? 0;
});
