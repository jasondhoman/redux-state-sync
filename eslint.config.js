// Run this command to generate base config and vs code settings:
// pnpm dlx @antfu/eslint-config@latest

import antfu from '@antfu/eslint-config';

export default antfu({
  type: 'library',
  typescript: true,
  test: true,
  formatters: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: 'single',
  },
}, {
  rules: {
    'perfectionist/sort-imports': ['error', {
      groups: [
        'type-import',
        ['type-parent', 'type-sibling', 'type-index', 'type-internal'],
        'value-builtin',
        'value-external',
        'value-internal',
        ['value-parent', 'value-sibling', 'value-index'],
        'side-effect',
        'ts-equals-import',
        'unknown',
      ],
      newlinesBetween: 1,
      newlinesInside: 'ignore',
      order: 'asc',
      type: 'natural',
    }],
    'no-console': ['warn'],
    'antfu/no-top-level-await': ['off'],
    'node/prefer-global/process': ['off'],
    'node/no-process-env': ['error'],
    'ts/no-redeclare': 'off',
    'ts/no-use-before-define': 'off',
    'ts/consistent-type-definitions': ['error', 'type'],
  },
});
