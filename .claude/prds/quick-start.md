# PRD: Quick Start Feature

**Status:** Draft
**Author:** PM Agent
**Date:** 2026-01-06
**Priority:** P0 (RICE Score: 40)

---

## Problem Statement

New users must complete a 5-step onboarding flow (45-60 seconds) before seeing the main canvas. This high-friction experience likely causes significant drop-off before users experience any value.

**Evidence:**
- Time-to-value: ~60 seconds (industry best practice: <10 seconds)
- 5 screens before canvas access
- No skip option for experienced users
- Analytics: Not yet available (blocked decision)

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Onboarding completion rate | Unknown | >70% | Vercel Analytics |
| Time to first note | ~60s | <15s | Analytics event |
| Quick Start adoption | N/A | >30% | Click tracking |
| D1 retention (Quick Start users) | Unknown | >10% | Cohort analysis |

---

## User Stories

### Primary
**As a** returning visitor
**I want to** skip the onboarding
**So that** I can immediately start creating notes

### Secondary
**As a** new curious visitor
**I want to** try the product immediately
**So that** I can decide if it's worth my time before providing personal info

### Edge Case
**As a** user who clicked a shared link
**I want to** see the shared note immediately
**So that** I understand the context of what was shared

*(Note: Shared link flow already skips onboarding - good!)*

---

## Proposed Solution

### Option A: "Quick Start" Button (Recommended)
Add a secondary CTA on Welcome Screen: "Quick Start →"

**Flow:**
1. User lands on Welcome Screen
2. Sees primary CTA: "Enter Infinity Board"
3. Sees secondary CTA: "Quick Start →" (subtle, below main button)
4. Clicking Quick Start → Skip to canvas with default settings

**Default settings for Quick Start:**
- Name: "Anonymous" or "Guest-{random4digits}"
- Color: Random from palette
- No first note prompt

### Option B: Inline Quick Demo
Show interactive mini-canvas on Welcome Screen (higher effort, deferred)

---

## Acceptance Criteria

### Must Have (P0)
- [ ] "Quick Start" button visible on Welcome Screen
- [ ] Clicking bypasses Name, Color, and FirstNote screens
- [ ] User lands on canvas with default name/color
- [ ] localStorage stores `infinity_quickStart: true` for analytics
- [ ] Track `quick_start_click` event in Vercel Analytics

### Should Have (P1)
- [ ] Subtle animation/styling to not overshadow main CTA
- [ ] Tooltip: "Skip setup, start creating immediately"
- [ ] Quick Start users see gentle prompt after 2nd note: "Want to personalize?"

### Could Have (P2)
- [ ] A/B test Quick Start vs. standard onboarding
- [ ] Different Quick Start for mobile vs. desktop

### Won't Have (this iteration)
- Account creation
- Persistent preferences for Quick Start users
- Full onboarding skip (always show Welcome splash)

---

## Technical Considerations

### Files to Modify
1. `components/Onboarding/screens/WelcomeScreen.tsx` - Add Quick Start button
2. `components/Onboarding/Onboarding.tsx` - Handle Quick Start flow
3. `hooks/useUserPreferences.ts` - Store Quick Start flag

### Implementation Notes
```tsx
// WelcomeScreen.tsx - Add below main button
<button
  onClick={onQuickStart}
  className="text-white/40 hover:text-white/60 text-sm mt-4"
>
  Quick Start →
</button>

// Onboarding.tsx - Add handler
const handleQuickStart = useCallback(() => {
  const randomName = `Guest-${Math.floor(Math.random() * 10000)}`;
  const randomColor = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];

  // Track event
  track('quick_start_click');

  // Skip to complete with defaults
  onComplete({
    userName: randomName,
    userColor: randomColor,
    firstNoteText: '',
    startCoordinates: generateRandomCoords(),
  });
}, [onComplete]);
```

### Analytics Events to Add
- `quick_start_click` - User clicked Quick Start
- `onboarding_complete` - User finished full onboarding
- `onboarding_step_{n}` - User reached step N

---

## Out of Scope

- Removing/modifying the standard onboarding flow
- Account system
- Persistent user preferences beyond localStorage
- Mobile-specific onboarding changes

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Quick Start cannibalizes personalization | Medium | Low | Monitor color/name customization rates |
| Users confused by "Anonymous" name | Low | Low | Use friendly "Guest-1234" format |
| Skip becomes the default (no one onboards) | Medium | Medium | A/B test, make Quick Start subtle |

---

## Timeline

| Phase | Task | Estimate |
|-------|------|----------|
| 1 | Add Quick Start button | 30 min |
| 2 | Implement skip logic | 30 min |
| 3 | Add analytics events | 30 min |
| 4 | Test & deploy | 30 min |
| **Total** | | **2 hours** |

---

## Appendix

### Competitive Analysis
- **Miro:** Shows canvas immediately, onboarding as overlay
- **Excalidraw:** Zero onboarding, immediate canvas
- **FigJam:** 2-step onboarding (name + template)

### Mockup (ASCII)
```
┌─────────────────────────────────────┐
│                                     │
│            INFINITY                 │
│              BOARD                  │
│                                     │
│   A calm space for thoughts...      │
│                                     │
│    ┌─────────────────────────┐      │
│    │  Enter Infinity Board   │      │
│    └─────────────────────────┘      │
│                                     │
│         Quick Start →               │  ← NEW
│                                     │
│    [ ] Skip this intro next time    │
│                                     │
└─────────────────────────────────────┘
```
