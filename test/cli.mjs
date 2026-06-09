import test from 'tape';

import pacote from 'pacote';
import mockProperty from 'mock-property';

import run, { parseSpec } from '#cli';

import cases from './fixtures/cases.json' with { type: 'json' };

/** @type {(name: string) => any} */
function findCase(name) {
	return cases.filter((c) => `${c.name}@${c.version}` === name)[0];
}

/**
 * wrap a single fixture case into a one-version packument
 * @param {(typeof cases)[number]} c
 */
function packumentFor(c) {
	return {
		name: c.name,
		'dist-tags': { latest: c.version },
		time: { [c.version]: c.time },
		versions: { [c.version]: c.meta },
	};
}

/** @type {(packument: unknown) => () => Promise<any>} */
function resolvesTo(packument) {
	return () => Promise.resolve(packument);
}

/**
 * stub `pacote.packument` and `console.error` (restored via teardown); capture stderr + exit code
 * @param {import('tape').Test} t
 * @param {string} spec
 * @param {string | undefined} registry
 * @param {() => Promise<any>} packument - a stand-in for `pacote.packument`
 */
async function invoke(t, spec, registry, packument) {
	/** @type {string[]} */
	const errs = [];
	t.teardown(mockProperty(pacote, 'packument', { value: packument }));
	// @ts-expect-error mock-property's object type rejects the `Console` interface (no index signature)
	t.teardown(mockProperty(console, 'error', { value(m) { errs.push(m); } }));
	const code = await run(spec, registry);
	return { code, errs: errs.join('\n') };
}

test('parseSpec', (t) => {
	t.deepEqual(parseSpec('pbkdf2'), { name: 'pbkdf2', version: undefined }, 'bare name');
	t.deepEqual(parseSpec('pbkdf2@3.1.6'), { name: 'pbkdf2', version: '3.1.6' }, 'name@version');
	t.deepEqual(parseSpec('@e18e/eslint-plugin'), { name: '@e18e/eslint-plugin', version: undefined }, 'scoped, no version');
	t.deepEqual(parseSpec('@e18e/eslint-plugin@0.5.0'), { name: '@e18e/eslint-plugin', version: '0.5.0' }, 'scoped with version');
	t.end();
});

test('staged exits 0, message on stderr', async (t) => {
	const c = findCase('pbkdf2@3.1.6');
	const r = await invoke(t, 'pbkdf2@3.1.6', undefined, resolvesTo(packumentFor(c)));
	t.equal(r.code, 0, 'exit 0');
	t.match(r.errs, /: staged /, 'staged message on stderr');
	t.end();
});

test('definitely-not-staged exits 1 on stderr', async (t) => {
	const c = findCase('pbkdf2@3.1.5');
	const r = await invoke(t, 'pbkdf2@3.1.5', undefined, resolvesTo(packumentFor(c)));
	t.equal(r.code, 1, 'exit 1');
	t.match(r.errs, /: NOT staged /, 'not-staged message on stderr');
	t.end();
});

test('unknown exits 2 on stderr', async (t) => {
	const c = findCase('semver@7.8.1');
	const r = await invoke(t, 'semver@7.8.1', undefined, resolvesTo(packumentFor(c)));
	t.equal(r.code, 2, 'exit 2');
	t.match(r.errs, /: unknown /, 'unknown message on stderr');
	t.end();
});

test('fetch failure exits 3', async (t) => {
	const r = await invoke(t, 'nope', undefined, () => Promise.reject(new Error('E404 Not Found')));
	t.equal(r.code, 3, 'exit 3');
	t.match(r.errs, /^error: E404/, 'error prefix on stderr');
	t.end();
});

test('missing version exits 3', async (t) => {
	const c = findCase('pbkdf2@3.1.6');
	const r = await invoke(t, 'pbkdf2@9.9.9', undefined, resolvesTo(packumentFor(c)));
	t.equal(r.code, 3, 'exit 3');
	t.match(r.errs, /not found/, 'reports the missing version');
	t.end();
});

test('a non-Error rejection is reported verbatim', async (t) => {
	const r = await invoke(t, 'x', undefined, () => Promise.reject('boom'));
	t.equal(r.code, 3, 'exit 3');
	t.match(r.errs, /^error: boom$/, 'uses the thrown value when it has no message');
	t.end();
});
