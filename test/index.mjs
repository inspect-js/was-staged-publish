
import test from 'tape';

import wasStagedPublish from '#index';
import classify from '#classify';

/** @import { Packument } from 'pacote' */

/** @type {Packument} */
const packument = {
	name: 'demo',
	'dist-tags': { latest: '1.0.0', next: '2.0.0' },
	maintainers: [{ name: 'me' }],
	time: {
		created: '2026-06-01T00:00:00.000Z',
		modified: '2026-06-02T00:00:00.000Z',
		'1.0.0': '2026-06-01T00:00:00.000Z',
		'2.0.0': '2026-06-02T00:00:00.000Z',
	},
	versions: {
		'1.0.0': {
			name: 'demo',
			version: '1.0.0',
			maintainers: [{ name: 'me' }],
			_id: 'demo@1.0.0',
			_nodeVersion: '24.0.0',
			_npmVersion: '11.16.0',
			_npmUser: { name: 'me' },
			dist: { tarball: 'https://example.com/demo-1.0.0.tgz', fileCount: 1, unpackedSize: 1 },
		},
		'2.0.0': {
			name: 'demo',
			version: '2.0.0',
			maintainers: [{ name: 'me' }],
			_id: 'demo@2.0.0',
			_nodeVersion: '24.0.0',
			_npmVersion: '11.16.0',
			_npmUser: {
				name: 'me',
				// @ts-expect-error npm's staging `approver` field is not in @types/pacote's `Person`
				approver: { name: 'x' },
			},
			dist: { tarball: 'https://example.com/demo-2.0.0.tgz', fileCount: 1, unpackedSize: 1 },
		},
	},
};

test('classify is importable', (t) => {
	t.equal(typeof classify, 'function', 'classify is a function');

	t.end();
});

test('version resolution', (t) => {
	const actual = wasStagedPublish(packument);
	t.deepEqual(
		actual,
		{
			name: 'demo',
			version: '1.0.0',
			status: 'not-staged',
			code: 1,
			reason: actual.reason,
		},
		'is as expected',
	);

	const next = wasStagedPublish(packument, 'next');
	t.equal(next.version, '2.0.0', 'resolves a named dist-tag');
	t.equal(next.status, 'staged', 'dist-tag target is classified');

	t.equal(wasStagedPublish(packument, '2.0.0').status, 'staged', 'resolves an exact version');

	t.end();
});

test('missing version throws', (t) => {
	t.throws(
		() => { wasStagedPublish(packument, '9.9.9'); },
		/not found/,
		'unknown version throws',
	);
	t.throws(
		// @ts-expect-error
		() => { wasStagedPublish({}); },
		/not found/,
		'empty packument throws',
	);
	t.throws(
		() => { wasStagedPublish(); },
		/not found/,
		'no packument at all throws',
	);
	t.end();
});

test('tolerates a missing time map and an absent version object', (t) => {
	const weird = {
		'dist-tags': { latest: '1.0.0' },
		versions: { '1.0.0': undefined }, // key present (resolves), value absent
	};
	// @ts-expect-error deliberately malformed: an absent version object
	const result = wasStagedPublish(weird);

	t.deepEqual(
		result,
		{
			version: '1.0.0',
			name: '',
			status: 'unknown',
			code: 2,
			reason: result.reason,
		},
		'is as expected',
	);

	t.end();
});

test('name fallback', (t) => {
	const noName = {
		'dist-tags': { latest: '1.0.0' },
		time: { '1.0.0': '2026-06-01T00:00:00.000Z' },
		versions: { '1.0.0': { name: 'from-version', dist: { fileCount: 1, unpackedSize: 1 }, _npmVersion: '11.16.0' } },
	};
	// @ts-expect-error deliberately missing top-level `name`/`maintainers`
	t.equal(wasStagedPublish(noName).name, 'from-version', 'falls back to the version object name');

	const noNameAnywhere = {
		'dist-tags': { latest: '1.0.0' },
		time: {},
		versions: { '1.0.0': { dist: {} } },
	};
	// @ts-expect-error deliberately missing `name`/`maintainers`/`time`/`dist.tarball`
	t.equal(wasStagedPublish(noNameAnywhere).name, '', 'empty string when no name anywhere');

	t.end();
});
