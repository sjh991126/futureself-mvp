#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['app'];
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'ios', 'android', 'dist', '.expo']);

const ALLOWLIST = [
    /^\/api\/chatbot(\/|$)/,
    /^\/api\/create-payment-intent(\/|$)/,
    /^\/api\/itineraries(\/|$)/,
    /^\/api\/posts\/upload\/image(\/|$)/,
    /^\/api\/categories\/view(\/|$)/,
];

const IGNORE_FILES = new Set([
    'app/src/api/apiVersioning.js',
    'app/src/api/endpoints.js',
]);

const isVersionedPath = (apiPath) => {
    if (!apiPath.startsWith('/api/')) return true;
    if (/^\/api\/v\d+(\/|$)/.test(apiPath)) return true;
    if (/^\/api\/[^/]+\/v\d+(\/|$)/.test(apiPath)) return true;
    if (/^\/api\/[^/]+\/[^/]+\/v\d+(\/|$)/.test(apiPath)) return true;
    return false;
};

const isAllowlisted = (apiPath) => ALLOWLIST.some((regex) => regex.test(apiPath));

const getApiPathFromString = (raw) => {
    if (raw.startsWith('/api/')) {
        const cut = raw.search(/[?#]/);
        return cut >= 0 ? raw.slice(0, cut) : raw;
    }

    if (raw.includes('://')) {
        try {
            const parsed = new URL(raw);
            if (!parsed.pathname.startsWith('/api/')) return null;
            return parsed.pathname;
        } catch {
            return null;
        }
    }

    return null;
};

const walk = (dir, files = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath, files);
            continue;
        }
        if (EXTENSIONS.has(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }
    return files;
};

const findings = [];
const stringRegex = /["'`]([^"'`]*\/api\/[^"'`]*)["'`]/g;

for (const targetDir of TARGET_DIRS) {
    const absTargetDir = path.join(ROOT, targetDir);
    if (!fs.existsSync(absTargetDir)) continue;

    const files = walk(absTargetDir);
    for (const filePath of files) {
        const relativeFilePath = path.relative(ROOT, filePath);
        if (IGNORE_FILES.has(relativeFilePath)) continue;

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            let match;
            while ((match = stringRegex.exec(line)) !== null) {
                const apiPath = getApiPathFromString(match[1]);
                if (!apiPath) continue;
                if (!apiPath.startsWith('/api/')) continue;
                if (isAllowlisted(apiPath)) continue;
                if (isVersionedPath(apiPath)) continue;
                findings.push({
                    filePath: relativeFilePath,
                    line: index + 1,
                    apiPath,
                });
            }
            stringRegex.lastIndex = 0;
        });
    }
}

if (!findings.length) {
    console.log('API versioning check passed: no unversioned /api paths found.');
    process.exit(0);
}

console.error('Found unversioned /api paths:');
for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.line} -> ${finding.apiPath}`);
}
process.exit(1);
