# Whiteboard Text Tool - Where Text Appears (Visual Guide)

## The Question: "When I write something, it appears where?"

Great question! The text appears in **THREE places simultaneously** as you type, creating a seamless writing experience. Let me show you:

---

## The Three Display Locations

### Visual Overview:
```
┌─────────────────────────────────────────────────────────────┐
│  WHITEBOARD CANVAS AREA                                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Canvas (Background)                                │    │
│  │                                                     │    │
│  │    [Location 2: Real-time Preview on Canvas]      │    │
│  │         "Hello Worl" ← Semi-transparent text      │    │
│  │                                                     │    │
│  │    ┌─────────────────────────────┐                │    │
│  │    │ [Location 1: Text Overlay] │                 │    │
│  │    │ ┌─────────────────────────┐ │                │    │
│  │    │ │ Hello World█            │ │ ← You type here│    │
│  │    │ └─────────────────────────┘ │                │    │
│  │    │  [✓] [✕]                   │                 │    │
│  │    └─────────────────────────────┘                │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

[Location 3: Other Participants' Screens]
  (Sees real-time typing preview via WebSocket)
```

---

## Detailed Breakdown: The 3 Display Locations

### **Location 1: Text Input Overlay (Where YOU Type)** ✍️

**Element:** `<textarea id="canvasTextOverlay">`

**Appearance:**
```
┌──────────────────────────────────┐
│ Hello World█                     │  ← Cursor blinks here
│                                  │  ← White/semi-transparent background
│                                  │  ← Blue border (2px solid)
└──────────────────────────────────┘
   [✓ Confirm]  [✕ Cancel]
```

**Location on Screen:**
- Appears **exactly where you clicked** on the canvas
- Positioned using absolute coordinates: `left: ${x}px; top: ${y}px`
- Floats **on top of the canvas** with `z-index: 1000`
- Has white/semi-transparent background so you can see what you're typing

**What You See:**
- Your text cursor blinking (you can type naturally)
- Your text as you type it (normal textarea behavior)
- Auto-resizes as you type more text
- Confirm/Cancel buttons below (in some implementations)

**Code Reference:**
```javascript
// File: js/tutor-profile/whiteboard-manager.js, line ~1850-1875
textOverlay = document.createElement('textarea');
textOverlay.id = 'canvasTextOverlay';
textOverlay.style.cssText = `
    position: absolute;
    background: rgba(255, 255, 255, 0.95);  // ← White background
    border: 2px solid #3b82f6;              // ← Blue border
    padding: 8px;
    font-size: ${this.strokeWidth * 6}px;   // ← Font size
    color: ${this.strokeColor};             // ← Text color
    z-index: 1000;                          // ← On top of canvas
`;

// Position at click location
textOverlay.style.left = `${overlayX}px`;
textOverlay.style.top = `${overlayY}px`;
```

---

### **Location 2: Real-Time Canvas Preview (Where TEXT Appears)** 🎨

**Element:** Canvas context rendering (semi-transparent preview)

**Appearance:**
```
Canvas Background
    ↓
Your Text Appears Here (70% opacity)
    ↓
"Hello World" ← Semi-transparent, live preview
```

**Location on Screen:**
- Appears **on the actual canvas** at the SAME position as the text overlay
- Rendered using canvas 2D context `fillText()`
- **Semi-transparent** (70% opacity) so you know it's a preview
- Updates **live as you type** each character

**What You See:**
- Your text appearing on the canvas in real-time
- Same position as where you clicked
- Same color as your stroke color
- Same font size as stroke width × 6
- Slightly faded (70% opacity) to indicate it's a preview

**Code Reference:**
```javascript
// File: js/tutor-profile/whiteboard-manager.js, line ~1917-1932
const updateTextPreview = () => {
    const currentText = textOverlay.value;

    // Redraw page to clear old preview
    this.redrawPage();

    // Draw current text as preview (semi-transparent)
    if (currentText) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.7; // ← 70% opacity (semi-transparent)
        this.drawTextDirectly(currentText, this.pendingTextPosition.x, this.pendingTextPosition.y);
        this.ctx.restore();
    }

    // Broadcast typing preview to other participants
    this.broadcastTextTyping(currentText, this.pendingTextPosition.x, this.pendingTextPosition.y);
};
```

**When This Updates:**
- **Every time you type a character** (via `input` event listener)
- **Every time you press Enter** (new line)
- **Every time you delete a character** (backspace)

---

### **Location 3: Other Participants' Canvas (Real-Time Sync)** 🌐

**Element:** Remote participants' canvas via WebSocket broadcast

**Appearance:**
```
[Participant's Screen]

Canvas Background
    ↓
They See Your Text Appear Live
    ↓
"Hello World" ← Same position, same style, real-time
```

**Location on Screen:**
- Appears **on other participants' canvases**
- **Same position** as on your canvas (x, y coordinates synced)
- **Same color, font, style** (all properties broadcasted)
- Updates **live as you type** (throttled to every 100ms to avoid flooding)

**What Other Participants See:**
- Your text appearing character by character in real-time
- Same semi-transparent preview style (70% opacity)
- Same position on their canvas as on yours
- A notification at the top: "Alice is typing..."

**Code Reference:**
```javascript
// File: js/tutor-profile/whiteboard-manager.js, line ~1932
// Broadcast typing preview to other participants in real-time
this.broadcastTextTyping(currentText, this.pendingTextPosition.x, this.pendingTextPosition.y);

// In broadcastTextTyping() method (line ~3864-3890)
broadcastTextTyping(text, x, y) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Throttle to max 10 messages per second (every 100ms)
    const now = Date.now();
    if (this.lastTextTypingBroadcast && now - this.lastTextTypingBroadcast < 100) {
        return;
    }

    const message = {
        type: 'whiteboard_text_typing',
        session_id: this.currentSession?.id,
        text: text,
        x: x,
        y: y,
        color: this.strokeColor,
        fontSize: this.strokeWidth * 6,
        sender_id: this.profileId,
        sender_name: this.userRole === 'tutor'
            ? (this.tutorInfo?.full_name || 'Tutor')
            : (this.studentInfo?.full_name || 'Student'),
        timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(message));
    this.lastTextTypingBroadcast = now;
}
```

---

## Complete Flow: From Typing to Display

### Step-by-Step: What Happens When You Type

```
USER ACTION: You click canvas at position (x: 300, y: 200)
    ↓
STEP 1: Text overlay appears at (300, 200)
    ┌─────────────────────┐
    │ █                   │ ← Cursor blinks here
    └─────────────────────┘

USER ACTION: You type "H"
    ↓
STEP 2: Three things happen simultaneously:

  2A. Text Overlay Updates (Location 1)
    ┌─────────────────────┐
    │ H█                  │ ← "H" appears in textarea
    └─────────────────────┘

  2B. Canvas Preview Updates (Location 2)
    Canvas at (300, 200):
    "H" ← Semi-transparent, 70% opacity

  2C. WebSocket Broadcast (Location 3)
    Message sent: { text: "H", x: 300, y: 200 }
        ↓
    Other participants see "H" on their canvas at (300, 200)

USER ACTION: You type "e"
    ↓
STEP 3: All three locations update again:

  3A. Text Overlay:
    ┌─────────────────────┐
    │ He█                 │
    └─────────────────────┘

  3B. Canvas Preview:
    "He" ← Updated preview at (300, 200)

  3C. WebSocket:
    Message sent: { text: "He", x: 300, y: 200 }
    Other participants see "He"

USER ACTION: You type "llo World"
    ↓
STEP 4: Continue same pattern...

  4A. Text Overlay:
    ┌─────────────────────┐
    │ Hello World█        │
    └─────────────────────┘

  4B. Canvas Preview:
    "Hello World" ← Preview at (300, 200), 70% opacity

  4C. WebSocket:
    Message sent: { text: "Hello World", x: 300, y: 200 }
    Other participants see "Hello World"

USER ACTION: You click outside the text box OR press Escape
    ↓
STEP 5: Text is finalized

  5A. Text Overlay DISAPPEARS
    (Hidden: display: none)

  5B. Canvas Preview BECOMES PERMANENT
    Canvas at (300, 200):
    "Hello World" ← Now 100% opacity (solid)
    Saved to database as stroke

  5C. WebSocket Broadcast (Final)
    Message sent: { type: 'whiteboard_stroke', ... }
    Other participants see final text (solid, permanent)
```

---

## Visual Example: Side-by-Side View

### YOUR Screen (While Typing):

```
┌─────────────────────────────────────────────────────────┐
│  WHITEBOARD - You are typing                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Pen] [Text] [Eraser] [Line] [Rectangle] [Circle]     │
│                                                          │
│  Canvas:                                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │                                                 │    │
│  │    "Hello World" ← Semi-transparent preview    │    │
│  │         ↓ (on canvas, 70% opacity)             │    │
│  │    ┌──────────────────────┐                    │    │
│  │    │ Hello World█         │ ← Text overlay     │    │
│  │    │ (You type here)      │    (white bg)      │    │
│  │    └──────────────────────┘                    │    │
│  │                                                 │    │
│  │                                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### PARTICIPANT's Screen (Watching You Type):

```
┌─────────────────────────────────────────────────────────┐
│  WHITEBOARD - Watching Alice type                       │
├─────────────────────────────────────────────────────────┤
│  ℹ️ Alice is typing...                                  │
│                                                          │
│  [Pen] [Text] [Eraser] [Line] [Rectangle] [Circle]     │
│                                                          │
│  Canvas:                                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │                                                 │    │
│  │    "Hello World" ← Semi-transparent preview    │    │
│  │         (Real-time sync from Alice)            │    │
│  │         (70% opacity, same position)           │    │
│  │                                                 │    │
│  │    [NO text overlay - only Alice has it]       │    │
│  │                                                 │    │
│  │                                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### AFTER You Finish (Click Outside):

```
┌─────────────────────────────────────────────────────────┐
│  WHITEBOARD - Text finalized                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Pen] [Text] [Eraser] [Line] [Rectangle] [Circle]     │
│                                                          │
│  Canvas:                                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │                                                 │    │
│  │    "Hello World" ← SOLID text (100% opacity)   │    │
│  │         (Saved to database)                    │    │
│  │         (Text overlay GONE)                    │    │
│  │         (Permanent on canvas)                  │    │
│  │                                                 │    │
│  │                                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Why Three Locations?

### **Location 1 (Text Overlay):** Input Interface
- **Purpose:** Let you type text naturally with keyboard
- **Why:** Canvas doesn't natively support text input
- **Benefit:** Native browser text editing (cursor, selection, copy/paste)

### **Location 2 (Canvas Preview):** Visual Feedback
- **Purpose:** Show you where text will appear on canvas
- **Why:** You need to see the final result as you type
- **Benefit:** WYSIWYG (What You See Is What You Get)

### **Location 3 (Remote Preview):** Real-Time Collaboration
- **Purpose:** Let other participants see you typing live
- **Why:** Collaborative whiteboard experience
- **Benefit:** Everyone stays in sync, no surprises

---

## Common Questions

### Q: Why do I see TWO texts while typing (overlay + canvas)?
**A:** This is intentional! The text overlay is where you TYPE, the canvas preview shows WHERE the text will appear permanently. They're at the same position but serve different purposes.

### Q: Why is the canvas text semi-transparent (70% opacity)?
**A:** To indicate it's a PREVIEW, not the final text. When you finish (click outside), it becomes solid and permanent.

### Q: Can I move the text after I start typing?
**A:** Not currently. The text position is set when you click. If you want to reposition, press Escape (cancel), then click at a new position.

### Q: Do other participants see the text overlay (white box)?
**A:** NO! They only see the canvas preview. The text overlay is LOCAL to you (the person typing).

### Q: What happens if I click outside before finishing?
**A:** The text is automatically finalized and saved permanently to the canvas at 100% opacity.

### Q: What happens if I press Escape?
**A:** The text is cancelled and removed completely (preview disappears, nothing saved).

---

## Technical Summary

| Location | Element Type | Purpose | Visibility | Opacity |
|----------|-------------|---------|------------|---------|
| **Text Overlay** | `<textarea>` | Input interface | You only | 100% (white bg) |
| **Canvas Preview (You)** | Canvas 2D context | Visual preview | You only | 70% (semi-transparent) |
| **Canvas Preview (Others)** | Canvas 2D context | Real-time sync | Other participants | 70% (semi-transparent) |
| **Final Text** | Canvas 2D context | Permanent result | Everyone | 100% (solid) |

---

## Interaction Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  TEXT TOOL COMPLETE FLOW                                     │
└──────────────────────────────────────────────────────────────┘

1. Click Canvas (x, y)
        ↓
2. Text Overlay Appears at (x, y)
   ┌─────────────┐
   │ █ Cursor    │ ← You see this (white box)
   └─────────────┘
        ↓
3. You Type "Hello"
        ↓
   Text Overlay:        Canvas Preview:      Remote Participants:
   ┌─────────────┐      "Hello" (70%)       "Hello" (70%)
   │ Hello█      │      ↑ On canvas         ↑ On their canvas
   └─────────────┘      ↑ Your screen       ↑ Via WebSocket
        ↓
4. You Click Outside / Press Escape
        ↓
   Text Overlay:        Canvas Final:        Remote Participants:
   [HIDDEN]             "Hello" (100%)       "Hello" (100%)
                        ↑ Solid, saved       ↑ Solid, permanent
```

---

## Summary

### When you write text using the Text tool:

1. **You type in a white text box** (text overlay) that appears where you clicked
2. **You see a semi-transparent preview** on the canvas at the same position (70% opacity)
3. **Other participants see the same preview** in real-time on their canvas (live sync)
4. **When you finish**, the text overlay disappears and the text becomes permanent on the canvas (100% opacity)

All three happen **simultaneously and automatically** - you don't need to do anything special!

---

**Quick Answer:** Text appears in **3 places**:
1. ✍️ **Text overlay** (where you type - white box with cursor)
2. 🎨 **Canvas preview** (where it will be - semi-transparent)
3. 🌐 **Other participants' canvas** (real-time sync - semi-transparent)

Then becomes **permanent** on the canvas when you finish (solid, 100% opacity, saved to database).
