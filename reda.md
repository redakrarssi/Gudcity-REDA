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

## File Size Limitations

For improved maintainability and easier bug fixing:

1. **New Files Size Limit** - New files should not exceed 300 lines of code
2. **File Splitting** - If functionality requires more than 300 lines, split it into multiple files with clear responsibilities
3. **Refactoring Large Files** - When modifying existing large files, consider refactoring into smaller modules
4. **Documentation** - Add clear comments for file relationships when splitting functionality

These limitations help with:
- Easier code understanding and debugging
- More focused unit testing
- Better separation of concerns
- Reduced merge conflicts in collaborative development

## Dashboard Synchronization and Real-time Interaction

### Business and Customer Dashboard Sync
- **Real-time Updates** - Ensure changes made in business dashboard reflect immediately in customer dashboard
- **Notification Services** - Use `NotificationService` for real-time communication between dashboards
- **WebSocket Implementation** - Leverage existing WebSocket connections for bidirectional communication
- **Sync Components** - Pay special attention to loyalty points, transaction records, and program enrollments
- **Data Consistency** - Enforce data consistency across business and customer views
- **Optimization Patterns** - Use optimistic UI updates with proper error rollback mechanisms

### Real-time Interaction Best Practices
- **Event-driven Architecture** - Follow the established event patterns for state updates
- **Debouncing** - Implement debouncing for high-frequency update operations
- **Conflict Resolution** - Provide clear conflict resolution strategies when concurrent updates occur
- **Offline Support** - Ensure graceful degradation when real-time connections fail
- **State Management** - Follow existing patterns for state synchronization

## Error and Console Error Handling

### UI Error Handling
- **User-facing Errors** - Ensure all errors are properly caught and presented to users in a friendly manner
- **Error Boundaries** - Use React error boundaries to prevent cascading UI failures
- **Recovery Mechanisms** - Implement recovery paths from common error scenarios
- **Error Logging** - Ensure all errors are properly logged for later analysis

### Console Error Management
- **Silent Failures** - Eliminate all silent failures; everything should be logged appropriately
- **Debugging Information** - Include useful debugging context without exposing sensitive information
- **Error Categories** - Categorize errors by severity and type for easier troubleshooting
- **Production vs Development** - Implement different error verbosity based on environment
- **Performance Monitoring** - Console errors should include performance impact information when relevant

### Error Prevention
- **Validation** - Implement robust validation before operations that could cause errors
- **Type Safety** - Leverage TypeScript's type system to prevent errors at compile time
- **Testing** - Ensure error scenarios are covered in tests
- **Graceful Degradation** - Design features to degrade gracefully when errors occur

## Website Security

### Authentication and Authorization
- **Token Management** - Ensure proper handling of auth tokens with appropriate expiration
- **Permission Checks** - Implement consistent permission verification across all endpoints
- **Session Management** - Follow best practices for session handling and timeout
- **Multi-factor Authentication** - Consider MFA implementation for sensitive operations

### Data Protection
- **PII Handling** - Follow strict protocols for handling Personally Identifiable Information
- **Data Encryption** - Ensure sensitive data is encrypted at rest and in transit
- **Input Sanitization** - Implement thorough input sanitization to prevent injection attacks
- **CORS Policies** - Maintain strict CORS policies to prevent unauthorized data access

### Security Best Practices
- **XSS Prevention** - Implement measures against Cross-Site Scripting attacks
- **CSRF Protection** - Ensure Cross-Site Request Forgery protections are in place
- **Rate Limiting** - Implement rate limiting on sensitive endpoints
- **Dependency Security** - Regularly audit dependencies for security vulnerabilities
- **Secure Headers** - Configure secure HTTP headers (Content-Security-Policy, etc.)
- **Audit Logging** - Maintain comprehensive audit logs for security-relevant actions

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