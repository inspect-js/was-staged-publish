
import semver from 'semver';

/**
 * Staged publishing shipped in npm v11.15.0 on 2026-05-20. A staged publish
 * requires a human to pass a 2FA challenge to approve the version before it
 * goes live, and that approval is the *only* durable, packument-visible proof
 * that a second factor was involved in a release.
 *
 * Two fingerprints, in two npm eras:
 *  - npm >= 11.16.0 records the approver in `_npmUser.approver` (reliable).
 *  - the original v11.15 flow did not record an approver, but dropped
 *    `dist.fileCount`/`dist.unpackedSize` from the published metadata; in the
 *    staging era (and only then) that omission is the staged-publish tell
 *
 * An npm older than 11.15 cannot have staged at all, so its publishes are
 * "not staged" regardless of anything else.
 *
 * Provenance (OIDC/trusted publishing) is orthogonal: a publish can be built
 * in CI *and* staged, so the approver check is made independent of provenance.
 */

/** the first npm version that could stage a publish (the original, approver-less flow) */
export const STAGING_FIRST_NPM = '11.15.0';

/** the first npm version whose staged-publish flow reliably records an approver */
export const STAGING_FIXED_NPM = '11.16.0';

/**
 * The date staged publishing shipped (npm v11.15.0). Publishes strictly before
 * this could not have been staged.
 */
export const STAGING_EPOCH = '2026-05-20T00:00:00.000Z';

const STAGING_EPOCH_DATE = Date.parse(STAGING_EPOCH);

/** @typedef {'staged' | 'not-staged' | 'unknown'} Status */
/** @typedef {{ status: Status, code: number, reason: string }} Result */

/** @type {(reason: string) => Result} */
function staged(reason) {
	return {
		status: 'staged',
		code: 0,
		reason,
	};
}

/** @type {(reason: string) => Result} */
function notStaged(reason) {
	return {
		status: 'not-staged',
		code: 1,
		reason,
	};
}

/** @type {(reason: string) => Result} */
function unknown(reason) {
	return {
		status: 'unknown',
		code: 2,
		reason,
	};
}

/** @import { Manifest } from 'pacote' */

/**
 * Classify whether a single published version was a staged publish.
 *
 * @param {Manifest} [meta] - the per-version object from a packument (`packument.versions[v]`)
 * @param {string} [publishedDate] - the ISO timestamp from `packument.time[v]`
 * @returns {Result}
 */
export default function classify(meta, publishedDate) {
	const versionMeta = meta || /** @type {Partial<Manifest>} */ ({});

	const npmUser = versionMeta._npmUser;
	if (npmUser && typeof npmUser === 'object' && 'approver' in npmUser) {
		return staged('`_npmUser.approver` is present: a human passed a 2FA challenge to approve this version before it went live');
	}

	const npmVersion = typeof versionMeta._npmVersion === 'string' ? versionMeta._npmVersion : '';
	const npmSemver = npmVersion ? semver.coerce(npmVersion) : null;
	if (npmSemver && semver.lt(npmSemver, STAGING_FIRST_NPM)) {
		return notStaged(`published with npm ${npmVersion} (< ${STAGING_FIRST_NPM}), which predates staged publishing; it cannot have been staged`);
	}

	const dist = versionMeta.dist && typeof versionMeta.dist === 'object' ? versionMeta.dist : {};
	const hasFileStats = 'fileCount' in dist && 'unpackedSize' in dist;

	const publishedMs = Date.parse(String(publishedDate));
	const inStagingEra = publishedMs >= STAGING_EPOCH_DATE; // false when the date is missing/unparseable

	if (!hasFileStats && inStagingEra) {
		return staged('published in the staging era but missing `dist.fileCount`/`dist.unpackedSize`: the fingerprint of the original npm v11.15 staged-publish flow, before `approver` was recorded');
	}

	if (npmSemver && semver.gte(npmSemver, STAGING_FIXED_NPM)) {
		return notStaged(`published with npm ${npmVersion} (>= ${STAGING_FIXED_NPM}) and no \`_npmUser.approver\`; the fixed staged-publish flow always records an approver, so this was not staged`);
	}

	if (publishedMs < STAGING_EPOCH_DATE) {
		return notStaged(`published ${publishedDate}, before staged publishing shipped (${STAGING_EPOCH.slice(0, 10)})`);
	}

	return unknown(`published with npm ${npmVersion || '(unknown)'} in the v11.15 window, with file stats present and no approver; a non-staged publish and a staged publish are indistinguishable here`);
}
