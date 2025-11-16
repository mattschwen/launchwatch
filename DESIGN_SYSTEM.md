# LaunchWatch Design System

## 🎨 Color Scheme: Refined Deep Space Blue

### Core Color Palette

```css
/* Base Colors */
--background-base: #0B0D17        /* Deep space blue-black */
--background-elevated: #1A1F35    /* Card backgrounds */
--surface: rgba(26, 31, 53, 0.6)  /* Glass-morphism surfaces */

/* Accent Colors */
--primary: #4A90FF                /* Bright space blue */
--primary-hover: #6BA4FF          /* Lighter on hover */
--secondary: #7C3AED              /* Cosmic purple */
--accent: #06B6D4                 /* Cyan for highlights */

/* Status Colors */
--live: #EF4444                   /* Hot red for live launches */
--upcoming: #3B82F6               /* Blue for upcoming */
--success: #10B981                /* Green for successful */
--warning: #F59E0B                /* Amber for warnings */

/* Text */
--text-primary: #F9FAFB           /* Almost white - 17:1 contrast */
--text-secondary: #9CA3AF         /* Medium gray */
--text-muted: #6B7280             /* Darker gray */
```

### Accessibility

- **WCAG AAA Compliant**: 17:1 contrast ratio on text
- **Keyboard Navigation**: Full support
- **Screen Readers**: Proper ARIA labels
- **No Motion Traps**: Smooth, performant animations

---

## 🔮 Glassmorphism Style

### Core Classes

```css
.glass {
  background: rgba(26, 31, 53, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(74, 144, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

.glass-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-hover:hover {
  background: rgba(26, 31, 53, 0.8);
  border-color: #4A90FF;
  box-shadow: 0 12px 48px 0 rgba(74, 144, 255, 0.2);
  transform: translateY(-2px);
}
```

### Usage

- **Cards**: Launch cards, info panels
- **Headers**: Sticky navigation bars
- **Modals**: Dropdowns, notifications
- **Buttons**: Secondary actions

---

## ✨ Component Patterns

### 1. Launch Cards

**Design**: Glassmorphic cards with hover effects
- Rounded corners: `rounded-xl`
- Padding: `p-5 sm:p-6`
- Hover: Lifts with blue glow
- Status badges: Color-coded with transparency

### 2. Countdown Timers

**Design**: Individual glass boxes per time unit
- Gradient text numbers
- Pulsing seconds display
- Responsive wrapping
- Min-width for consistency

### 3. Live Launch Indicators

**Design**: Animated red dot with glow
- Double animation (pulse + ping)
- Glass border with red tint
- Embedded video with glass frame
- Attention-grabbing without being jarring

### 4. Filters & Search

**Design**: Collapsible glass panels
- Rounded search input
- Dropdown with glassmorphism
- Active filter chips
- Smooth transitions

### 5. Statistics Cards

**Design**: Grid of glass metrics
- Large gradient numbers
- Muted labels
- Responsive grid (2 cols mobile, 4 desktop)
- Color-coded by meaning

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile First */
Default: 0-640px
sm: 640px+    /* Small tablets */
md: 768px+    /* Tablets */
lg: 1024px+   /* Desktops */
```

### Mobile Optimizations

1. **Reduced backdrop blur** (8px vs 12px) for performance
2. **Flexible text sizes** with clamp()
3. **Touch-friendly buttons** (min 44px tap target)
4. **Collapsible sections** for space efficiency
5. **Stacking layouts** that flow naturally

---

## 🎭 Animations

### Fade In
```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Slide In
```css
@keyframes slide-in {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}
```

### Glow
```css
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(74, 144, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(74, 144, 255, 0.6); }
}
```

### Performance

- Hardware-accelerated (transform, opacity only)
- Respects `prefers-reduced-motion`
- < 60ms animation duration for micro-interactions
- Cubic bezier easing for natural feel

---

## 🚀 Implementation Guide

### Using the Design System

1. **Headers**: Always use `glass` class with sticky positioning
2. **Cards**: Use `glass glass-hover` for interactive elements
3. **Buttons**: 
   - Primary actions: `bg-[var(--primary)]`
   - Secondary: `glass glass-hover`
   - Destructive: `bg-[var(--live)]`
4. **Text**:
   - Headings: `gradient-text` class
   - Body: `text-[var(--text-secondary)]`
   - Muted: `text-[var(--text-muted)]`

### Example Component

```tsx
<div className="glass glass-hover rounded-xl p-5 sm:p-6">
  <h3 className="text-xl font-bold gradient-text mb-3">
    Launch Name
  </h3>
  <p className="text-[var(--text-secondary)] text-sm">
    Description here...
  </p>
  <button className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] 
    text-white rounded-lg transition-all hover:shadow-lg 
    hover:shadow-[var(--primary)]/30">
    View Details
  </button>
</div>
```

---

## 🎯 Best Practices

### Do's ✅

- Use CSS variables for colors
- Add hover states to all interactive elements
- Maintain 4.5:1 contrast minimum
- Test on mobile devices
- Use semantic HTML
- Add loading states

### Don'ts ❌

- Don't use pure black (#000000)
- Don't hardcode colors
- Don't skip hover/focus states
- Don't forget mobile optimization
- Don't nest glassmorphism (reduces performance)
- Don't animate width/height (use transform)

---

## 📊 Performance Metrics

### Target Metrics

- **LCP**: < 2.5s on 3G
- **FID**: < 100ms
- **CLS**: < 0.1
- **Bundle Size**: < 200KB (gzipped)

### Optimization Techniques

1. **Backdrop Filter**: Reduced on mobile
2. **Image Optimization**: Next.js Image component
3. **Code Splitting**: Route-based splitting
4. **Lazy Loading**: Below-fold components
5. **CSS Custom Properties**: Better than inline styles

---

## 🔄 Version History

### v2.0.0 - Glassmorphic Redesign

**Changes:**
- Implemented refined Deep Space Blue color scheme
- Added glassmorphism across all components
- Enhanced mobile responsiveness
- Improved accessibility (WCAG AAA)
- Added smooth animations and transitions
- Updated all 13 components for consistency

**Components Updated:**
1. globals.css (color system + utilities)
2. app/page.tsx (main page)
3. app/history/page.tsx (history page)
4. LaunchCard
5. LiveNow
6. NextLaunch
7. LaunchList
8. RocketFacts
9. Countdown
10. FilterBar
11. AddToCalendar
12. NotificationPrompt
13. PastLaunches

---

## 🤝 Contributing

When adding new components:

1. Follow the glassmorphism pattern
2. Use CSS variables for colors
3. Ensure mobile responsiveness
4. Add hover/focus states
5. Test accessibility
6. Document in this file

---

**Built with ❤️ for space enthusiasts**

