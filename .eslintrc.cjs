module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:jsx-a11y/recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'no-console': 'warn',
    // New JSX transform: React in scope is not required
    'react/react-in-jsx-scope': 'off',
    // Project does not use prop-types consistently; disable for now
    'react/prop-types': 'off'
  }
};