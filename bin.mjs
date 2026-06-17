#! /usr/bin/env node

import pargs from 'pargs';

import run from '#cli';

const {
	help,
	positionals: [positional],
	values,
} = await pargs(import.meta.filename, {
	allowPositionals: 1,
	description: {
		sections: [
			{
				body: '0  staged (for sure)\n1  definitely not staged\n2  unknown (cannot be determined)\n3  fetch error',
				title: 'Exit codes',
			},
		],
		summary: 'Determine whether a published npm version was a staged publish (and thus approved by a human passing a 2FA challenge).',
	},
	minPositionals: 1,
	options: {
		registry: {
			defaultDescription: 'https://registry.npmjs.org',
			description: 'the npm registry to query',
			placeholder: 'url',
			type: 'string',
		},
	},
	positionals: [{ description: '`version` may be an exact version or a dist-tag; it defaults to `latest`', name: 'pkg[@version]' }],
});

await help();

process.exitCode ||= await run(positional, values.registry);
