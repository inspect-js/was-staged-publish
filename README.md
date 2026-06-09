# was-staged-publish <sup>[![Version Badge][npm-version-svg]][package-url]</sup>

[![github actions][actions-image]][actions-url]
[![coverage][codecov-image]][codecov-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][npm-badge-png]][package-url]

Determine, from an npm packument, whether a published version was a **staged publish** — and therefore approved by a human passing a 2FA challenge.

## Why?

[Staged publishing][staged-docs] shipped in npm `v11.15.0` on 2026-05-20. It requires a maintainer to pass a two-factor-authentication challenge to approve a version before it goes live. That approval is the *only* signal that survives into a package's public metadata proving a second factor was involved in a release. This tool reads that signal.

What it can and can't tell you:

- ✅ **Staged** is detectable. Either `_npmUser.approver` is present (npm `>= 11.16.0`), or — in the original npm `v11.15` window — the publish is missing `dist.fileCount`/`dist.unpackedSize`, which that flow dropped.
- ✅ **Definitely not staged** is detectable when the publish used npm `< 11.15` (which cannot stage), predates 2026-05-20, or used npm `>= 11.16.0` without an approver (the fixed flow always records one).
- ❓ The only **unknown** is an npm `v11.15` publish with file stats present and no approver. A plain local publish *with* 2FA and one *without* are indistinguishable in a packument; staging is what finally made 2FA observable.

Staging and provenance are orthogonal: a publish can be built in CI via OIDC/trusted publishing *and* be staged. Such a publish is reported as staged, since unlike non-staged OIDC publishing, it uses 2FA.

## CLI

```sh
npx was-staged-publish <pkg>[@<version>] [--registry <url>]
```

`<version>` may be an exact version or a dist-tag; it defaults to `latest`.

Exit codes:

| code | meaning | stream |
| ---: | ------- | ------ |
| `0` | staged (for sure) | stdout |
| `1` | definitely **not** staged | stderr |
| `2` | unknown (cannot be determined) | stderr |
| `3` | usage or fetch error | stderr |

```sh
was-staged-publish which-typed-array@1.1.22
# which-typed-array@1.1.22: staged — `_npmUser.approver` is present: ...   (exit 0)

was-staged-publish pbkdf2@3.1.5
# pbkdf2@3.1.5: NOT staged — published ..., before staged publishing shipped  (exit 1)

was-staged-publish semver@7.8.1
# semver@7.8.1: unknown — published with npm 11.15.0 in the v11.15 window ...  (exit 2)
```

[package-url]: https://npmjs.org/package/was-staged-publish
[npm-version-svg]: https://versionbadg.es/inspect-js/was-staged-publish.svg
[npm-badge-png]: https://nodei.co/npm/was-staged-publish.png?downloads=true&stars=true
[license-image]: https://img.shields.io/npm/l/was-staged-publish.svg
[license-url]: LICENSE
[downloads-image]: https://img.shields.io/npm/dm/was-staged-publish.svg
[downloads-url]: https://npm-stat.com/charts.html?package=was-staged-publish
[staged-docs]: https://docs.npmjs.com/staged-publishing/
[codecov-image]: https://codecov.io/gh/inspect-js/was-staged-publish/branch/main/graphs/badge.svg
[codecov-url]: https://app.codecov.io/gh/inspect-js/was-staged-publish/
[actions-image]: https://img.shields.io/github/check-runs/inspect-js/was-staged-publish/main
[actions-url]: https://github.com/inspect-js/was-staged-publish/actions
