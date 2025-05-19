Rule Name: Testing Utilities and Test Relocation
Description:
When refactoring utility functions (such as `computePathToTest`) from a command module (e.g., `check.ts`) to a shared utility module (e.g., `file-utils.ts`), the associated unit tests should also be moved from the original test file (e.g., `check.test.ts`) to a new test file colocated with the utility (e.g., `file-utils.test.ts`).

- The new test file should import the utility directly and not reference the original command module.
- The original test suite for the utility should be removed from the command's test file to avoid duplication.
- This ensures that each module's tests are located with the module itself, improving maintainability and clarity.
