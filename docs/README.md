# LaunchWatch Documentation 📚

This directory contains all project management, technical documentation, and governance artifacts for LaunchWatch.

## 📁 Directory Structure

```
docs/
├── README.md                    # This file
├── ROADMAP.md                   # Product roadmap (NOW/NEXT/LATER)
├── ARCHITECTURE.md              # System architecture and design decisions
├── templates/                   # Document templates
│   ├── prd-template.md         # Product Requirements Document template
│   ├── rfc-template.md         # Request for Comments template
│   └── adr-template.md         # Architecture Decision Record template
├── adrs/                        # Architecture Decision Records
│   ├── 0000-adr-index.md       # Index of all ADRs
│   └── 0001-nextjs-app-router.md
├── rfcs/                        # Requests for Comments
│   └── 0000-rfc-index.md       # Index of all RFCs
├── runbooks/                    # Operational runbooks
│   ├── deployment.md           # Deployment procedures
│   ├── monitoring.md           # Monitoring and observability
│   ├── incident-response.md    # Incident response procedures
│   └── rollback.md            # Rollback procedures
└── api/                        # API documentation
    ├── spacex-integration.md   # SpaceX API integration guide
    ├── launch-library.md       # Launch Library 2 integration guide
    └── nasa-integration.md     # NASA API integration guide
```

## 🎯 Document Types

### Product Requirements Documents (PRDs)
- Problem statement and user needs
- Success metrics and KPIs
- Feature scope and out-of-scope items
- Technical requirements
- Risk assessment
- Milestones and timeline

### Requests for Comments (RFCs)
- Technical proposals for significant changes
- Context and motivation
- Detailed design and implementation plan
- Alternative approaches considered
- Migration path and rollback strategy
- Security and performance considerations

### Architecture Decision Records (ADRs)
- Log of all architectural decisions
- Context, decision, and consequences
- Status (proposed, accepted, deprecated, superseded)
- Date and decision makers

### Runbooks
- Step-by-step operational procedures
- Deployment guides
- Troubleshooting guides
- Incident response playbooks
- Rollback procedures

## 📋 Quick Links

- [Roadmap](./ROADMAP.md) - What we're building and when
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [Architecture Overview](./ARCHITECTURE.md) - System design
- [API Documentation](./api/) - External API integrations
- [Runbooks](./runbooks/) - Operational procedures

## 🔄 Document Lifecycle

### Creating a PRD
1. Copy `templates/prd-template.md`
2. Fill in all sections
3. Review with stakeholders
4. Get approval before implementation
5. Link to tracking issue

### Creating an RFC
1. Copy `templates/rfc-template.md`
2. Fill in proposal details
3. Share for feedback (minimum 7 days)
4. Address comments and update
5. Get approval from 2+ maintainers
6. Create implementation issues

### Recording an ADR
1. Copy `templates/adr-template.md`
2. Document decision context and rationale
3. Number sequentially (e.g., 0003-use-tailwind-css.md)
4. Update ADR index
5. Commit with PR

## 📊 Definition of Done

Every work item must meet these criteria before being marked complete:

### For Features
- [ ] User-facing changes documented
- [ ] Tests written and passing
- [ ] Linter errors resolved
- [ ] Performance impact assessed
- [ ] Accessibility checked
- [ ] Mobile responsive (if UI change)
- [ ] Browser compatibility verified
- [ ] Release notes drafted

### For API Changes
- [ ] API documentation updated
- [ ] Breaking changes noted
- [ ] Migration guide provided
- [ ] Version bumped appropriately
- [ ] Deprecation warnings added (if applicable)

### For Bug Fixes
- [ ] Root cause documented
- [ ] Test added to prevent regression
- [ ] Related issues linked
- [ ] User impact assessed

## 🚀 Release Process

1. **Planning**: Define scope and version number
2. **Development**: Implement features per DoD
3. **Testing**: QA pass on staging environment
4. **Documentation**: Update all user-facing docs
5. **Release Notes**: Draft with upgrade steps
6. **Deploy**: Follow deployment runbook
7. **Monitor**: Watch metrics and error rates
8. **Announce**: Communicate to users

## 📝 Style Guide

### Commit Messages
```
type(scope): short description

Longer explanation if needed.

Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

### Branch Naming
- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/component-name` - Refactoring
- `chore/dependency-updates` - Maintenance

## 🤝 Contribution Workflow

1. Check [ROADMAP.md](./ROADMAP.md) for planned work
2. Comment on issue or create new one
3. Fork and create feature branch
4. Make changes following DoD
5. Submit PR with template filled out
6. Address review feedback
7. Merge after 1+ approval

## 📞 Getting Help

- **Questions**: Open a Discussion on GitHub
- **Bugs**: Create an issue with bug template
- **Features**: Create an issue with feature template
- **Security**: Email security@launchwatch.app

---

**Last Updated**: 2025-11-15  
**Maintainer**: PM & Documentation Lead

