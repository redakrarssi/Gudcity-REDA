// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import a11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      'jsx-a11y': a11y,
    },
    rules: {
      // React rules
      'react/prop-types': 'off', // We use TypeScript for prop validation
      'react/react-in-jsx-scope': 'off', // Not needed with modern React
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'error', // Enforce no 'any' types
      '@typescript-eslint/no-non-null-assertion': 'warn', // Warn about non-null assertions
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'], // Prefer interfaces over types
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Prefer ?? over ||
      '@typescript-eslint/prefer-optional-chain': 'warn', // Prefer ?. over && chains
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      
      // Import rules
      'import/order': ['warn', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        }
      }],
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }], // Warn about console.log usage
      
      // Accessibility rules
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-role': 'warn',
      
      // Custom QR code type system rules
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/qrCodeService', '**/qrCodeValidator', '**/standardQrCodeGenerator'],
          message: 'Import QR code types from "../types/qrCode" instead of directly from service files.'
        }]
      }],
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {},
      },
    },
  },
  {
    files: ['**/*.tsx', '**/*.ts'],
    rules: {
      // Additional TypeScript-specific rules for .ts and .tsx files
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['I']
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase']
        },
        {
          selector: 'enum',
          format: ['PascalCase']
        },
      ],
    },
  },
  {
    // Ignore rules for test files
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['**/qrCode*.{ts,tsx}', '**/*QrCode*.{ts,tsx}', '**/*QR*.{ts,tsx}', '**/QRScanner.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error', // Stricter for QR code files
      '@typescript-eslint/explicit-function-return-type': 'error', // Require return types for QR functions
      'import/no-duplicates': 'error', // Prevent duplicate imports
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSTypeReference[typeName.name="any"]',
          message: 'Do not use "any" type in QR code related files. Use proper QR code types instead.'
        },
        {
          selector: 'TSAnyKeyword',
          message: 'Do not use "any" type in QR code related files. Use proper QR code types instead.'
        }
      ],
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '../utils/qrCodeValidator',
            importNames: ['validateQrCode'],
            message: 'Import from "../types/qrCode" instead.'
          },
          {
            name: '../utils/standardQrCodeGenerator',
            message: 'Import from "../types/qrCode" instead.'
          }
        ],
        patterns: [{
          group: ['**/qrCodeService', '**/qrCodeValidator', '**/standardQrCodeGenerator'],
          message: 'Import QR code types from "../types/qrCode" instead of directly from service files.'
        }]
      }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
      '@typescript-eslint/explicit-function-return-type': 'off', // No need for return types in tests
      'no-restricted-imports': 'off', // Allow any imports in tests
    },
  }
);
