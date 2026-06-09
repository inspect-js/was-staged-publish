import { fileURLToPath } from 'url';

import test from 'tape';

import { spawnSync, spawn } from 'child_process';
import { createServer } from 'http';

import cases from './fixtures/cases.json' with { type: 'json' };

const bin = fileURLToPath(new URL('../bin.mjs', import.meta.url));

/** @param {string} name */
function packumentFor(name) {
	const c = cases.filter((x) => `${x.name}@${x.version}` === name)[0];
	return {
		name: c.name,
		'dist-tags': { latest: c.version },
		time: { [c.version]: c.time },
		versions: { [c.version]: c.meta },
	};
}

test('bin --help', (t) => {
	const result = spawnSync(process.execPath, [bin, '--help'], { encoding: 'utf8' });
	t.equal(result.status, 0, 'exits 0');
	t.match(result.stdout, /Usage:/, 'prints help to stdout');
	t.end();
});

test('bin with no package argument', (t) => {
	const result = spawnSync(process.execPath, [bin], { encoding: 'utf8' });
	t.notEqual(result.status, 0, 'exits nonzero');
	t.end();
});

test('bin resolves and classifies against a registry', (t) => {
	const packument = packumentFor('which-typed-array@1.1.22');
	const server = createServer((_req, res) => {
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify(packument));
	});
	server.listen(0, '127.0.0.1', () => {
		const { port } = /** @type {import('net').AddressInfo} */ (server.address());
		const child = spawn(process.execPath, [bin, 'which-typed-array', '--registry', `http://127.0.0.1:${port}`]);
		let errs = '';
		child.stderr.setEncoding('utf8');
		child.stderr.on('data', (d) => { errs += d; });
		child.on('close', (code) => {
			server.close();
			t.equal(code, 0, 'staged exits 0');
			t.match(errs, /: staged /, 'staged message on stderr');
			t.end();
		});
	});
});
