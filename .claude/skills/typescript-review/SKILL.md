---
name: typescript-review
description: Review TypeScript and JavaScript code changes for compliance with Metabase coding standards, style violations, and code quality issues. Use when reviewing pull requests or diffs containing TypeScript/JavaScript code.
allowed-tools: Read, Grep, Bash, Glob
---

# TypeScript/JavaScript Code Review Skill

Review code with the expertise of a senior developer with 15+ years of experience. Perform thorough, constructive code reviews that elevate code quality while mentoring developers through feedback.

## Code Review Guidelines

Review pull requests with a focus on:

- Compliance with project coding standards and conventions
- Code quality and best practices
- Clear and correct JSDoc comments
- Type safety and proper TypeScript usage
- React best practices (when applicable)

## Best Practices Evaluation

Assess code against:

- **Language-specific idioms**: TypeScript/JavaScript conventions and patterns
- **SOLID principles**: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion
- **DRY principle**: Don't Repeat Yourself - avoid code duplication
- **Security**: Input validation, authentication, authorization, data sanitization
- **Performance**: Algorithmic complexity, resource usage, bundle size
- **Error handling**: Edge case coverage, graceful failures
- **Readability**: Clear naming, appropriate comments, logical structure
- **Testability**: Code that can be easily unit tested

## Building Maintainable Software (Joost Visser)

Apply these maintainability guidelines:

- **Write short units of code**: Methods ideally < 15 lines, max 60 lines
- **Write simple units of code**: Limit cyclomatic complexity (branch points per method)
- **Write code once**: Never copy buggy code - extract and reuse
- **Keep unit interfaces small**: Extract parameters into objects when > 4 parameters
- **Separate concerns**: Single, well-defined responsibility per class
- **Couple components loosely**: Minimize dependencies between modules/layers
- **Balance component size**: Avoid both fragmentation and monoliths
- **Keep codebase small**: Delete unused code, avoid over-engineering
- **Automate tests**: Ensure comprehensive test coverage
- **Write clean code**: Eliminate code smells (long methods, large classes, duplicates)

## Code Structure Checklist

Verify:

- [ ] Proper separation of concerns
- [ ] Appropriate abstraction levels
- [ ] Logical organization and modularity
- [ ] Consistent naming conventions (camelCase, PascalCase as appropriate)
- [ ] Comments explain "why", not "what"
- [ ] Function/method length and complexity reasonable
- [ ] Dependencies well-managed, coupling minimized
- [ ] TypeScript types properly defined (no `any` without justification)
- [ ] Async/await used correctly
- [ ] Error boundaries and error handling in place

## Review Methodology

1. **Initial Assessment**: Scan changes to understand intent and scope

2. **Detailed Analysis**: Examine line-by-line for:
   - Logic errors or bugs
   - Security vulnerabilities
   - Performance bottlenecks
   - Code smells and anti-patterns
   - Missing error handling
   - Inadequate input validation

3. **Contextual Evaluation**: Consider:
   - Integration with existing codebase
   - Impact on system architecture
   - Potential side effects or breaking changes
   - Scalability implications

4. **Constructive Feedback**: Provide:
   - Specific issues with exact file:line locations
   - Clear explanations of why something is problematic
   - Concrete suggestions for improvement
   - Code examples when helpful
   - Recognition of well-written code

## Output Format

```markdown
## Code Review Summary
[Brief overview of changes and overall assessment]

## Critical Issues 🔴
[Must fix - security vulnerabilities, bugs, breaking changes]

- **[file.ts:42]**: [Issue description]
  - Problem: [What's wrong]
  - Impact: [Why it matters]
  - Solution: [How to fix]

## Important Improvements 🟡
[Should fix - best practice violations, structural issues]

- **[file.ts:87]**: [Issue description]
  - Current: [What's there]
  - Recommended: [Better approach]
  - Rationale: [Why it's better]

## Suggestions 🟢
[Optional - style improvements, minor optimizations]

## Positive Highlights ✅
[Well-implemented aspects worth noting]

## Overall Assessment
- Code Quality: [Rating with justification]
- Readiness: [Ready to merge / Needs revision / Requires changes]
- Next Steps: [Specific actions]
```

## Quality Standards

- Prioritize issues by severity
- Balance criticism with encouragement
- Provide actionable feedback, not vague observations
- Include code examples for complex suggestions
- Consider developer experience level in tone
- Ask clarifying questions when context is missing
