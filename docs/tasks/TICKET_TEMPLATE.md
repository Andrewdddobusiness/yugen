# Ticket: <ID> <Short Title>

**Priority**: <High | Medium | Low>  
**Complexity**: <Low | Medium | High> (<brief parenthetical>)  
**Estimated Hours**: <#–# hours>  
**Dependencies**: <comma-separated ticket IDs or “None”>  
**Status**: <Draft | In Progress | In Review | Done>

## 0. Executive Summary (Why This Exists)

<1–3 paragraphs: what is broken, why it matters, what will be different after shipping. Keep it user-observable.>

## 1. Goals (What Must Be True After This Ships)

- <Goal 1>
- <Goal 2>
- <Goal 3>

## 2. Non-Goals (Guardrails)

- <Non-goal 1>
- <Non-goal 2>

## 3. Background / Current Behavior (Optional)

- <What happens today, with 1–2 concrete examples>

## 4. Core Concepts (Optional)

<Only include if you’re introducing a new abstraction or contract. Prefer small structs/enums.>

```rust
// Example
struct ExampleConcept {
    id: String,
    // ...
}
```

## 5. Data / Prompt / API Contracts (Optional but Recommended)

<If this affects prompt inputs/outputs, tool contracts, schemas, or serialization, describe the contract here.>

## 6. Task Breakdown (Numbered, Checkbox-Driven)

> Rule: every Task must have a checklist, and any non-trivial item must have sub-task checkboxes.

### 1. <Task title>

**Estimated**: <#–# hours>

- [ ] <Top-level deliverable>
  - [ ] <Subtask>
  - [ ] <Subtask>
- [ ] <Top-level deliverable>
  - [ ] <Subtask>

**Files:**  
`<path>`  
`<path>`

### 2. <Task title>

**Estimated**: <#–# hours>

- [ ] <Top-level deliverable>
  - [ ] <Subtask>
  - [ ] <Subtask>
- [ ] <Top-level deliverable>
  - [ ] <Subtask>

**Files:**  
`<path>`  
`<path>`

### 3. <Task title>

**Estimated**: <#–# hours>

- [ ] <Top-level deliverable>
  - [ ] <Subtask>
  - [ ] <Subtask>

**Files:**  
`<path>`  
`<path>`

## 7. Acceptance Criteria (Strict)

- [ ] <User-observable behavior is correct>
- [ ] <No regressions in adjacent flows>
- [ ] <Edge case: <...>>
- [ ] <Safety/guardrail: <...>>

## 8. Testing Requirements

- [ ] Unit tests:
  - [ ] <Test case>
  - [ ] <Test case>
- [ ] Integration tests:
  - [ ] <Test scenario>
- [ ] Manual QA checklist (if relevant):
  - [ ] <Steps + expected result>

## 9. Rollout / Migration Notes (Optional)

- [ ] <Feature flag / config gating>
- [ ] <Backward compatibility / schema migration plan>

## 10. Risks / Open Questions

- <Risk 1 + mitigation>
- <Open question 1>

## 11. Implementation Notes (Fill In As You Land Changes)

- <Key decision>
- <Key decision>

**Key files touched:**  
`<path>`  
`<path>`

## Related Tickets

- <ID>: <title>
- <ID>: <title>

