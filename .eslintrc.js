module.exports = {
	env: {
		node: true,
		es2021: true,
		jest: true
	},
	extends: 'standard',
	rules: {
		'no-console': 'warn',
		'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
		'indent': ['error', 'tab'],
		'no-tabs': 'off',
		'space-before-function-paren': ['error', 'never']
	}
};
