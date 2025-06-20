# AI Interaction Guidelines for GudCity REDA Codebase

This document provides rules and guidelines for AI assistance when working with this codebase. These rules help prevent unnecessary changes, maintain code integrity, and avoid disruptions to working functionality.

## DO NOT MODIFY Rules

### Critical Files
- **Service Implementation Files** - Do not modify core service implementations (e.g., `*Service.ts` files) unless specifically requested
- **Database Schema Files** - Do not modify any SQL files or schema definitions in the `db/` directory
- **Authentication Logic** - Do not modify authentication-related code in `src/middleware/auth.ts` and `src/services/authService.ts`

### Working Components
- **QR Scanner Component** - The QR scanner (`src/components/QRScanner.tsx`) is sensitive and should not be modified
- **Business Settings Implementation** - Do not modify the business settings service without explicit instructions
- **Loyalty Card System** - The loyalty card system is critical and requires careful coordination to modify

### Infrastructure Files
- **Configuration Files** - Do not modify the following unless explicitly asked:
  - `vite.config.ts`
  - `tailwind.config.js`
  - `tsconfig.json` files
  - `jest.config.js` files

## SEEK CLARIFICATION Rules

Always seek clarification before modifying:

1. Any file that handles financial transactions or points/rewards calculation
2. Core business logic in services or utilities
3. Database connection and initialization code
4. Authentication flows
5. Files with complex type definitions or generics
6. Files that interface with external systems

## SAFE TO MODIFY Rules

The following can generally be modified safely:

1. Documentation files (like README.md, unless they contain setup instructions)
2. UI components that don't affect business logic (styling changes, layout improvements)
3. Type definitions that make the code more type-safe (without changing behavior)
4. Adding comments or documentation to existing code
5. Fixing obvious bugs that don't affect core functionality

## Best Practices for AI Changes

1. **Incremental Changes** - Make small, focused changes rather than large rewrites
2. **Read Before Writing** - Always analyze existing patterns and code styles before modification
3. **Preserve Type Safety** - Maintain or improve type safety, never reduce it
4. **Test Scenarios** - Before suggesting changes, consider testing implications
5. **Follow Existing Patterns** - Maintain consistency with the existing codebase patterns
6. **Document Changes** - Provide clear explanations for any changes made

## When Making Changes

1. **Indicate Confidence Level** - State how confident you are in the proposed change
2. **Provide Alternatives** - When suggesting significant changes, offer alternatives
3. **Highlight Potential Risks** - Identify any potential side effects of changes
4. **Step-by-Step Approach** - For complex changes, propose a step-by-step implementation plan

## Change Request Format

When requesting AI to make changes, users should follow this format:

```
CHANGE REQUEST:
- Target file: [filename]
- Purpose: [brief description of the change needed]
- Context: [any relevant context about why this change is needed]
- Constraints: [any specific constraints or things to avoid]
```

Following these guidelines will help ensure that AI assistance enhances rather than disrupts the codebase. 