import ljharb from '@ljharb/eslint-config/flat/node/24';

export default [
	{
		ignores: ['coverage/'],
	},
	...ljharb,
	{
		languageOptions: {
			ecmaVersion: 2025,
		},
		rules: {
			'func-style': [
				'error',
				'declaration',
			],
			'id-length': 'off',
			'no-extra-parens': 'off',
			'no-magic-numbers': 'off',
			'no-underscore-dangle': 'off',
			'sort-keys': 'off',
		},
	},
	{
		files: ['test/**'],
		rules: {
			'func-style': 'off',
			'max-lines-per-function': 'off',
			'prefer-promise-reject-errors': 'off',
		},
	},
];
