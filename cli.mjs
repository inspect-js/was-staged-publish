import pacote from 'pacote';

import wasStagedPublish from '#index';

/**
 * @param {string} spec
 * @returns {{ name: string, version: (string | undefined) }}
 */
export function parseSpec(spec) {
	const at = spec.lastIndexOf('@');
	if (at > 0) {
		return { name: spec.slice(0, at), version: spec.slice(at + 1) };
	}
	return { name: spec, version: undefined };
}

/**
 * @param {string} spec
 * @param {string} [registry]
 * @returns {Promise<number>}
 */
export default async function run(spec, registry) {
	const { name, version } = parseSpec(spec);

	let result;
	try {
		const pkg = await pacote.packument(name, { registry, fullMetadata: true });
		result = wasStagedPublish(pkg, version);
	} catch (e) {
		console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
		return 3;
	}

	const label = `${result.name}@${result.version}`;
	if (result.status === 'staged') {
		console.error(`${label}: staged — ${result.reason}`);
		return 0;
	}
	const word = result.status === 'not-staged' ? 'NOT staged' : 'unknown';
	console.error(`${label}: ${word} - ${result.reason}`);
	return result.code;
}
