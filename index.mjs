
import classify from '#classify';

/** @import { Result } from '#classify' */
/** @import { Packument } from 'pacote' */

/**
 * Resolve a version against a packument and classify how it was published.
 *
 * @param {Packument} [packument] - a full packument (`https://registry.npmjs.org/<name>`)
 * @param {string} [version] - an exact version, or a dist-tag; defaults to the `latest` dist-tag
 * @returns {Result & { name: string, version: string }}
 */
export default function wasStagedPublish(packument, version) {
	const pkg = packument || /** @type {Partial<Packument>} */ ({});
	const versions = pkg.versions
		|| /** @type {Packument['versions']} */ ({});
	const distTags = pkg['dist-tags']
		|| /** @type {Packument['dist-tags']} */ ({});

	const requested = version || 'latest';
	// resolve a dist-tag (e.g. `latest`, `latest-6`) to a concrete version
	const resolved = distTags[requested] ?? requested;

	if (!(resolved in versions)) {
		throw new Error(`version \`${requested}\` not found for \`${pkg.name ?? 'package'}\``);
	}

	const times = pkg.time
		|| /** @type {Packument['time']} */ ({});
	const result = classify(versions[resolved], times[resolved]);

	return {
		name: pkg.name || versions[resolved]?.name || '',
		version: resolved,
		...result,
	};
}
