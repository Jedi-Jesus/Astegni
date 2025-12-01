# Pricing & Features - Quick Reference Guide

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  CAMPAIGN ADVERTISING PRICING SECTION                           │
├─────────────────────────────────────────────────────────────────┤
│  [Add Package Button]                                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ ┌─POPULAR──┐ │  │              │  │ ┌MOST───────┐│         │
│  │ │  (badge) │ │  │              │  │ │ POPULAR   ││         │
│  │ └──────────┘ │  │              │  │ └───────────┘│         │
│  │              │  │              │  │              │         │
│  │ Short-Term   │  │ Standard     │  │ Extended     │         │
│  │              │  │              │  │              │         │
│  │ 2000 ETB/day │  │ 1800 ETB/day │  │ 1500 ETB/day │         │
│  │ Up to 3 days │  │ Up to 7 days │  │ Up to 14 days│         │
│  │              │  │              │  │              │         │
│  │ [BASE PRICE] │  │ [10% OFF]    │  │ [25% OFF]    │         │
│  │              │  │              │  │              │         │
│  │ ✓ Feature 1  │  │ ✓ Feature 1  │  │ ✓ Feature 1  │         │
│  │ ✓ Feature 2  │  │ ✓ Feature 2  │  │ ✓ Feature 2  │         │
│  │              │  │ ✓ Feature 3  │  │ ✓ Feature 3  │         │
│  │              │  │              │  │ ✓ Feature 4  │         │
│  │ [Edit] [Del] │  │ [Edit] [Del] │  │ [Edit] [Del] │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ↕️ DRAG AND DROP TO REORDER ↕️                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SUBSCRIPTION PRICING WITH LIVE CALCULATIONS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BASIC TIER            │  PREMIUM TIER                          │
│  ─────────────────────────────────────────────────────          │
│  Base Price: [99 ETB]  │  Base Price: [299 ETB]                │
│                        │                                        │
│  Features:             │  Features:                             │
│  ✓ 100 GB Storage      │  ✓ Unlimited Storage                  │
│  ✓ Email Support       │  ✓ Priority Support                   │
│  [Add Feature]         │  [Add Feature]                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PAYMENT PERIOD DISCOUNTS (Live Calculator)             │   │
│  ├──────────┬─────────┬──────────────┬─────────┬──────────┤   │
│  │ Period   │ Basic % │ Basic Final  │ Prem. % │ Prem. Final│  │
│  ├──────────┼─────────┼──────────────┼─────────┼──────────┤   │
│  │ 1 Month  │  [0]    │ 99 ETB       │  [0]    │ 299 ETB  │   │
│  │ 3 Months │  [5]    │ 282.15 ETB   │  [5]    │ 850.65   │   │
│  │ 6 Months │  [10]   │ 534.60 ETB   │  [10]   │ 1614.60  │   │
│  │ 1 Year   │  [20]   │ 950.40 ETB   │  [20]   │ 2870.40  │   │
│  └──────────┴─────────┴──────────────┴─────────┴──────────┘   │
│                                                                  │
│  💡 Calculations update in real-time as you type!               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  AFFILIATE MANAGEMENT WITH LIVE CALCULATOR                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DIRECT AFFILIATE                  │  INDIRECT AFFILIATE        │
│  User → Subscriber                 │  Referred → Third Party    │
│  ───────────────────────────────────────────────────────────    │
│  Basic Commission: [20]%           │  Basic Commission: [10]%   │
│  Premium Commission: [25]%         │  Premium Commission: [12]% │
│  Duration: [12] months             │  Duration: [6] months      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💰 LIVE COMMISSION CALCULATOR                           │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  DIRECT EARNINGS    │  INDIRECT EARNINGS                │   │
│  │  ─────────────────  │  ────────────────────             │   │
│  │  Basic Sub:         │  Basic Sub:                       │   │
│  │  19.80 ETB (20%)    │  9.90 ETB (10%)                  │   │
│  │                     │                                   │   │
│  │  Premium Sub:       │  Premium Sub:                     │   │
│  │  74.75 ETB (25%)    │  35.88 ETB (12%)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ⚡ Updates automatically when prices or rates change!          │
└─────────────────────────────────────────────────────────────────┘
```

## Modal: Add/Edit Campaign Package

```
┌─────────────────────────────────────────────────────────┐
│  📣 Add Campaign Package                        [X]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Package Name *                                          │
│  [Up to 3 Days_____________]                            │
│                                                          │
│  Maximum Duration (Days) *                               │
│  [3__]                                                   │
│                                                          │
│  Price per Day (ETB) *                                   │
│  [2000__]                                                │
│                                                          │
│  ☐ Set as Base Package (for discount calculations)      │
│                                                          │
│  Package Label                                           │
│  ○ No Label                                              │
│  ○ [POPULAR] Mark as Popular                            │
│  ○ [MOST POPULAR] Mark as Most Popular                  │
│                                                          │
│  Description                                             │
│  [Short-term campaigns___________]                       │
│                                                          │
│  Package Includes                    [+ Add Feature]     │
│  ┌─────────────────────────────────────────────┐        │
│  │ [Unlimited Impressions__] [Remove]          │        │
│  │ [Priority Placement_____] [Remove]          │        │
│  │ [Advanced Analytics_____] [Remove]          │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│                              [Cancel]  [💾 Save Package] │
└─────────────────────────────────────────────────────────┘
```

## Key Features at a Glance

### 1. Campaign Package Cards

| Feature | Description | Visual |
|---------|-------------|--------|
| **Popular Badge** | Blue badge, top-right | `[POPULAR]` |
| **Most Popular Badge** | Orange-red gradient, top-right | `[MOST POPULAR]` |
| **Base Price Badge** | Gray badge below price | `[BASE PRICE]` |
| **Discount Badge** | Green badge, auto-calculated | `[25% OFF]` |
| **Drag Handle** | Entire card is draggable | 🔄 cursor |
| **Features List** | Checkmarks with text | ✓ Feature |

### 2. Live Calculators

| Calculator | Updates When | Shows |
|-----------|--------------|-------|
| **Subscription Discount** | Base price or discount % changes | Final price & price/month |
| **Affiliate Commission** | Rates or subscription prices change | Commission amount & % |

### 3. Interactive Elements

| Element | Action | Result |
|---------|--------|--------|
| **Add Package** | Opens modal | Create new package |
| **Add Feature** | Creates input field | New feature entry |
| **Remove Feature** | Deletes feature | Feature removed |
| **Edit Package** | Opens modal with data | Modify existing |
| **Delete Package** | Confirms deletion | Package removed |
| **Drag Card** | Reorder packages | Position swapped |

## Quick Actions

### Create a Campaign Package
1. Click "Add Package"
2. Fill name, days, price
3. Select label (optional)
4. Click "Add Feature" for each feature
5. Save

### Set Up Subscription Pricing
1. Enter Basic base price
2. Enter Premium base price
3. Set discount % for each period
4. Watch live calculations update
5. Add features to each tier

### Configure Affiliate Commissions
1. Enter commission rates
2. Watch live calculator update
3. Set program settings
4. Save rates

## Color Coding

- 🔵 **Blue**: Basic tier, Direct affiliate, Popular badge
- 🟣 **Purple**: Premium tier, Program features
- 🟠 **Orange**: Campaign packages, Most Popular badge
- 🟢 **Green**: Discount badges, Success states, Calculator
- 🔴 **Red**: Delete actions, Remove buttons

## Animations

- ✨ **Badge Pulse**: Popular/Most Popular badges
- 🎯 **Value Update**: Green flash when calculator updates
- 🔄 **Drag Visual**: Semi-transparent during drag
- 📍 **Drop Target**: Blue border highlight
- 🎨 **Hover Effects**: Card lift, button transforms

## Keyboard Shortcuts

- **ESC**: Close modals
- **Enter**: Submit forms (when focused on inputs)
- **Tab**: Navigate between inputs

## Tips

💡 **Set a base package first** - Other packages will show discount %
💡 **Features are optional** - But make packages more attractive
💡 **Labels are exclusive** - Only one package can be "Most Popular"
💡 **Live updates** - No need to save to see calculations
💡 **Drag anywhere on card** - Entire card is draggable

## Status Indicators

| Icon | Meaning |
|------|---------|
| `--` | No data / Empty value |
| `✓` | Feature included |
| `🔄` | Drag cursor active |
| `💰` | Commission calculator |
| `📊` | Live pricing display |

---

**Quick Start**: Just start entering base prices and watch everything calculate automatically! 🚀
