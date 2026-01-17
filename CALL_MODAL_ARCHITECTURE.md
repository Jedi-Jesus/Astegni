# Standalone Chat Call Modal - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Any Page (tutor-profile, student-profile, etc.)       │    │
│  │                                                         │    │
│  │  ┌──────────────────────────────────────────────┐     │    │
│  │  │  Page Content (visible)                      │     │    │
│  │  │  - Profile info                              │     │    │
│  │  │  - Feeds, videos, etc.                       │     │    │
│  │  └──────────────────────────────────────────────┘     │    │
│  │                                                         │    │
│  │  ┌──────────────────────────────────────────────┐     │    │
│  │  │  Standalone Call Modal (hidden by default)   │     │    │
│  │  │  - z-index: 10002 (always on top)            │     │    │
│  │  │  - Listens for WebSocket events              │     │    │
│  │  │  - Auto-shows on incoming call               │     │    │
│  │  └──────────────────────────────────────────────┘     │    │
│  │                                                         │    │
│  │  JavaScript:                                            │    │
│  │  - StandaloneChatCallManager (global instance)         │    │
│  │  - WebSocket listener                                  │    │
│  │  - WebRTC connection manager                           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────┬───────────────────────────┬──────────────────┘
                   │                           │
                   │ WebSocket                 │ WebRTC (P2P)
                   │ (Signaling)               │ (Media Streams)
                   │                           │
    ┌──────────────▼──────────────┐   ┌────────▼─────────────────┐
    │   Backend Server            │   │   Other User's Browser   │
    │   - FastAPI                 │   │   - Audio/Video Stream   │
    │   - WebSocket Manager       │   │   - Peer Connection      │
    │   - Call Endpoints          │   └──────────────────────────┘
    │   - Database (call logs)    │
    └─────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Standalone Call Modal Components                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  StandaloneChatCallManager (Singleton Class)           │    │
│  │                                                         │    │
│  │  Properties:                                            │    │
│  │  - currentCall: Object                                  │    │
│  │  - peerConnection: RTCPeerConnection                    │    │
│  │  - localStream: MediaStream                             │    │
│  │  - remoteStream: MediaStream                            │    │
│  │  - callTimer: Interval                                  │    │
│  │  - isMuted: Boolean                                     │    │
│  │  - isVideoEnabled: Boolean                              │    │
│  │  - callMode: 'voice' | 'video'                          │    │
│  │                                                         │    │
│  │  Methods:                                               │    │
│  │  - initialize()                                         │    │
│  │  - setupWebSocketListeners()                            │    │
│  │  - handleIncomingCall(data)                             │    │
│  │  - acceptIncomingCall()                                 │    │
│  │  - declineIncomingCall()                                │    │
│  │  - initializeWebRTC()                                   │    │
│  │  - toggleChatMute()                                     │    │
│  │  - toggleChatCallVideo()                                │    │
│  │  - switchCallMode()                                     │    │
│  │  - endChatCall()                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  UI Components (HTML)                                   │    │
│  │                                                         │    │
│  │  1. Incoming Call Screen                               │    │
│  │     - Caller avatar with pulse animation               │    │
│  │     - Caller name and role                             │    │
│  │     - Call type indicator                              │    │
│  │     - Accept/Decline buttons                           │    │
│  │                                                         │    │
│  │  2. Active Call Screen                                 │    │
│  │     - Call header (user info, close button)            │    │
│  │     - Call timer                                       │    │
│  │     - Video container (main + PIP)                     │    │
│  │     - Voice wave animation (for voice calls)           │    │
│  │     - Call controls (mute, video, mode, end)           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Call Flow Diagram

### Incoming Call Flow

```
┌──────────────┐                                    ┌──────────────┐
│  Caller      │                                    │  Receiver    │
│  (Browser A) │                                    │  (Browser B) │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │  1. User clicks "Call" button                    │
       ├──────────────────────────────────────────────────┤
       │                                                   │
       │  2. WebSocket: incoming_call                     │
       │  {                                                │
       │    type: "incoming_call",                        │
       │    caller_name: "John Doe",                      │
       │    call_type: "voice"                            │
       │  }                                                │
       ├──────────────────────────────────────────────────>
       │                                                   │
       │                   3. Modal pops up automatically │
       │                      (Incoming Call Screen)      │
       │                                                   │
       │                   4. User clicks "Accept"        │
       │                                                   │
       │  5. WebSocket: call_accepted                     │
       │ <─────────────────────────────────────────────────┤
       │                                                   │
       │  6. WebRTC Offer (via WebSocket)                 │
       ├──────────────────────────────────────────────────>
       │                                                   │
       │  7. WebRTC Answer (via WebSocket)                │
       │ <─────────────────────────────────────────────────┤
       │                                                   │
       │  8. ICE Candidates Exchange                      │
       │ <────────────────────────────────────────────────>
       │                                                   │
       │  9. Direct P2P Connection Established            │
       │ ══════════════════════════════════════════════════│
       │         (Audio/Video streams directly)           │
       │                                                   │
       │  10. Active Call Screen shows                    │
       │      - Call timer starts                         │
       │      - Media streams visible                     │
       │                                                   │
```

### Call Decline Flow

```
┌──────────────┐                                    ┌──────────────┐
│  Caller      │                                    │  Receiver    │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │  1. WebSocket: incoming_call                     │
       ├──────────────────────────────────────────────────>
       │                                                   │
       │                   2. Modal pops up               │
       │                                                   │
       │                   3. User clicks "Decline"       │
       │                                                   │
       │  4. WebSocket: call_declined                     │
       │ <─────────────────────────────────────────────────┤
       │                                                   │
       │  5. Show "Call Declined" notification            │
       │                                                   │
       │                   6. Modal closes                │
       │                                                   │
```

### End Call Flow

```
┌──────────────┐                                    ┌──────────────┐
│  User A      │                                    │  User B      │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │  (Active call in progress)                       │
       │ ══════════════════════════════════════════════════│
       │                                                   │
       │  1. User clicks "End Call"                       │
       │                                                   │
       │  2. Stop local media tracks                      │
       │  3. Close peer connection                        │
       │  4. Stop call timer                              │
       │                                                   │
       │  5. WebSocket: call_ended                        │
       ├──────────────────────────────────────────────────>
       │                                                   │
       │  6. Modal closes                                 │
       │                                                   │
       │                   7. Receive call_ended          │
       │                   8. Clean up streams            │
       │                   9. Modal closes                │
       │                                                   │
```

## WebSocket Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket Events                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Browser → Server (Outgoing)                                │
│  ┌────────────────────────────────────────────┐            │
│  │  call_accepted                             │            │
│  │  call_declined                             │            │
│  │  call_ended                                │            │
│  │  webrtc_offer                              │            │
│  │  webrtc_answer                             │            │
│  │  ice_candidate                             │            │
│  │  call_mode_changed                         │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
│  Server → Browser (Incoming)                                │
│  ┌────────────────────────────────────────────┐            │
│  │  incoming_call        ──> Show modal       │            │
│  │  call_ended           ──> Close modal      │            │
│  │  webrtc_offer         ──> Create answer    │            │
│  │  webrtc_answer        ──> Set remote desc  │            │
│  │  ice_candidate        ──> Add candidate    │            │
│  │  call_mode_changed    ──> Update UI        │            │
│  └────────────────────────────────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## WebRTC Connection Flow

```
┌─────────────────────────────────────────────────────────────┐
│              WebRTC Peer Connection Setup                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Get User Media                                          │
│     navigator.mediaDevices.getUserMedia({                   │
│       audio: true,                                          │
│       video: callMode === 'video'                           │
│     })                                                       │
│     │                                                        │
│     ├─ Success ──> localStream                              │
│     └─ Error ───> Show permission error                     │
│                                                              │
│  2. Create Peer Connection                                  │
│     new RTCPeerConnection({                                 │
│       iceServers: [                                         │
│         { urls: 'stun:stun.l.google.com:19302' }           │
│       ]                                                      │
│     })                                                       │
│                                                              │
│  3. Add Local Tracks                                        │
│     localStream.getTracks().forEach(track =>                │
│       peerConnection.addTrack(track, localStream)           │
│     )                                                        │
│                                                              │
│  4. Handle Events                                           │
│     ontrack          ──> Display remote video               │
│     onicecandidate   ──> Send via WebSocket                 │
│     onconnectionstatechange ──> Update UI                   │
│                                                              │
│  5. Create & Exchange Offer/Answer                          │
│     Caller:                                                 │
│       createOffer() ──> setLocalDescription()               │
│                     ──> Send via WebSocket                  │
│     Callee:                                                 │
│       setRemoteDescription(offer)                           │
│       createAnswer() ──> setLocalDescription()              │
│                      ──> Send via WebSocket                 │
│                                                              │
│  6. Exchange ICE Candidates                                 │
│     onicecandidate ──> Send to remote via WebSocket         │
│     Receive        ──> addIceCandidate()                    │
│                                                              │
│  7. Connection Established                                  │
│     State: connected ──> Media flows peer-to-peer           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                   Modal States                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  IDLE                                                        │
│    │                                                         │
│    │ incoming_call event                                    │
│    ▼                                                         │
│  INCOMING                                                    │
│    │                                                         │
│    ├─ Accept ──┐                                            │
│    │           ▼                                             │
│    │         CONNECTING                                      │
│    │           │                                             │
│    │           │ WebRTC established                          │
│    │           ▼                                             │
│    │         ACTIVE                                          │
│    │           │                                             │
│    │           │ end_call                                    │
│    │           ▼                                             │
│    ├─ Decline ─┤                                            │
│    │           │                                             │
│    ▼           ▼                                             │
│  IDLE         IDLE                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
Astegni/
├── modals/
│   └── common-modals/
│       └── chat-call-modal.html          ← Modal HTML structure
│
├── css/
│   └── common-modals/
│       └── chat-call-modal.css           ← Modal styling
│
├── js/
│   └── common-modals/
│       └── chat-call-modal.js            ← Manager logic
│
└── profile-pages/
    ├── tutor-profile.html                ← Integrated ✅
    ├── student-profile.html              ← Integrated ✅
    └── parent-profile.html               ← Integrated ✅
```

## Security Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Authentication                                          │
│     - JWT tokens required for WebSocket connection          │
│     - User must be logged in to receive calls               │
│                                                              │
│  2. Authorization                                           │
│     - Only existing chat contacts can call                  │
│     - Backend validates relationships                        │
│                                                              │
│  3. HTTPS/WSS                                               │
│     - WebRTC requires secure context                        │
│     - All signaling over secure WebSocket                   │
│                                                              │
│  4. Browser Permissions                                     │
│     - User must grant camera/microphone access              │
│     - Permissions requested only when call accepted         │
│                                                              │
│  5. Data Privacy                                            │
│     - Media streams peer-to-peer (not through server)       │
│     - Call metadata logged (optional)                       │
│     - No recording without explicit consent                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimizations

```
┌─────────────────────────────────────────────────────────────┐
│                  Performance Features                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Lazy Loading                                            │
│     - Modal HTML loaded only once on page load              │
│     - WebRTC initialized only when call starts              │
│                                                              │
│  2. Resource Cleanup                                        │
│     - Media tracks stopped when call ends                   │
│     - Peer connection closed properly                       │
│     - Event listeners removed                               │
│                                                              │
│  3. Efficient Rendering                                     │
│     - CSS animations use GPU acceleration                   │
│     - Video elements use hardware acceleration              │
│                                                              │
│  4. Network Optimization                                    │
│     - STUN servers for NAT traversal                        │
│     - Direct P2P connection (no media relay)                │
│     - Adaptive bitrate (handled by WebRTC)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Architecture Version**: 1.0
**Last Updated**: 2026-01-16
**Status**: Production Ready
