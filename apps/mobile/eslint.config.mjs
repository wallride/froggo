import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {
      // The app lives in a phone-shaped frame (src/layout/app-frame.tsx),
      // which is narrower than the window on tablets and in browsers.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['useWindowDimensions', 'Dimensions'],
              message: 'Lay out by the app frame: useFrameDimensions() from src/layout/app-frame.',
            },
            {
              name: 'react-native',
              importNames: ['SafeAreaView'],
              message: 'Use Screen from src/layout/Screen (it keeps to the safe area).',
            },
          ],
        },
      ],
    },
  },
  {
    // The frame itself is laid out by the window.
    files: ['src/layout/app-frame.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    ignores: ['.expo', 'web-build', 'cache', 'dist'],
  },
];
