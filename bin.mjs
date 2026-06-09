#! /usr/bin/env node

import pargs from 'pargs';

import run from '#cli';

const {
	help,
	positionals: [positional],
	values,
} = await pargs(import.meta.filename, {
	allowPositionals: 1,
	minPositionals: 1,
	options: {
		registry: { type: 'string' },
	},
});

await help();

process.exitCode ||= await run(positional, values.registry);
