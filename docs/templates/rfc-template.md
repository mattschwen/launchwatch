# RFC-XXXX: [Title]

> **Status**: Draft | In Review | Accepted | Rejected | Superseded  
> **Author**: [Your Name] (@username)  
> **Created**: YYYY-MM-DD  
> **Last Updated**: YYYY-MM-DD  
> **Discussion**: [Link to GitHub Discussion or PR]  
> **Implementation**: [Link to PR when available]

---

## Summary

[One paragraph explaining what this RFC proposes. Should be understandable by anyone familiar with the project.]

---

## Motivation

### Why are we doing this?

[Explain the problem this RFC solves. What pain points exist today? What opportunities would this unlock?]

### What is the expected outcome?

[What will be better after this is implemented? How will users or developers benefit?]

---

## Current State

### What exists today?

[Describe the current implementation, if any. What are the limitations?]

### Example: Current Behavior
```typescript
// Show current code or behavior
const currentApproach = () => {
  // Example
};
```

---

## Detailed Design

### Proposed Solution

[Comprehensive explanation of the proposed approach. Include:]

1. **High-level architecture**
2. **Component interactions**
3. **Data flow**
4. **API contracts**

### Example: Proposed Implementation
```typescript
// Show proposed code or behavior
const proposedApproach = () => {
  // Example with detailed comments
};
```

### New APIs or Interfaces

```typescript
// Define new types, functions, or components
interface NewFeature {
  property: string;
  method(): void;
}
```

### Data Model Changes

```typescript
// Show database schema changes, if applicable
type LaunchSchema = {
  id: string;
  newField: string; // Added field
};
```

### File Structure Changes

```
Before:
app/
  page.tsx

After:
app/
  page.tsx
  launches/
    [id]/
      page.tsx  // New detail page
```

---

## Implementation Plan

### Phase 1: [Foundation]
**Duration**: X weeks  
**Owner**: @username

- [ ] Task 1
- [ ] Task 2
- [ ] Checkpoint: [Milestone or demo]

### Phase 2: [Core Implementation]
**Duration**: X weeks  
**Owner**: @username

- [ ] Task 3
- [ ] Task 4
- [ ] Checkpoint: [Milestone or demo]

### Phase 3: [Polish & Migration]
**Duration**: X weeks  
**Owner**: @username

- [ ] Task 5
- [ ] Task 6
- [ ] Launch: [Release version]

---

## Migration Path

### For Existing Users

[How will existing users be migrated? Breaking changes? Data migrations?]

### For Developers

[Will this require code changes from contributors? Are there breaking API changes?]

### Migration Steps

1. **Step 1**: [What needs to happen first]
2. **Step 2**: [Next step]
3. **Step 3**: [Final step]

### Backward Compatibility

- [ ] Is this a breaking change?
- [ ] Can old and new systems run side-by-side during migration?
- [ ] How long will we support the old approach?

---

## Alternatives Considered

### Alternative 1: [Description]

**Pros**:
- ✅ [Advantage]
- ✅ [Another advantage]

**Cons**:
- ❌ [Disadvantage]
- ❌ [Another disadvantage]

**Why not this?**: [Reason for rejection]

---

### Alternative 2: [Description]

**Pros**:
- ✅ [Advantage]

**Cons**:
- ❌ [Disadvantage]

**Why not this?**: [Reason for rejection]

---

### Alternative 3: Do Nothing

**Pros**:
- ✅ No engineering effort required

**Cons**:
- ❌ Problem remains unsolved
- ❌ [Other consequences]

**Why not this?**: [Why the status quo is unacceptable]

---

## Performance Implications

### Expected Performance Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Page Load Time | 800ms | 700ms | -100ms ✅ |
| Bundle Size | 150KB | 160KB | +10KB ⚠️ |
| API Latency | 200ms | 150ms | -50ms ✅ |

### Benchmarks

[Include benchmark results, if available]

### Optimization Plan

- [ ] [How we'll mitigate any negative impacts]
- [ ] [Monitoring strategy]

---

## Security Considerations

### Threat Model

- [ ] **Threat 1**: [Description]
  - **Mitigation**: [How we'll prevent or detect]
- [ ] **Threat 2**: [Description]
  - **Mitigation**: [How we'll prevent or detect]

### Security Review Checklist

- [ ] Input validation implemented
- [ ] Authentication/authorization required?
- [ ] Rate limiting needed?
- [ ] Secrets management reviewed
- [ ] OWASP Top 10 considered
- [ ] Security team review completed

### Privacy Impact

- [ ] Does this collect new user data?
- [ ] Is data encrypted at rest and in transit?
- [ ] Are data retention policies defined?
- [ ] Is GDPR compliance maintained?

---

## Testing Strategy

### Unit Tests

```typescript
describe('NewFeature', () => {
  it('should handle expected input', () => {
    // Test case
  });

  it('should handle edge cases', () => {
    // Edge case test
  });
});
```

### Integration Tests

- [ ] Test integration with [System A]
- [ ] Test integration with [System B]
- [ ] Test error handling

### End-to-End Tests

- [ ] User scenario 1
- [ ] User scenario 2
- [ ] Edge case scenarios

### Manual Testing Checklist

- [ ] Test on Chrome (desktop)
- [ ] Test on Safari (desktop)
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test with slow network (3G)
- [ ] Test offline behavior (if PWA)

---

## Documentation Plan

### User-Facing Documentation

- [ ] Update README.md
- [ ] Update user guide
- [ ] Create tutorial or quickstart
- [ ] Update FAQ

### Developer Documentation

- [ ] Update API reference
- [ ] Update contributing guide
- [ ] Add code comments
- [ ] Create ADR for key decisions

### Release Notes

```markdown
## v1.x.0 - YYYY-MM-DD

### ✨ New Features
- **[Feature Name]**: [Brief description and benefits]

### 🔄 Breaking Changes
- [If any, explain migration path]

### 📚 Documentation
- [Links to updated docs]
```

---

## Dependencies

### Internal Dependencies

- [ ] **Dependency 1**: [Feature or component that must exist first]
- [ ] **Dependency 2**: [Another internal dependency]

### External Dependencies

- [ ] **Library/API 1**: [New external dependency]
  - **Version**: [Specific version]
  - **License**: [License type]
  - **Justification**: [Why we need this]

### Team Dependencies

- [ ] **Design**: [What we need from design team]
- [ ] **Backend**: [What we need from backend team]
- [ ] **DevOps**: [Infrastructure or deployment needs]

---

## Rollout Plan

### Feature Flags

```typescript
const isNewFeatureEnabled = process.env.ENABLE_NEW_FEATURE === 'true';

if (isNewFeatureEnabled) {
  // New behavior
} else {
  // Old behavior
}
```

### Phased Rollout

1. **Week 1**: Deploy behind feature flag, off by default
2. **Week 2**: Enable for 10% of users (internal testing)
3. **Week 3**: Enable for 50% of users (A/B testing)
4. **Week 4**: Enable for 100% of users if metrics healthy

### Rollback Strategy

**Trigger**: If any of these occur:
- Error rate increases by >5%
- Performance degrades by >10%
- Critical bug discovered

**Rollback Steps**:
1. Disable feature flag
2. Deploy previous version if needed
3. Communicate to users
4. Post-mortem within 24 hours

---

## Monitoring & Observability

### Metrics to Track

- [ ] **User Adoption**: % of users using new feature
- [ ] **Success Rate**: % of successful interactions
- [ ] **Performance**: p50, p95, p99 latency
- [ ] **Error Rate**: % of errors

### Alerts to Configure

- [ ] Alert if error rate >1%
- [ ] Alert if latency p95 >2 seconds
- [ ] Alert if [custom metric] exceeds threshold

### Dashboards

- [ ] Create Vercel Analytics dashboard
- [ ] Create custom metrics dashboard
- [ ] Document how to access and interpret

---

## Success Criteria

### Must Achieve (Go/No-Go)

- [ ] [Success metric 1]: [Target value]
- [ ] [Success metric 2]: [Target value]
- [ ] No increase in critical errors
- [ ] User feedback net positive (>70% approval)

### Nice to Achieve

- [ ] [Stretch goal 1]
- [ ] [Stretch goal 2]

### Evaluation Timeline

- **Week 1**: Collect initial metrics
- **Week 2**: Review and adjust
- **Week 4**: Final evaluation and decision

---

## Open Questions

- [ ] **Question 1**: [What we need to decide]
  - **Owner**: @username
  - **Deadline**: YYYY-MM-DD
  - **Resolution**: [To be filled when answered]

- [ ] **Question 2**: [Another question]
  - **Owner**: @username
  - **Deadline**: YYYY-MM-DD
  - **Resolution**: [To be filled when answered]

---

## Discussion Summary

### Feedback from Review Period

| Reviewer | Date | Summary | Resolution |
|----------|------|---------|------------|
| @reviewer1 | YYYY-MM-DD | [Feedback summary] | [How addressed] |
| @reviewer2 | YYYY-MM-DD | [Feedback summary] | [How addressed] |

### Changes Made During Review

- **YYYY-MM-DD**: [Change description]
- **YYYY-MM-DD**: [Another change]

---

## Approval

### Required Approvals

- [ ] **Engineering Lead**: @username
- [ ] **Product Lead**: @username
- [ ] **Architecture Review**: @username

### Optional Stakeholders

- [ ] **Design**: @username
- [ ] **DevOps**: @username

---

## References

- [Related PRD](../prd-xxx.md)
- [Related ADR](../adrs/0001-example.md)
- [External resource or research]
- [API documentation]

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| YYYY-MM-DD | @author | Initial draft |
| YYYY-MM-DD | @author | Updated based on feedback |
| YYYY-MM-DD | @author | Accepted with revisions |

---

**Status**: ⏳ Awaiting review until YYYY-MM-DD  
**Next Steps**: [What happens next]

