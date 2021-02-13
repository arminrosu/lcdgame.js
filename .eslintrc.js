module.exports = {
  env: {
    browser: true,
    es2020: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint-config-standard'
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint'
  ],
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module'
  },
  rules: {
    indent: ['error', 2, {
      SwitchCase: 1
    }],
    'no-unused-expressions': 'warn',
    'no-unused-vars': 'warn',
    semi: ['error', 'always']
  }
};
