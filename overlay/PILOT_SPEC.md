# Drone Hero — Music-First Pilot (Uncrashed)

**Scope locked Nov 11, 2026:** music first, splats parked. This pilot is a song, a map, and a chart — nothing else.

## The pilot song

**"DJ Turn It Up" — Dimension**
- Spotify: `spotify:track:28r1xYNakXXwcQKIXu9Wjw` — already in Corey's **FPV Flight Pack — Drum & Bass** (`spotify:playlist:00Z6wZm8OJPdVau6hMnCbs`)
- **Unflown** — checked against the flown-to exclusion set (242 distinct posted songs, refreshed Nov 11, 2026): no match.
- **174 BPM, steady** (SongBPM/Beatport list it at 174, or 87 half-time) — one tempo all the way through, so one beat grid charts the whole song.
- **2:57** — full song, short enough that a one-take flight + map build stays a pilot, not a project.
- Mostly instrumental with a repeating vocal hook — calls never fight a verse. Rejected for pilot: "Go Back" (tempo switches 136→174 mid-song) and "BACKBONE" (great name, but a full grime vocal over every phrase).

## Timing grid (174 BPM)

- Beat 0.345 s · Bar (4 beats) 1.379 s · 8 bars 11.0 s · 16 bars 22.1 s · Song ≈ 128 bars
- **20 calls total** (~7/min). Drop spacing is 4 bars (~5.5 s) with **one 1-bar combo burst per drop**; intro, breakdown and builds are cruise. This is Corey's lyrical cadence — bursts, then 11–22 s of cruising — not every-beat charting.
- Full machine-readable chart: `chart.json` (the overlay loads this exact file's data, embedded).

| Section | Bars | Time | Intent |
|---|---|---|---|
| INTRO | 1–16 | 0:00–0:22 | Cruise, establish the line, no calls |
| BUILD 1 | 17–32 | 0:22–0:44 | One tease call (bar 29) |
| DROP 1 | 33–48 | 0:44–1:06 | Calls @ 33, 37, 41, 45 + combo 46 |
| DROP 1B | 49–64 | 1:06–1:28 | Entry cruise, calls @ 53, 57, 61 + combo 62 |
| BREAKDOWN | 65–80 | 1:28–1:50 | One call only (bar 73) — breathe |
| BUILD 2 | 81–96 | 1:50–2:12 | Two calls (85, 93) |
| DROP 2 | 97–112 | 2:12–2:34 | Calls @ 97, 101, 105, 109 + combo 110 |
| FINAL / OUTRO | 113–128 | 2:34–2:57 | Last calls 117, 121 — then free-fly the tail |

Grid honesty note: section boundaries are 16-bar grid blocks. On first load, the overlay's onset/intensity analysis verifies the drops; if a drop lands a bar early/late, shift the **section marker**, never the beat grid.

## The map (Uncrashed Workshop — a Race on The Dock)

Build a **Race** (track), not a new Environment — fastest pilot, uses the game's own assets, shareable on Workshop in one upload.

**Base:** The Dock (containers, cranes, open water — built-in cruise straights and dive structures).

**Line design, section by section** (gate = checkpoint; keep the line point-to-point, start pad → finish, ≈2:57 at lyrical pace, roughly 60–80 km/h cruise ≈ 190–240 m per 8 bars):

1. **INTRO (0:00–0:22)** — Long straight down the container row, 2 wide gates. No obstacles. This is the settle-in.
2. **BUILD 1 (0:22–0:44)** — Straight bends toward the cranes; one gate under a crane leg. Tease call at bar 29 happens over open water beside the crane — room to flip.
3. **DROP 1 (0:44–1:06)** — Weave between container stacks: gate, gap, gate. Each call point (33/37/41/45) sits in a **clearing** between stacks — never call a flip inside a gap. Combo at 45–46 is over the stack tops.
4. **DROP 1B (1:06–1:28)** — Down the dock edge, low over water, gates on mooring posts. Call clearings face the open harbour side.
5. **BREAKDOWN (1:28–1:50)** — One long harbour cruise, a single wide gate, the bar-73 call over open water. Deliberately empty.
6. **BUILD 2 (1:50–2:12)** — Climb toward the crane tops; gates step up in altitude.
7. **DROP 2 (2:12–2:34)** — The crane dive is the bar-97 call zone. Then stack-top slalom, combo 109–110 over the tallest stack.
8. **FINAL (2:34–2:57)** — Descent to the start pad, finish gate on the pad. Last call at bar 121 (2:46), then ~11 s of free tail — land or style it out.

**Editor checklist:** place gates in order → test-fly at cruise pace and time each section against the grid (±2 s is fine) → move a gate, never re-time the song → name it exactly: **Drone Hero 001 — DJ Turn It Up (Dimension)** → Workshop description copy below.

## The flywheel copy (use verbatim)

**Workshop item name:** Drone Hero 001 — DJ Turn It Up (Dimension)

**Workshop description:**
> A track built to a song. Load "DJ Turn It Up" by Dimension (174 BPM), start the track when the song starts, and fly the phrases: flips and rolls land on the chart in the video. Chart + overlay: Drone Hero by GaiusFPV. Watch it flown: [YouTube link]. One song, one map — new one every episode.

**YouTube title:** Drone Hero 001 — Flying a Song in Uncrashed | Dimension "DJ Turn It Up"

**YouTube description (top lines):**
> Drone Hero is Guitar Hero for FPV: the song calls the maneuvers, I fly them. This map was built phrase-by-phrase to this track.
> Fly it yourself — free Workshop map: [Workshop link]
> Chart overlay: [overlay link]
> Song: Dimension — DJ Turn It Up (in my FPV Flight Pack — Drum & Bass on Spotify)

**Pinned comment:** "20 calls. How many did I actually hit on the beat? Chart's in the description if you want to fly it."

## What success looks like for the pilot
One Workshop item live, one video posted, links pointing at each other, and Corey able to say whether flying a chart feels like his real lyrical flights. Splats, scoring automation, and in-game integration are explicitly *later*.
