# Architecture Decision Records (ADR) Index

This directory contains records of all significant architectural and technical decisions made for LaunchWatch.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision along with its context and consequences. ADRs are immutable records - once written, they should not be edited except to mark them as superseded.

## When to Write an ADR

Create an ADR when making decisions that:
- Affect the overall system architecture
- Are difficult to reverse (one-way doors)
- Have significant technical or business impact
- Will be questioned by others ("Why did we do it this way?")
- Set precedents for future decisions

## ADR Lifecycle

```
Proposed → Accepted → [Deprecated or Superseded]
           ↓
         Rejected
```

- **Proposed**: Under discussion, not yet approved
- **Accepted**: Approved and should be followed
- **Deprecated**: No longer recommended but not replaced
- **Superseded**: Replaced by a newer ADR
- **Rejected**: Discussed but not adopted

## How to Create an ADR

1. Copy `../templates/adr-template.md`
2. Name it `XXXX-short-title.md` (sequential numbering)
3. Fill in all sections with context and reasoning
4. Open a PR for review and discussion
5. Update this index after approval

## All ADRs

| # | Title | Status | Date | Summary |
|---|-------|--------|------|---------|
| [0001](./0001-nextjs-app-router.md) | Use Next.js App Router | ✅ Accepted | 2025-11-15 | Adopt Next.js 15+ App Router for routing and data fetching |
| [0002](./0002-tailwind-css-styling.md) | Use Tailwind CSS for Styling | ✅ Accepted | 2025-11-15 | Use Tailwind CSS utility-first framework for all styling |
| [0003](./0003-client-side-data-fetching.md) | Client-Side Data Fetching for Launch Data | ✅ Accepted | 2025-11-15 | Fetch launch data on client side for real-time updates |
| [0004](./0004-no-database-for-mvp.md) | No Database for MVP | ✅ Accepted | 2025-11-15 | Use API caching without persistent database for v1.0 |

---

## ADRs by Category

### Architecture & Framework
- [ADR-0001: Next.js App Router](./0001-nextjs-app-router.md)

### Styling & UI
- [ADR-0002: Tailwind CSS](./0002-tailwind-css-styling.md)

### Data & State Management
- [ADR-0003: Client-Side Data Fetching](./0003-client-side-data-fetching.md)
- [ADR-0004: No Database for MVP](./0004-no-database-for-mvp.md)

---

## ADRs by Status

### ✅ Accepted (Active)
- ADR-0001, 0002, 0003, 0004

### 🚫 Rejected
- None yet

### ⚠️ Deprecated
- None yet

### 🔄 Superseded
- None yet

---

**Last Updated**: 2025-11-15  
**Total ADRs**: 4

