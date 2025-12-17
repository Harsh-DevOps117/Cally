# 🎥 Cally — Real-Time Video Calling App
### WebRTC + Socket.IO | React + Node.js

Cally is a **real-time peer-to-peer video calling application** built from first principles using **WebRTC** for media transport and **Socket.IO** for signaling.
No SaaS wrappers. No magic SDKs. You deal directly with SDP, ICE, and peer connections.

If you understand this project, you understand how Zoom-level primitives actually work.

---

## 🚀 Features

- One-to-One Video Calling
- Real-Time Audio & Video Streaming
- Socket.IO Signaling Server
- WebRTC Peer-to-Peer Media Transport
- SDP Offer / Answer Exchange
- ICE Candidate Negotiation
- React-based Frontend
- Node.js + Express Backend
- Low-latency communication (UDP-based)

---

## 🧠 Architecture Overview

```mermaid
graph TD
    subgraph Client A [React Client A]
        A[User Interface]
        B[WebRTC Agent]
        C[Socket Client]
    end

    subgraph Client B [React Client B]
        D[User Interface]
        E[WebRTC Agent]
        F[Socket Client]
    end

    subgraph Server [Node.js Signaling Server]
        G[Socket.IO Server]
    end

    C -- SDP / ICE Candidates --> G
    F -- SDP / ICE Candidates --> G
    G -- Relay Signals --> C
    G -- Relay Signals --> F

    B <== Peer-to-Peer Media Stream ==> E
