# Component Map

## Home Route

```text
page.tsx
  NotificationPrompt
  Header
    HeaderRocketFact
  LiveLaunches
    LiveNow
      Countdown
  NextLaunch
    Countdown
    AddToCalendar
  LaunchList
    FilterBar
    LaunchMap
    LaunchCard*
      AddToCalendar
  Footer
```

## History Route

```text
history/page.tsx
  Header
    HeaderRocketFact
  PastLaunches
    FilterBar
    LaunchCard*
  Footer
```

## Notes

- `LaunchMap` is now part of the main upcoming-launch experience
- `RocketFacts.tsx` exists but the active ribbon is `HeaderRocketFact.tsx`
- `PastLaunches` intentionally uses a history-specific filter configuration
