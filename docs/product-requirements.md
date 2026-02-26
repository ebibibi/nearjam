# NearJam — Product Requirements Document (PRD)

**Version**: 0.1 (2026-02-26)
**Status**: Draft

---

## 1. Vision

> *"The right musicians, the right songs, the right place — before you even walk in the door."*

NearJam solves the coordination problem in amateur jam sessions by making pre-session planning effortless and post-session history meaningful. It also solves a discovery problem: musicians who want to play specific music can find events and venues they didn't know existed.

---

## 2. Users

### 2.1 User Types

| Type | Description |
|------|-------------|
| **Musician** | An individual who participates in jam sessions. Registers songs they want to play, instruments they play, their session style preferences, and their area. |
| **Venue** | A bar, live house, or community space that hosts jam sessions. Registers their event schedule, the genres/songs they cover, and the instruments they need. |
| **Host** (subset of Venue) | The person who runs a specific session (MC/facilitator). May be the venue owner or a regular musician. Has extra in-session tools. |

> Note: One person can hold both Musician and Venue roles (e.g., a bar owner who also plays).

---

### 2.2 Musician Profile

#### Identity
- Nickname (required, public)
- Real name (optional, private — never shown publicly)
- Profile photo (optional)
- Bio / free text (optional)

#### Playing Profile
| Field | Options | Purpose |
|-------|---------|---------|
| **Instruments** | Guitar, Bass, Drums, Keys, Vocals, Sax, Trumpet, Violin, etc. (multi-select) | Matching with sessions that need your instrument |
| **Genres** | Jazz, J-Pop, Rock, Funk, Blues, Classical, etc. (multi-select + free tag) | Surface relevant sessions |
| **Skill level** | Beginner / Intermediate / Advanced / "Just for fun, level doesn't matter" | Style matching |
| **Session goals** | Have fun / Improve my playing / Both | Style matching |
| **Feedback style** | Welcome detailed feedback / Light feedback OK / No feedback please | Style matching — prevents friction |
| **Session style** | Practice one song deeply / Play many different songs / Either | Match with session format |
| **Preferred tempo** | Relaxed / Moderate / Driving | Soft matching signal |

#### Discovery
| Field | Description |
|-------|-------------|
| **Home area** | Nearest major station or neighborhood (not precise address) |
| **Willing to travel** | 5 km / 15 km / 30 km / Any |
| **Song wishlist** | List of songs the musician wants to play (linked to Song DB) |

#### Social
| Field | Description |
|-------|-------------|
| **SNS links** | Optional: YouTube, Instagram, SoundCloud, X/Twitter, TikTok |
| **Connections** | Mutual opt-in follows (required before DM is unlocked) |

---

### 2.3 Venue Profile

| Field | Description |
|-------|-------------|
| **Venue name** | Public |
| **Address** | Full address (shown on venue page; not embedded in musician matching results) |
| **Access** | Nearest station + walk time |
| **Capacity** | Max musicians per session |
| **Session frequency** | Weekly / Monthly / Irregular |
| **Genres** | What genres the venue focuses on |
| **House instruments** | What's available on-site (PA, drums, piano, etc.) |
| **Entrance fee / system** | Free / Charge / 1-drink minimum / etc. |
| **Contact / reservation** | URL or phone (optional) |

---

## 3. Core Concepts

### 3.1 Song Database

A community-maintained catalog of songs.

| Field | Description |
|-------|-------------|
| Title | Song name |
| Artist / Band | Original artist |
| Genre | Jazz / Rock / J-Pop / etc. |
| Typical key | Most common session key (editable per event) |
| Typical tempo | BPM range |
| Difficulty | Easy / Medium / Hard / "Varies" |
| Tags | e.g., "Tokyo Jihen", "Carpenters", "Hard Bop", "12-bar blues" |
| Wishlist count | How many users have added this to their wishlist (popularity signal) |

### 3.2 Session / Event

Created by a Venue (or Host):

| Field | Description |
|-------|-------------|
| Title | e.g., "Thursday Night Open Session" |
| Date & time | |
| Venue | Linked to venue profile |
| Song list | Planned songs for the night (from Song DB or free text) |
| Instruments needed | Drums? Vocalist? Bass? |
| Format | Open session / Invitation only / Theme night (e.g., "J-Pop only") |
| Max participants | |
| Registration required | Yes / No |

### 3.3 Matching

Matching is **non-exclusive and notification-based** (not a gating mechanism).

**Song-based match**: A musician's song wishlist intersects with a session's song list → notification sent.

**Instrument match**: A session is looking for a specific instrument the musician plays → notification sent.

**Style match**: Session format, goals, and feedback culture align with musician's profile → surface in "Recommended sessions".

**Location match**: Session is within the musician's willing-to-travel radius.

Matching score (internal, not shown to user):

```
score = song_overlap * 0.4 + location_fit * 0.3 + style_fit * 0.2 + instrument_fit * 0.1
```

> This formula is a starting point and will be tuned with real data.

---

## 4. Feature List by Phase

### Phase 1 — MVP

**Musician**
- [ ] Sign up / login (email or Google OAuth)
- [ ] Create musician profile (nickname, instruments, genres, area, skill/goals/style)
- [ ] Add songs to wishlist
- [ ] Browse nearby sessions
- [ ] Register interest in / attendance to a session
- [ ] Add SNS links to profile
- [ ] Connect with another musician (mutual opt-in)

**Venue**
- [ ] Sign up / login
- [ ] Create venue profile
- [ ] Create a session event with song list and instrument needs
- [ ] View registered musicians for a session
- [ ] Manage recurring sessions

**In-Session Tools (Host)**
- [ ] Song queue management (add/reorder songs during session)
- [ ] Part assignment per song (who plays what instrument)
- [ ] Key / tempo notes per song
- [ ] Live log: record each performance (musician × song × instrument)
- [ ] Performance balance dashboard (who's played how many times)

**Notifications**
- [ ] "A session near you is planning a song from your wishlist"
- [ ] "A session near you needs your instrument"
- [ ] "A new session has been posted near you"

### Phase 2 — Growth

- [ ] AI-assisted combination suggestions ("You and these 3 people have never played together and share 5 songs in common")
- [ ] Session history per musician and per venue
- [ ] Monthly digest for recurring sessions ("Last month you played X songs, here are new suggestions")
- [ ] Repeat-session memory: "You played this song 3 months ago — ready to try it again?"
- [ ] Venue analytics: attendance trends, popular songs, instrument gaps
- [ ] Community song submissions and voting

### Phase 3 — Expansion

- [ ] QR code check-in on the night
- [ ] Post-session thank-you notes (musician to musician)
- [ ] Session recording log (optional: link to a recording or video)
- [ ] Paid event support (ticketed sessions)
- [ ] Multi-venue discovery map
- [ ] Mobile app (PWA first, then native)

---

## 5. Safety & Privacy

### 5.1 Identity Protection

| Principle | Implementation |
|-----------|---------------|
| Nicknames only | Real name never displayed publicly; optional for trust verification |
| Location privacy | Only area/neighborhood shown, never home address |
| Attendance privacy | Attendee list visible only to other registered attendees |
| Profile visibility | Musician profile visible to public by default; full details only to logged-in users (configurable) |

### 5.2 Anti-Stalking Measures

The following design choices are specifically intended to prevent harassment and stalking:

1. **No location pinpointing** — "Kashiwa area" not "3-chome, Kashiwa". Home/base location is area-level only.
2. **Attendance gating** — You can only see who's attending a session if you yourself have registered interest in it. Voyeuristic browsing of attendee lists is blocked.
3. **Mutual-only messaging** — No direct messages until both users have explicitly connected. No cold DMs.
4. **Block & report** — Any user can block another user. Blocked users cannot see your profile, wishlist, or attendance. Reports are reviewed by venue and platform admins.
5. **No session-as-dating-app pattern** — Style matching surfaces compatibility for *music*, not personal relationships. The UI avoids dating-app language and patterns (no "swipe", no "like").
6. **Venue as mediator** — Venues are verified. Introductions happen in the context of a real event at a real place, not anonymously online.
7. **Opt-out of discovery** — Musicians can set their profile to "private" (not surfaced in venue searches or recommendations). They can still find and attend sessions manually.

### 5.3 Trust & Verification

- Venues go through a lightweight verification step (link to their existing social media or website)
- Abuse reports are triaged by venue owners first, then platform admins
- Repeat offenders can be platform-banned

---

## 6. SNS Integration

Musicians can optionally link external profiles. These are **display-only** (no OAuth login with these services — just a URL):

| Platform | Use case |
|----------|----------|
| YouTube | Share a performance video so others can hear you play |
| Instagram | General profile link |
| SoundCloud | Share recordings |
| X / Twitter | General social presence |
| TikTok | Short-form performance clips |

**SNS links as trust signals**: A linked YouTube channel with real videos makes a profile feel more credible and reduces anonymous bad behavior.

---

## 7. Non-Goals (Out of Scope)

- Booking professional session musicians for recording work (that's Supreme Tracks)
- Online/remote jam sessions (that's SYNCROOM)
- Teaching or lesson matching
- Paid session tracking or royalty management
- Band/group formation for original music (that's BandMix)

---

## 8. Success Metrics (Initial)

| Metric | Target (6 months) |
|--------|-------------------|
| Registered musicians | 50 |
| Registered venues | 5 |
| Sessions created | 20 |
| Song wishlist items | 300 |
| Notifications sent with match | 100 |
| Musicians who attended a session they found via NearJam | 10 |

---

## 9. Open Questions

- [ ] Should venue profiles be free, or is there a paid tier for venues?
- [ ] How do we handle songs not in the DB yet? (Free-text entry vs. "request to add")
- [ ] What's the minimum viable Song DB to launch? (Seed with J-Pop/Jazz top 200?)
- [ ] Should matching notifications be push (PWA) or email only?
- [ ] Should sessions have a public page shareable on SNS?
