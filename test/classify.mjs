
import { readFileSync } from 'fs';

import test from 'tape';

import classify, { STAGING_FIXED_NPM, STAGING_EPOCH } from '#classify';

/** @import { Manifest } from 'pacote' */

/**
 * @typedef {object} Case
 * @property {string} name
 * @property {string} version
 * @property {string} time
 * @property {Manifest} meta
 * @property {{ status: string, code: number }} expected
 */

/** @type {Case[]} */
const cases = JSON.parse(readFileSync(new URL('./fixtures/cases.json', import.meta.url), 'utf8'));

/**
 * a valid Manifest, with per-test overrides
 * @param {Partial<Manifest>} [overrides]
 * @returns {Manifest}
 */
function manifest(overrides) {
	return {
		name: 'demo',
		version: '1.0.0',
		_id: 'demo@1.0.0',
		_nodeVersion: '24.0.0',
		_npmVersion: '11.16.0',
		_npmUser: { name: 'me' },
		maintainers: [{ name: 'me' }],
		dist: { tarball: 'https://example.com/demo.tgz', fileCount: 1, unpackedSize: 1 },
		...overrides,
	};
}

test('real-world fixtures', (t) => {
	cases.forEach((c) => {
		const result = classify(c.meta, c.time);
		const label = `${c.name}@${c.version}`;
		t.equal(result.status, c.expected.status, `${label} status is ${c.expected.status}`);
		t.equal(result.code, c.expected.code, `${label} exit code is ${c.expected.code}`);
		t.ok(result.reason.length > 0, `${label} has a reason`);
	});

	t.end();
});

test('edge cases', (t) => {
	t.equal(classify().status, 'unknown', 'no arguments at all => unknown');

	t.equal(
		classify(manifest({ _npmVersion: '11.15.0' }), 'not-a-date').status,
		'unknown',
		'v11.15, file stats present, unparseable date => unknown',
	);

	t.equal(
		classify(manifest({ dist: { tarball: 'https://example.com/demo.tgz' } }), STAGING_EPOCH).status,
		'staged',
		'no file stats in the staging era => staged (early fingerprint)',
	);

	t.equal(
		classify(manifest({ _npmVersion: '12.0.0' }), undefined).status,
		'not-staged',
		'npm newer than the fixed version, file stats present, no approver => not staged',
	);

	t.equal(
		classify(manifest({ _npmVersion: STAGING_FIXED_NPM }), '2026-06-01T00:00:00.000Z').status,
		'not-staged',
		'npm exactly at the fixed version => not staged',
	);

	t.equal(
		classify(manifest({ _npmVersion: '11.16' }), '2026-06-01T00:00:00.000Z').status,
		'not-staged',
		'two-part npm version (missing patch) still compares >= fixed',
	);

	t.equal(
		classify(manifest({ _npmVersion: '11.15.0' }), '2026-05-26T00:00:00.000Z').status,
		'unknown',
		'npm v11.15 window, file stats present, no approver => unknown',
	);

	t.equal(
		classify(manifest({ _npmVersion: '11.14.0' }), '2026-06-01T00:00:00.000Z').status,
		'not-staged',
		'npm older than 11.15 cannot have staged => not staged',
	);

	t.equal(
		classify(manifest({ _npmVersion: '11.15.0' }), '2014-01-01T00:00:00.000Z').status,
		'not-staged',
		'published before the epoch => not staged',
	);

	t.end();
});
