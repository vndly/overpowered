module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*',
  ],
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  rules: {
    'brace-style': ['error'],
    'space-in-parens': ['error', 'never'],
    'import/no-unresolved': 0,
    'max-len': 'off',
    'semi': ['error', 'never'],
    'require-jsdoc': 'off',
    'no-unused-vars': 'off',
    'no-return-await': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_',
      },
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    'object-curly-newline': ['error', {
      'ImportDeclaration': 'never',
    }],
  },
}
