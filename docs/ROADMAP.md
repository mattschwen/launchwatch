# LaunchWatch Product Roadmap 🗺️

> **Last Updated**: 2025-11-15  
> **Horizon**: Q4 2025 - Q2 2026

## Vision Statement

LaunchWatch aims to be the most user-friendly, real-time rocket launch tracking platform for space enthusiasts worldwide. We prioritize speed, accuracy, and beautiful design.

## Success Metrics

| Metric | Current | Target Q1 2026 | Target Q2 2026 |
|--------|---------|----------------|----------------|
| Monthly Active Users | - | 10,000 | 50,000 |
| Page Load Time (p95) | <1s | <800ms | <500ms |
| Launch Data Accuracy | 95% | 98% | 99% |
| Mobile Users | - | 60% | 65% |
| PWA Install Rate | 0% | 10% | 20% |
| User Retention (30d) | - | 40% | 55% |

---

## NOW (Current Quarter - Q4 2025)
*Shipping This Month*

### 🎯 Focus: Core Experience & Stability

#### 1. Enhanced PWA Features ⚡
**Status**: 🟡 In Progress  
**Owner**: Engineering  
**Effort**: M (2-3 weeks)

**User Value**: Users can install LaunchWatch as an app and receive push notifications for launches they care about.

**Acceptance Criteria**:
- [x] Service worker for offline support
- [x] Manifest.json for installability
- [ ] Push notification subscription flow
- [ ] Notification preferences (per-agency, per-mission-type)
- [ ] Background sync for launch updates
- [ ] iOS add-to-homescreen prompt

**Technical Requirements**:
- Web Push API integration
- Notification permission management
- Background sync capability
- Offline fallback page improvements

**Risk**: Push notifications on iOS require PWA installation; limited compared to Android.

---

#### 2. Advanced Launch Filtering 🔍
**Status**: 🟢 Ready to Start  
**Owner**: Frontend  
**Effort**: S (1 week)

**User Value**: Users can filter launches by agency, rocket type, mission type, and date range.

**Acceptance Criteria**:
- [ ] Filter by space agency (SpaceX, NASA, ESA, etc.)
- [ ] Filter by rocket family (Falcon 9, Starship, etc.)
- [ ] Filter by mission type (ISS, Commercial, Military, etc.)
- [ ] Date range picker for custom windows
- [ ] Persist filter preferences in localStorage
- [ ] Mobile-friendly filter drawer

**Dependencies**: FilterBar component exists but needs enhancement.

---

#### 3. Launch Details Page 📄
**Status**: 🟢 Ready to Start  
**Owner**: Frontend  
**Effort**: M (2 weeks)

**User Value**: Users can click on a launch to see comprehensive details, including mission objectives, payload information, and historical context.

**Acceptance Criteria**:
- [ ] Dedicated `/launch/[id]` route
- [ ] Mission description and objectives
- [ ] Payload details and destination
- [ ] Launch site information with map
- [ ] Rocket specifications
- [ ] Historical launch success rate
- [ ] Related links (NASA, Wikipedia, articles)
- [ ] Social sharing buttons
- [ ] Add to calendar integration

**Out of Scope**: User comments, launch betting/predictions.

---

#### 4. Calendar Integration 📅
**Status**: 🟡 In Progress  
**Owner**: Frontend  
**Effort**: S (1 week)

**User Value**: Users can add launches to their Google Calendar, Apple Calendar, or Outlook with one click.

**Acceptance Criteria**:
- [x] ICS file generation (lib/calendar.ts exists)
- [ ] Google Calendar quick-add link
- [ ] Apple Calendar (.ics download)
- [ ] Outlook Calendar support
- [ ] Pre-filled event with launch time, stream link, and location
- [ ] Reminder set 30 minutes before launch

**Technical Requirements**:
- ICS file format compliance
- Deep links for calendar apps
- Server-side .ics generation for better compatibility

---

## NEXT (Q1 2026)
*Planning & Research Phase*

### 🎯 Focus: Engagement & Personalization

#### 5. User Accounts & Favorites 👤
**Status**: 📋 Planned  
**Owner**: Full-Stack  
**Effort**: L (4-5 weeks)

**Problem**: Users want to track specific agencies, rockets, or missions without manually filtering each visit.

**User Stories**:
- As a SpaceX fan, I want to see only SpaceX launches by default
- As a user, I want to favorite specific missions and get notified
- As a returning user, I want my preferences saved across devices

**Scope**:
- Authentication (OAuth with Google, GitHub)
- User profile management
- Favorite agencies and rockets
- Custom notification preferences
- Cross-device sync
- Privacy controls

**Out of Scope**: Social features (following other users, comments, forums).

**Risks**:
- Privacy concerns: GDPR compliance needed
- Auth complexity: Consider using Auth.js/NextAuth
- Cost: Database required (consider Vercel Postgres or Supabase)

**Success Metrics**:
- 30% of users create accounts within first visit
- 60% of account holders favorite at least one agency

---

#### 6. Historical Launch Archive 🏛️
**Status**: 🟢 In Progress  
**Owner**: Full-Stack  
**Effort**: M (3 weeks)

**User Value**: Users can explore past launches, success rates, and trends.

**Scope**:
- `/history` page (exists but needs data)
- Search historical launches by date, agency, rocket
- Launch outcome visualization (success/failure)
- Monthly/yearly launch statistics
- Success rate trends by rocket
- Notable launches and milestones

**Technical Requirements**:
- Query LL2 API for historical data
- Caching strategy for historical data (24h cache)
- Pagination for large result sets
- Charts for statistics (recharts or Chart.js)

**Dependencies**: None

---

#### 7. Launch Predictions & Scrub Tracking 🔮
**Status**: 📋 Planned  
**Owner**: Backend + Data  
**Effort**: XL (6-8 weeks)

**Problem**: Launch times change frequently due to weather, technical issues, or range conflicts. Users want to know the likelihood of a scrub.

**User Stories**:
- As a user, I want to see scrub probability based on historical patterns
- As a user, I want to be notified when a launch is rescheduled
- As an analyst, I want to see scrub reasons and trends

**Scope**:
- Track launch time changes and scrub events
- Display scrub probability based on:
  - Historical scrub rate for rocket type
  - Weather conditions (integrate weather API)
  - Time of day patterns
  - Launch site history
- Scrub reason categorization (weather, technical, other)
- Historical scrub statistics per rocket/site

**Out of Scope**: Real-time weather monitoring, betting/prediction markets.

**Risks**:
- Data accuracy: Scrub reasons not always available
- API costs: Weather APIs can be expensive
- Complexity: ML model for predictions is ambitious

**Alternatives**:
- Phase 1: Simple scrub history without predictions
- Phase 2: Add weather integration
- Phase 3: ML-based scrub probability

---

#### 8. Mobile App (React Native) 📱
**Status**: 📋 Planned  
**Owner**: Mobile Team (TBD)  
**Effort**: XXL (12+ weeks)

**Problem**: PWAs have limitations on iOS; native apps provide better notification experience and performance.

**User Stories**:
- As an iOS user, I want reliable push notifications
- As a mobile user, I want faster load times and offline access
- As a user, I want an app-like experience

**Scope**:
- React Native app (iOS + Android)
- Shared codebase with web where possible
- Native push notifications
- Biometric authentication
- Offline mode with sync
- App Store and Play Store deployment

**Out of Scope**: Platform-specific features beyond notifications.

**Risks**:
- Team capacity: Requires React Native expertise
- Maintenance overhead: Three platforms (web, iOS, Android)
- Cost: App Store fees, push notification infrastructure

**Decision Required**: Build native app or invest in PWA improvements?

**RFC Required**: Yes - [Create RFC](./rfcs/0001-mobile-app-strategy.md)

---

## LATER (Q2 2026 & Beyond)
*Ideas & Exploration*

### 🎯 Focus: Innovation & Community

#### 9. Community Features 🌐
- User comments on launches
- Launch watch parties (coordinated viewing)
- User-generated launch guides
- Ambassador program for space educators

**Status**: 💭 Ideation  
**Effort**: TBD

---

#### 10. AR Launch Viewing 🥽
- AR mode to "place" rocket in your environment
- Live trajectory visualization
- 3D rocket models

**Status**: 💭 Ideation  
**Effort**: TBD  
**Requires**: Research phase, WebXR experimentation

---

#### 11. API for Third-Party Developers 🔌
- Public LaunchWatch API
- Webhooks for launch events
- Developer portal with docs
- Rate limiting and API keys

**Status**: 💭 Ideation  
**Effort**: TBD  
**Monetization**: Freemium API access

---

#### 12. Launch Analytics Dashboard 📊
- Advanced statistics and trends
- Agency comparison
- Cost per launch analysis
- Success rate predictions
- Export data for research

**Status**: 💭 Ideation  
**Effort**: TBD

---

## Archived / Deprioritized

### ~~Live Chat During Launches~~
**Reason**: Moderation overhead and complexity outweigh value for v1. Consider Discord integration instead.

### ~~Rocket Comparison Tool~~
**Reason**: Low user demand based on early feedback. Revisit in Q3 2026.

---

## How to Use This Roadmap

### For Contributors
1. **Pick a NOW item**: These are ready to start and have clear requirements.
2. **Comment on the issue**: Let us know you're interested.
3. **Create a feature branch**: Use `feat/item-name` naming.
4. **Follow DoD**: See [docs/README.md](./README.md) for Definition of Done.

### For Product Team
1. **Weekly review**: Update status and unblock issues.
2. **Monthly planning**: Move items between NOW/NEXT/LATER.
3. **Quarterly retro**: Review success metrics and adjust priorities.

### For Users
- **NOW items**: Shipping within 4 weeks.
- **NEXT items**: Shipping within 3 months.
- **LATER items**: Under consideration, timeline TBD.

---

## Prioritization Framework

We evaluate features based on:

| Criteria | Weight | Description |
|----------|--------|-------------|
| **User Impact** | 40% | How many users benefit? How much? |
| **Effort** | 30% | Engineering time and complexity |
| **Strategic Fit** | 20% | Aligns with vision and differentiators |
| **Risk** | 10% | Technical, legal, or operational risk |

**Scoring**: 1-5 scale for each criterion, weighted average determines priority.

---

## Feedback & Suggestions

Have an idea? [Open a Feature Request](https://github.com/your-org/launchwatch/issues/new?template=feature_request.md)

---

**Version**: 1.0  
**Next Review**: 2025-12-01

