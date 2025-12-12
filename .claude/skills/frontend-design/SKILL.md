---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Also use for UI/UX review of existing interfaces. Generates creative, polished code that avoids generic AI aesthetics.
---

# Frontend Design & UI/UX Review Skill

This skill guides creation of distinctive, production-grade frontend interfaces AND provides expert UI/UX review capabilities. Apply 15+ years of enterprise design experience to both creation and evaluation.

## Part 1: Design Creation

### Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian
- **Constraints**: Technical requirements (framework, performance, accessibility)
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

### Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt for distinctive choices that elevate aesthetics. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth. Add contextual effects and textures: gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial), cliched color schemes (purple gradients on white), predictable layouts, cookie-cutter design lacking context-specific character.

## Part 2: UI/UX Review

### UX Principles Evaluation

Assess design against:

- **Visual hierarchy**: Information architecture and content prioritization
- **Consistency**: Components, colors, typography, spacing across the application
- **Accessibility**: WCAG 2.1 AA minimum compliance
- **Responsive design**: Cross-device compatibility
- **Performance perception**: Loading states, feedback, transitions
- **Error prevention**: Recovery mechanisms and confirmations
- **Internationalization**: Multi-language support (i18n)
- **Dark mode**: Compatibility when applicable

### Interface Structure Checklist

Verify:

- [ ] Component reusability and design system adherence
- [ ] Proper use of UI libraries (Mantine v8, Material-UI, etc.)
- [ ] Consistent spacing and layout grids
- [ ] Appropriate use of brand palette colors
- [ ] Typography hierarchy and readability
- [ ] Icon usage and visual metaphors
- [ ] Button states and interactive feedback
- [ ] Form validation and error messaging

### Accessibility Checklist

- [ ] Keyboard navigation works for all interactive elements
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] Screen reader labels present (aria-label, aria-describedby)
- [ ] Focus indicators visible and clear
- [ ] Form validation errors are announced
- [ ] All images have alt text
- [ ] Semantic HTML used appropriately

### Multi-Language Support

- [ ] All text uses i18n translation keys
- [ ] Text containers accommodate longer translations (German +30%)
- [ ] Date/time/currency formats are localized
- [ ] Text direction (RTL) considered if applicable
- [ ] Icons and images are culture-neutral

### Enterprise Design Principles

- **Professional Aesthetics**: Clean, modern, and trustworthy appearance
- **Efficiency**: Minimize clicks and cognitive load for frequent tasks
- **Clarity**: Clear labels, obvious actions, predictable behavior
- **Consistency**: Patterns that repeat across the application
- **Forgiveness**: Easy to undo mistakes, confirm destructive actions
- **Guidance**: Helpful hints, tooltips, onboarding for complex features
- **Responsiveness**: Instant feedback for all user actions
- **Scalability**: Designs that work with 10 items or 10,000 items

### Mantine v8 Best Practices

When using Mantine:

- Follow library conventions for theming and customization
- Use provided components instead of custom implementations
- Maintain consistent component props and patterns
- Ensure proper TypeScript typing for component props
- Leverage built-in accessibility features
- Use appropriate component variants (primary, secondary, outline)
- Follow grid and layout system guidelines

## Review Output Format

```markdown
## UI/UX Review Summary
[Brief overview and overall assessment]

## Critical Issues 🔴
[Severely impacts usability - accessibility violations, broken workflows]

- **[Component:Location]**: [Issue]
  - Problem: [What's wrong]
  - User Impact: [How it affects UX]
  - Solution: [How to fix]

## Important Improvements 🟡
[Significant improvements - consistency issues, missing patterns]

- **[Component:Location]**: [Issue]
  - Current: [What's there]
  - Recommended: [Better UX pattern]
  - Rationale: [Why it's better]

## Suggestions 🟢
[Optional enhancements - polish, microinteractions]

## Positive Highlights ✅
[Well-implemented design elements]

## Overall Assessment
- Design Quality: [Rating]
- Readiness: [Ready / Needs revision / Requires changes]
- Priority Issues: [Top 3 to fix]
```

## Quality Standards

- Be thorough but prioritize by user impact
- Balance criticism with encouragement
- Provide actionable feedback with visual/code examples
- Reference established UI patterns and design systems
- Consider developer's design experience level
- Ask clarifying questions about brand guidelines or user needs

Remember: Claude is capable of extraordinary creative work. Don't hold back - commit fully to a distinctive vision.
