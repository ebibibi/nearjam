# NearJam — Product Requirements Document (PRD)

**Version**: 0.4（2026-02-27）
**Status**: Draft

---

## 1. Vision

> *"Before you open the door — the right musicians are playing the right songs in the right place."*

NearJam solves two problems that amateur jam sessions face:

1. **Coordination cost** — Reduce wasted time on the day by making preparation easy
2. **Discovery problem** — Eliminate the situation where musicians miss sessions playing the songs and styles they love

**v0.3 additions**: NearJam also acts as a **discovery platform for venues and studios** — crowdsourced session info, automatic collection from venue SNS/websites, and Google Maps integration so you can find the right place before you arrive.

---

## 2. User Definitions

### 2.1 User Types

| Type | Description |
|------|-------------|
| **Musician** | An individual who participates in jam sessions. Registers instruments, songs, style preferences, and coverage areas. |
| **Venue** (セッション会場) | A bar, live house, or community space that hosts jam sessions. Can be registered by anyone (crowdsource), automatically collected from SNS/HP, or claimed/verified by the owner. |
| **Studio** (練習スタジオ) | A rehearsal studio with multiple rooms that can be used for organized jam sessions. Same 3-way registration model as venues. |
| **Session Admin** | The person who created a specific session. May be a venue owner or a regular musician. Has session-level management rights — delegatable to others. |

> **Content contribution model for Venues and Studios**:
> Information about places can come from three sources, in increasing trust order:
> 1. 🤖 **Auto-collected** — NearJam bot scrapes venue SNS accounts, HP, event pages and extracts session patterns automatically (requires human review before publishing)
> 2. 👥 **Crowdsourced** — Any logged-in musician can add or edit venue/studio info and session tendency descriptions based on their experiences
> 3. ✅ **Owner-verified** — The venue/studio owner completes the verification flow (§2.6), gaining full control and a verified badge

---

### 2.2 Musician Profile

#### Identity
- Nickname (required, public)
- Real name (optional, private — not shown on public profile)
- Profile photo (optional)
- Bio text (optional)

#### Performance Profile

| Field | Options | Purpose |
|-------|---------|---------|
| **Instruments** | Guitar, Bass, Drums, Keyboard, Vocals, Sax, Trumpet, Violin, etc. (multiple) | Instrument matching with sessions |
| **Genres** | Jazz, J-Pop, Rock, Funk, Blues, Classical, etc. (multiple + free-text tags) | Relevant session discovery |
| **Years playing** | <1yr / 1–3yr / 3–10yr / 10yr+ | Supplementary self-reported skill info |
| **Skill level** | Beginner / Intermediate / Advanced / "Level doesn't matter, just fun" | Style matching |
| **Level preference** | Want same level / Want to play with better musicians / Either | Matching filter |
| **Session goal** | Have fun / Get better / Both | Style matching |
| **Playing volume preference** | Play a lot / Just a few songs is fine / Either | Prevent "not enough turns" or "overwhelmed by turns" frustration |
| **Challenge attitude** | Only songs I know / Happy to try new things / Either | Aligning expectations around song range |
| **Feedback attitude** | Detailed feedback welcome / Light OK / No feedback please | Style matching — preventing friction |
| **Session style** | Practice one song deeply / Experience many songs broadly / Either | Session format matching |
| **Preferred pace** | Relaxed / Moderate / Intense | Soft matching signal |

#### Discovery Settings

| Field | Description |
|-------|-------------|
| **Home area** | Nearest station or district (no precise address needed) |
| **Travel range** | 5km / 15km / 30km / No limit |
| **Coverage areas** | Additional areas beyond home base where the musician can play (e.g., commute route, second city). Multiple selections. **Visibility: public/private selectable.** |
| **SYNCROOM availability** | Whether the musician can join online SYNCROOM sessions. Optionally: which SYNCROOM rooms they typically use, connection environment notes. **Visibility: public/private selectable.** |
| **Wishlist** | Songs the musician wants to play (linked to the song database) |

#### Performance History

A performance log (venue, session name, date, songs, parts) accumulates automatically for each session participation.

| Setting | Description |
|---------|-------------|
| **History visibility** | Private / Logged-in users only / Public (default: Private) |
| **Per-session override** | Even if global is private, "just this session" can be public. And vice versa. |

#### Social

| Field | Description |
|-------|-------------|
| **SNS links** | Optional: YouTube, Instagram, SoundCloud, X, TikTok |
| **Connections** | Mutual-approval follow (DM unlocked only after both approve) |

---

### 2.3 Venue Profile (セッション会場)

A venue is a bar, live house, or event space that hosts jam sessions.

#### Basic Info

| Field | Description |
|-------|-------------|
| **Name** | Public |
| **Address** | Shown on venue page (not embedded in musician search results) |
| **Access** | Nearest station + walking time |
| **Website / SNS** | Used for auto-collection and verification |
| **Booking / Inquiry** | URL or phone number (optional) |

#### Session Tendencies (口コミ可能・複数登録可)

Because the same venue often hosts completely different session concepts on different days, **session tendencies are registered as separate entries** — not a single monolithic profile. Both owners and musicians can add entries.

| Field | Description |
|-------|-------------|
| **Tendency name** | e.g., "Thursday Night Jazz Session", "Friday Rock Jam" |
| **Typical day/time** | e.g., "Every Thursday from 19:00" (approximate, not a specific event date) |
| **General genres** | What genres are typically played |
| **Typical songs** | Common songs at this session pattern (crowd-sourced, auto-aggregated from logs) |
| **Instruments typically needed** | e.g., "Usually needs drums and bass" |
| **Atmosphere / Level** | Beginner-friendly / Intermediate+ / Advanced / Mixed |
| **Entry system** | Free / Pay / One-drink minimum / etc. |
| **Capacity** | Max participants per session |
| **House equipment** | PA, drums, piano, etc. available on the day |
| **Equipment details** | Drum brand/cymbal count, amp watt, PA mixer spec, mic stand count, etc. |
| **Rules / Manner page** | Free-text description: "how this place works", "unspoken rules", "first-time FAQ". Only editable by verified owner. |
| **Info source** | 🤖 Auto-collected / 👥 Crowdsourced by: [user] / ✅ Owner-verified |
| **Last updated** | Timestamp |

> **Why multiple tendencies per venue?** A jazz bar on Thursday might run a completely different session concept on Saturday. Forcing one profile per venue loses this nuance. Multiple entries let the community accurately describe what actually happens.

#### Verification Status

| Level | Badge | Condition |
|-------|-------|-----------|
| **Unverified** | ⚠️ Unverified | Email confirmation only |
| **Verified** | ✅ Verified | HP email or SNS code check completed |
| **Disputed** | 🔒 Under Review | Ownership conflict — rights temporarily frozen |

---

### 2.4 Studio Profile (練習スタジオ)

A rehearsal studio where musicians can rent rooms for organized jam sessions.

#### Basic Info

| Field | Description |
|-------|-------------|
| **Studio name** | Public |
| **Address** | Shown on studio page |
| **Access** | Nearest station + walking time |
| **Website / SNS** | For auto-collection and verification |
| **Opening hours** | |
| **Booking method** | Online / Phone / Walk-in |

#### Rooms (1 studio has multiple rooms)

| Field | Description |
|-------|-------------|
| **Room name / number** | e.g., "Room A", "Studio 3" |
| **Capacity** | How many people fit |
| **Size** | e.g., "15 sqm" |
| **Equipment** | Drums (yes/no + spec), PA (yes/no + spec), piano/keyboard, amps, mics, etc. |
| **Hourly rate** | Pricing (optionally with time-of-day variations: peak/off-peak) |
| **Block booking** | Minimum booking unit (e.g., 1hr, 2hr) |
| **Notes** | Additional info, restrictions |

#### NearJam Session Support

Studios in NearJam are not just for independent bookings. They can be used for **NearJam-organized sessions** where a group of musicians matched via NearJam arrange to meet at a nearby studio.

- Studio can appear in "suggested venues" when musicians want to organize a private session
- Wishlist-based clustering: "3 people near Kashiwa all want to play the same song → suggested: Studio X in Kashiwa"

---

### 2.5 Place Discovery & Google Maps Integration

All venues and studios are displayed on a map.

| Feature | Description |
|---------|-------------|
| **Map view** | Venues and studios plotted on Google Maps |
| **Cluster view** | Zoom out shows clustered pins by area |
| **Place detail** | Click a pin → venue/studio profile with session tendencies |
| **Route guidance** | "Get directions from home" — integrates with Google Maps routing |
| **Filter on map** | Filter by genre, session tendency, day of week, SYNCROOM availability, etc. |
| **Home area** | Musician's home area shown as a radius on the map (private — only visible to themselves) |

---

### 2.6 Venue / Studio Verification and Impersonation Prevention

#### Trust Levels

| Level | Badge | Condition | Granted Permissions |
|-------|-------|-----------|---------------------|
| **Unverified** | ⚠️ Unverified | Email confirmation only | Basic session creation, participant management |
| **Verified** | ✅ Verified | HP email confirmation or SNS code check completed | Performance log control, venue stats, rules page publishing |
| **Disputed** | 🔒 Under Review | Ownership conflict claimed | Permissions frozen pending resolution |

> **Display to musicians**: Sessions from unverified venues show "⚠️ This venue has not completed identity verification." Not a barrier to participation — just information for their decision.

#### Verification Methods

**Primary: HP Email Verification**

```
① Venue enters HP URL (e.g., https://bar-example.com)
② NearJam fetches the page and extracts mailto: links as candidates
③ Venue selects / manually enters the target address
④ Confirmation code sent to that address
⑤ Code entered → upgraded to "Verified"
```

**Fallback: SNS Verification (for SNS-only venues without HP)**

```
① Venue enters official Instagram / X account URL
② NearJam instructs: post "Verification code: NEARJAM-XXXX" in profile or story
③ NearJam periodically checks the page → finds the code
④ Code can be removed after → upgraded to "Verified"
```

**Startup phase: Manual verification**

Operators can manually verify venues by checking HP/SNS until automated flow is ready.

#### Verification State vs Permissions

| Action | Unverified | Verified |
|--------|-----------|---------|
| Create session events | ✅ (shown with ⚠️) | ✅ |
| View participant list | ✅ | ✅ |
| Control performance log visibility | ❌ | ✅ |
| Publish session date/time | ❌ | ✅ (with ⚠️ JASRAC warning) |
| Edit rules / manner page | ❌ | ✅ |
| View venue analytics | ❌ | ✅ |

---

### 2.7 Auto-Collection Bot

NearJam automatically collects session information from venue SNS accounts and websites.

#### Data Sources

| Source | Collection Method |
|--------|-----------------|
| Venue website / HP | Scrape for session schedule pages, event info |
| Instagram | Fetch recent posts, highlight archives for session info |
| X (Twitter) | Fetch recent tweets tagged with session-related keywords + venue account |
| Facebook events | Fetch upcoming events from venue page |
| Connpass / Doorkeeper | Fetch event listings if venue uses these platforms |

#### Collection Pipeline

```
1. Discover: Find venue SNS/HP links (from venue profile or seed data)
2. Fetch: Download pages/posts at scheduled intervals (e.g., daily)
3. Extract: Use NLP/LLM to extract:
   - Session name / tendency name
   - Typical day/time pattern
   - Genres / songs mentioned
   - Entry system
   - Equipment info
4. Normalize: Map to NearJam schema
5. Review queue: Put extracted info in "pending review" status
6. Publish: After human operator review (or confidence threshold), publish as auto-collected info
7. Attribution: All auto-collected entries show "🤖 Auto-collected from [source] on [date]"
```

#### Data Quality and Reliability

- Auto-collected entries are clearly labeled and can be disputed by anyone
- Venue owner can override auto-collected info once verified
- Community can flag auto-collected info as outdated/incorrect
- Bot does not collect personal information or individual participant data

---

## 2.8 Internationalization (i18n)

NearJam supports multiple display languages. English and Japanese are the initial pair.

### Supported Languages

| Code | Language | Status |
|------|----------|--------|
| `en` | English | ✅ Phase 1 |
| `ja` | Japanese (日本語) | ✅ Phase 1 |

### Language Detection and Selection

| Mechanism | Behavior |
|-----------|----------|
| **Browser auto-detect** | On first visit, `Accept-Language` header is read. If a supported language is found, that locale is used. Otherwise falls back to `en`. |
| **URL-based routing** | Locale prefix in URL: `/en/…` and `/ja/…`. Shareable and bookmarkable. |
| **User override** | A language switcher (e.g., in the header) lets users manually select their language. Selection stored in a cookie (`NEXT_LOCALE`). |
| **Cookie persistence** | Once the user has manually selected a language, the cookie overrides browser detection on all subsequent visits. |

### URL Structure

```
https://neарjam.app/          → auto-redirect based on Accept-Language or cookie
https://nearjam.app/en/       → English, all routes
https://nearjam.app/ja/       → Japanese, all routes
```

Default locale: `en` (English is the canonical route; the site's primary content language is English).

### Scope of Translation

| Layer | Translatable | Notes |
|-------|-------------|-------|
| UI labels, buttons, navigation | ✅ | All static strings |
| Error messages | ✅ | User-facing validation messages |
| Content entered by users (venue names, session titles, etc.) | ❌ | Not translated — stored as-is |
| Legal/copyright notices | ✅ | i18n required |
| Notification emails | ✅ Phase 2 | Out of scope for Phase 1 |
| Auto-collected content from SNS/HP | ❌ | Displayed as-is; no translation layer |

### Language Switcher UX

- Displayed in the site header at all times (logged in or not)
- Shows current language with a flag or abbreviated label (e.g., `EN` / `JA`)
- Switching preserves the current page path (e.g., `/en/venues/123` → `/ja/venues/123`)

---

## 3. Core Concepts

### 3.1 Song Database

A community-maintained catalog of jam session staples.

| Field | Description |
|-------|-------------|
| Song title | |
| Artist / Band | Original artist |
| Genre | Jazz / Rock / J-Pop / etc. |
| Standard key | Commonly used session key |
| Standard tempo | BPM range |
| Difficulty | Beginner / Intermediate / Advanced / "Depends" |
| Tags | e.g., "Hard Bop", "12-bar blues", "Carpenters" |
| External links | Chord sheets/lyrics NOT stored in NearJam. Links to external sites (e.g., ChordWiki) |
| Wishlist count | How many musicians want to play this (popularity signal) |

#### Copyright Policy

- **Song title, artist name, key, BPM are metadata** — not copyright-protected. Safe to publish freely.
- **Chord charts and lyrics are copyrighted works** — NearJam does NOT store these. External links only.
- **Initial seed policy**: Community-sourced naturally; NearJam operators pre-load titles of common jazz standards and J-Pop session staples (titles only, no chord charts/lyrics)

---

### 3.2 Session / Event

Created by a venue or any musician as session admin.

| Field | Description |
|-------|-------------|
| Title | e.g., "Thursday Night Open Session" |
| Date/time | |
| **Format** | **In-person** / **Online (SYNCROOM)** |
| Venue | Link to venue profile for in-person sessions |
| Studio | Optional: link to studio profile if held at a studio |
| SYNCROOM room info | For online: room name, connection method, recommended environment |
| Song list | Planned songs (from song DB or free text) |
| Instruments needed | Drums? Vocals? Bass? |
| Format | Open / Invite-only / Theme night (e.g., "J-Pop only") |
| **Mood flags** | Atmosphere tags set by session admin (multiple, see below) |
| Max participants | |
| Registration required | Yes / No |

**Mood Flags:**

| Flag | Meaning |
|------|---------|
| 🎉 Mistakes welcome | Mistakes laughed off. Fun over perfection |
| 🌱 Beginner-friendly | Newcomers and beginners warmly welcomed |
| 🔥 Advanced | Fast songs and complex chords appear. For experienced players |
| 📚 Practice-focused | One song repeated and deepened. Quality over quantity |
| 🎭 Theme night | Fixed song/genre theme (see song list) |
| 🤫 Listening culture | Quiet during performance. Focus-oriented |
| 🥳 Lively atmosphere | Energy and audience engagement prioritized |
| 🤝 Connection-first | Making music friends is the point |

---

### 3.3 Matching System

Matching is **non-exclusive and notification-based** (it informs, never restricts).

#### Privacy-First Principle

**Wishlists, preferences, and profile details are private by default.** Matching is processed silently server-side. No one is told "this person wants to play this song."

> **AND-consent rule**: Information involving multiple parties (performance logs, etc.) is only shown when ALL involved parties have set it to "public." Details in §3.4.

**Song-based match**: Musician's wishlist overlaps with session's song list → notification to that musician only (others never learn about their wishlist)

**Instrument match**: Session needs an instrument the musician plays → notification

**Style match**: Session format/goal/feedback culture matches musician profile → shown in "recommended sessions"

**Area match**: In-person sessions only. Venue within musician's travel range OR within one of their coverage areas.

**SYNCROOM match**: If musician has SYNCROOM enabled and session is SYNCROOM format → score weighted toward song/style match (area irrelevant)

**Matching score (internal, not shown to users):**

```
# In-person session
score = song_overlap × 0.4 + area_fit × 0.3 + style_fit × 0.2 + instrument_fit × 0.1

# SYNCROOM session (area irrelevant)
score = song_overlap × 0.5 + style_fit × 0.35 + instrument_fit × 0.15
```

---

### 3.4 Performance Log Design

#### Who can log

| Role | Can log |
|------|---------|
| **Session admin** | Songs, part assignments, play order |
| **Venue owner** | Same (as venue record) |
| **Musician (self)** | Songs and parts they personally played |

Others' records cannot be changed. **Your record is yours to log and delete.**

#### AND-Consent Rule

| Information axis | Controlling party | Default |
|-----------------|------------------|---------|
| Session existence | Venue owner | 🔒 Private |
| Session date/time | Venue owner | 🔒 Private |
| Song list | Venue owner AND Session admin | 🔒 Private |
| "I participated" | Musician themselves | 🔒 Private |
| My part/instrument | Musician themselves | 🔒 Private |
| "I played [song]" (with title) | Musician AND Venue AND Session admin | 🔒 Private |
| Co-performers | All co-performers AND Venue | 🔒 Private |

> **Key principle**: "I played guitar" is the musician's data. "Which venue" is the venue's data. This ownership separation means even if a venue hasn't consented, the core performance history survives — just without the venue name.

---

### 3.5 Copyright / JASRAC Risk Policy

> ⚠️ **Important**: JASRAC blanket license fees are based on self-reported monthly performance hours. Even with a blanket license, publishing session date/time creates evidence that could conflict with reported hours. Song titles constitute evidence of performances. Both are placed under venue owner control.

#### System-level restrictions (fixed regardless of user settings)

| Restriction | Reason |
|-------------|--------|
| Performance log pages: `noindex` + auth gate | Prevent search engines from indexing performance records |
| Song titles not visible to non-logged-in users | Keep song names off publicly crawlable pages |
| Venue song stats not bulk-API-accessible | Prevent mechanical collection |

---

## 4. Phase-by-Phase Feature List

### Phase 1 — MVP

**Internationalization (i18n)**
- [ ] **Browser language auto-detection** — `Accept-Language` header detection on first visit
- [ ] **URL-based locale routing** — `/en/` and `/ja/` prefixed routes via next-intl
- [ ] **Language switcher** — header component, persists preference in `NEXT_LOCALE` cookie
- [ ] Full UI translation coverage: labels, errors, navigation, legal notices

**For Musicians**
- [ ] Sign up / Login (email or Google OAuth)
- [ ] Musician profile creation (nickname, instruments, genre, area, years played, skill/goal/style)
- [ ] **Coverage areas** setting (additional areas beyond home base, visibility selectable)
- [ ] **SYNCROOM availability** setting (on/off, optional room notes, visibility selectable)
- [ ] Add songs to wishlist (vocalists can specify preferred key per song)
- [ ] Find nearby sessions
- [ ] Session participation intent / registration
- [ ] Add SNS links to profile
- [ ] Connect with other musicians (mutual approval)

**For Venues / Studios — Basic**
- [ ] Sign up / Login
- [ ] Venue / Studio profile creation
- [ ] **Verification flow** — HP email check (auto-scraping) or SNS code method
- [ ] Duplicate venue check / impersonation report
- [ ] **Session rules / manner page** creation (Markdown, verified venues only)
- [ ] Session event creation with song list, instrument needs, **mood flags**
- [ ] View registered participant list
- [ ] Recurring session management

**Crowdsourced Place Info**
- [ ] Any logged-in musician can add a **session tendency** entry for a venue
- [ ] Tendency entries: typical day/time, genre, atmosphere, equipment
- [ ] Attribution shown: "Added by [musician nickname] on [date]"
- [ ] Venue owner can mark crowdsourced entries as "confirmed" or "outdated"

**Auto-Collection Bot (MVP scope: basic)**
- [ ] Bot fetches venue HP/SNS URLs registered by venue owner
- [ ] Extracts session tendency info and queues for operator review
- [ ] Operator approves/rejects → published with "🤖 Auto-collected" label

**Google Maps Integration (MVP scope: basic)**
- [ ] Venues and studios shown on Google Maps
- [ ] Click pin → venue/studio profile
- [ ] "Get directions" button → open Google Maps with venue as destination

**In-Session Tools (all participants)**
- [ ] Add songs to queue / hand-raise for part
- [ ] Reorder songs
- [ ] Key memo per song (vocalists' preset key visible to all)
- [ ] Log own performance
- [ ] View performance balance dashboard

**In-Session Tools (session admin only)**
- [ ] Edit session info
- [ ] Remove participants
- [ ] Declare session complete (officially confirm performance logs)
- [ ] Delegate admin rights

**Post-Session (musicians)**
- [ ] Register songs/parts retroactively
- [ ] Per-axis visibility control for performance logs

**Venue info (pre-session reassurance)**
- [ ] "Atmosphere and level" shown on venue page
- [ ] "Top 10 songs played here" auto-aggregated from logs
- [ ] Session rules / manner page display

**Song discovery**
- [ ] "Played near you but not in your wishlist" recommendations
- [ ] "Song you can practice and tackle" suggestions

**Notifications**
- [ ] "A session near you is planning a song in your wishlist"
- [ ] "A SYNCROOM session is planning a song in your wishlist (nationwide)"
- [ ] "A session near you needs your instrument"
- [ ] "New session opening near you"
- [ ] Batch delivery (morning digest, once daily — prevents timing-correlation attacks on wishlists)

---

### Phase 2 — Growth

**In-Session tools**
- [ ] Solo / turn management — visualize how many turns each player has had
- [ ] "Next player" suggestion based on performance balance

**Kudos (いいね！)**
- [ ] Post-session kudos to co-musicians, session admin, venue
- [ ] Kudos inbox (sender private by default)
- [ ] Anonymous feedback to venue / session admin

**AI features**
- [ ] Combination suggestion ("These 3 haven't played together and share 5 songs")
- [ ] **Host-provided matching** — Admin registers availability + songs they can host → AI generates specific proposals for musicians who want those songs

**Analytics**
- [ ] Musician performance history page (opt-in public)
- [ ] Per-venue session history (attendance trends, popular songs)
- [ ] Monthly digest for recurring sessions
- [ ] Venue analytics dashboard

**Auto-collection Bot (expanded)**
- [ ] Automatic discovery of new venues from SNS/HP without manual registration
- [ ] Confidence scoring for auto-collected data
- [ ] Automatic re-fetch on schedule (weekly)
- [ ] User flagging of outdated info triggers re-fetch

**Google Maps (expanded)**
- [ ] Filter by genre, day of week, SYNCROOM, beginner-friendly
- [ ] "Sessions happening this week near me" map view
- [ ] Heatmap of session activity by area

---

### Phase 3 — Expansion

- [ ] QR code check-in on the day
- [ ] Post-session thank-you messages between musicians
- [ ] Session recording log (optional: link to recordings/video)
- [ ] Paid event support (ticketed sessions)
- [ ] Mobile app (PWA first, then native)
- [ ] Studio booking integration (direct room reservation from NearJam)
- [x] ~~Multi-language support~~ → Moved to Phase 1 (§2.8, §4 Phase 1)

---

## 5. Safety & Privacy Design

### 5.1 Personal Information Protection

| Principle | Implementation |
|-----------|---------------|
| Nickname only | Real name not shown on public profile |
| Location abstraction | Area / district only. No home address used |
| Participant list protection | Only registered participants can see other participants |
| **Preferences private by default** | Wishlist, style preferences, skill level visible to self only |
| **Venue/admin can't see details** | Venue sees "X people are interested" aggregate only |
| Profile visibility | Default: logged-in users only (changeable) |

### 5.2 Anti-Stalking / Anti-Harassment

1. **Location abstraction** — "Kashiwa area", not "Kashiwa 3-chome"
2. **Participant list gating** — Only registered participants see who else is in
3. **DM after mutual approval only** — Unilateral DMs impossible
4. **Connection request cooldown** — After rejection: 30-day wait. 3 rejections from same person → auto-block
5. **Block & report** — Blockers become invisible to the blocker
6. **Music-only matching** — Style matching is for musical compatibility, not social connections. No swipe/like UX patterns
7. **Venue as intermediary** — Verified venues provide the context. Encounters happen within real session contexts
8. **Discovery opt-out** — Set profile to "private" to disappear from search/recommendations while still being able to participate manually

---

## 6. SNS Integration

Musicians can optionally link external profiles (display only — not OAuth login).

| Platform | Use case |
|---------|----------|
| YouTube | Share performance videos |
| Instagram | General profile link |
| SoundCloud | Share recordings |
| X (Twitter) | General social presence |
| TikTok | Short performance clips |

**SNS links as trust signals**: Profiles with a YouTube channel of real performances deter anonymous bad behavior.

---

## 7. Out of Scope

- Professional session musicians for recording (that's Supreme Tracks)
- SYNCROOM itself (audio rooms, low-latency tech) — NearJam uses SYNCROOM as an option, not a replacement
- Music lessons / teacher matching
- Revenue / copyright management for performances
- Original song composition / band member recruiting (that's BandMix)

---

## 8. Success Metrics (Initial)

| Metric | Target (6 months) |
|--------|------------------|
| Registered musicians | 50 |
| Registered venues | 5 (verified) + 20 (crowdsourced) |
| Registered studios | 3 |
| Sessions created | 20 |
| Wishlist registrations (songs) | 300 |
| Matching notifications sent | 100 |
| Musicians who participated via NearJam | 10 |
| Auto-collected session tendency entries | 50 |

---

## 9. Open Questions

- [ ] Venue/Studio profiles: free only, or paid tier for owners?
- [ ] Handling songs not in DB (free-text vs "submit for addition")
- [x] ~~Song DB seed policy~~ → Resolved: titles + metadata only, no chord charts (§3.1)
- [ ] Matching notifications: push (PWA) or email only?
- [ ] SNS share page for sessions (public shareable link)?
- [ ] Auto-collection bot legal considerations (scraping ToS of Instagram, X, etc.)
- [ ] Google Maps API billing strategy for scale

---

## 10. Evaluation & Feedback Design

### Core Philosophy: Accumulate Gratitude, Not Ratings

> *"Sending kudos becomes the reason to keep coming back to sessions."*

NearJam uses **kudos (いいね！) — one-directional, positive only**. No Google Maps-style single-star ratings.

**Why kudos can be sent every session**: Google Maps rates a place's objective quality. NearJam kudos express gratitude for an experience. Sessions are different every time — the same venue can be better this month than last. Gratitude, not evaluation.

**Why no negative ratings**: Amateur musicians who fear being "rated" will stop showing up.

### Kudos Rules

| Recipient | Condition | Max per session |
|-----------|-----------|----------------|
| Co-musician | Shared session | 1 per person (every session) |
| Session admin | That session's admin | 1 (every session) |
| Venue | In-person sessions | 1 (every session) |

> **"Every session"** = no one-time-only limit like Google Maps. Same host for 5 great sessions → 5 kudos.

### Kudos Stamps

| Stamp | Meaning |
|-------|---------|
| 👍 Nice! | Simple thanks |
| 🎵 Great playing | Musical compliment |
| 🎉 Let's play again | Hope for next time |
| 🌱 I learned a lot | Gratitude for growth |
| ✨ Great atmosphere | Thanks for the whole session |

### Visibility

| Info | Visible to | Default |
|------|-----------|---------|
| Kudos text/stamp | Recipient only | Private |
| Total kudos received | Self only (optionally public) | Private |
| Venue's total kudos | Venue owner + optionally on venue page | Venue owner only |

### Anonymous Feedback (separate from kudos)

A separate channel for improvement suggestions — sent anonymously to venue/session admin only. No individual musician criticism feature.

| Feature | Recipient | Viewable by |
|---------|-----------|-------------|
| Anonymous feedback (text) | Venue or Session admin | Venue owner / Session admin only |

---

## Appendix A: Crowdsourced Place Info Policy

### Contribution Guidelines

- Anyone can add or edit session tendency info for a venue/studio
- Edits must describe **general tendencies**, not specific event dates (those are session events)
- No personal information about attendees
- Spam / malicious edits subject to moderation

### Attribution and Trust

| Source | Trust level | Display |
|--------|-------------|---------|
| 🤖 Auto-collected | Low (not human-verified) | "🤖 Auto-collected from [source] on [date]" |
| 👥 Community | Medium | "👥 Added by [nickname] on [date]" |
| ✅ Owner-verified | High | "✅ Verified by owner" |

### Edit History

All edits are logged. Venue owners and platform operators can revert incorrect information.

---

## Appendix B: Studio NearJam Session Flow

```
1. Musicians X, Y, Z all add "Black Bird" to wishlist
2. NearJam detects 3 musicians in the Kashiwa area with a common song
3. NearJam suggests: "3 musicians near you want to play Black Bird.
   Studio A in Kashiwa has a room available Saturday 14:00-16:00 (¥1,500/hr)"
4. X initiates a session, books Studio A (external), invites Y and Z
5. Session is created in NearJam linked to Studio A
6. Normal NearJam session flow begins
```
