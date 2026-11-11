# StreamProof: judged demo film, script + storyboard (draft 1, 2026-10-09)

Silent, music only. Target runtime 2:50 (hard cap 3:00). 1920x1080, 30 fps. New file: `streamproof-introducing.mp4` (old videos untouched).

## Facts found in the repo (Step 0)
- Pitch: a trust layer for citizen stream reports; photo to evidence a city can act on.
- Problem: authorities can't tell which citizen reports to trust; health systems can't read them; nothing says what a report may be used for.
- Users: citizens (phone) and city / public-health teams (tablet, desktop).
- Hero device: **phone** (390x844 PWA, in-page camera). Real recordings exist for phone, foldable inner display, tablet, desktop.
- Colours: #f5f5f7 / #fff / ink #1d1d1f / grey #6e6e73, accent water-blue #0a6ebd, ok #248a3d. Font: Inter (app text) + Xanh Mono for codes.
- UI sounds: the app has none, so effects are generated (water-drop signature).
- Real, claimable (demo data): SP-1138 graded A 92/100; FHIR bundle 0 errors, 0 warnings vs official HL7 Europe OneAquaHealth profiles; 45 languages; 93 tests.
- Tablet and foldable are screen-size emulations, so they get a footnote.

## Palette and type (locked)
Light tile #F5F5F7, dark tile #000, card #FFF, text #1D1D1F / #F5F5F7 / secondary #6E6E73, accent #0A6EBD, CTA blue #0071E3 not used. Inter 600 headlines (106 / 64 px), 400 body (37 / 28 px), fine print 18 px. Cards radius 36 px. Apple bezels: iPhone 18 Pro, iPad Pro 11", MacBook Pro 14", iPhone Duo (already extracted in `remotion/public/bezels`).

## Captions (max 7 words, >= 2 s each, one at a time)

### OPEN 0:00 - 0:15 (problem, who, why)
| Time | Caption | Shot |
|---|---|---|
| 0:00-0:02 | StreamProof (wordmark) | Wordmark, soft grey radial gradient |
| 0:02-0:05 | This is a stream report. | Text card over a still of the stream photo |
| 0:05-0:08 | It's not the first one a city has received. | Same photo, push 3% |
| 0:08-0:11 | It's the first it can trust. | Reveal: grade A badge lands on the photo |
| 0:11-0:13.5 | Citizens report. Cities can't tell what's real. | Text card (who + threat) |
| 0:13.5-0:15 | So health teams act late, or never. | Text card (why it matters) |

### ACT 1 PROOF 0:15 - 1:35 (one report, SP-1138, start to finish)
Phone (hero) 0:15-0:58, then the city desk 0:58-1:35. Same report SP-1138.
| Time | Caption | Real moment (click log label) | Shot |
|---|---|---|---|
| 0:15-0:19 | Maria sees stagnant water by the footbridge. | phone home | Caption above device |
| 0:19-0:23 | 45 languages. So anyone can report.¹ | tap language, Portugues (t 2.7-4.5) | Caption above device |
| 0:23-0:30 | (no caption) | Reportar, camera, capture (t 6.7-13.5) | Real interaction, tap rings |
| 0:30-0:34 | Two taps tag it. One places it. | chips, locate (t 17-21) | Caption above device |
| 0:34-0:40 | (no caption) | notes typed, submit (t 21-25) | Real interaction |
| 0:40-0:48 | **Grade A. 92 out of 100.¹** | card SP-1138 appears (t 25.5) | Screen takeover, PEAK 1 + signature sound |
| 0:48-0:55 | Seven checks, each in plain words. | reasons scroll (t 28) | Side profile / detail pan |
| 0:55-0:58 | A neighbour's report backs it up. | nearby (t 31) | Caption above device |
| 0:58-1:03 | Across town, the city team opens it. | reviewer detail | Match cut phone to desktop (MacBook bezel) |
| 1:03-1:10 | This can't leave the system... | Export FHIR, refused (t 7) | Spec in corner: "Export blocked: not verified" |
| 1:10-1:17 | ...until an expert verifies it. | verify-open, field, verify (t 10-14) | Real interaction |
| 1:17-1:27 | **Two people agree. Decision-grade.** | verified, advisory (t 15-20) | Screen takeover, PEAK 2 + signature sound |
| 1:27-1:35 | FHIR export: 0 errors, 0 warnings.² So any hospital system can read it. | validator output | Spec in corner over full-screen result |

### ACT 2 WHY IT'S DIFFERENT 1:35 - 2:15 (3 cards slide in)
| Time | Two-line caption | Clip |
|---|---|---|
| 1:35-1:48 | Every grade has reasons. So you can argue with it. | phone reasons card |
| 1:48-2:01 | A gate on every output. So untrusted data never leaves. | desktop refused, then allowed |
| 2:01-2:15 | Stat block: **0 errors**, 0 warnings. Checked against the official HL7 Europe OneAquaHealth profiles². | validator + footnote |

### ACT 3 EVERYWHERE 2:15 - 2:30 (it really is responsive)
2:15-2:21 "It's also a tablet. A foldable. A desktop." (iPad, Duo, MacBook slide in one by one, footnote ³ emulation). 2:21-2:30 apple.com-style grid: full-width tile + 2-up tiles (phone, tablet / foldable, desktop), frosted top bar "StreamProof", light and dark tiles alternating.

### CLOSE 2:30 - 2:50
| Time | Card |
|---|---|
| 2:30-2:36 | Rule of three: **Reported. Checked. Trusted.** (last word largest) |
| 2:36-2:41 | Bookend: "Not the first report. The first you can trust." For citizens and the city teams that act on them. |
| 2:41-2:50 | Plain tile: **StreamProof**, "Stream reports a city can trust." Nothing essential here (end-screen safe). Signature sound on the last frame. |

Fine print (bottom centre, 18 px): "¹ Demo data." on the Act 1 captions, "² Checked with the HL7 validator against hl7.eu OneAquaHealth profiles; 18 files, demo data." and "³ Tablet and foldable shown as screen-size emulations."

## Sound
- Music: "Loyalty (No Drums)" by BreakzStudios (already downloaded, Pixabay licence, no credit required, so no credit line). Act changes land on bar changes (beats file: `audio/music-beats.json`).
- Effects (generated): tap tick, soft whoosh, success chime (rising). Signature: a clear water-drop plink with rising pitch, at 0:40 (grade), 1:17 (decision-grade) and the last frame.
- Master about -14 LUFS, true peak <= -1 dBTP. Effects >= 250 ms apart, music ducked 4 dB.

## What needs recording (the existing footage does not cover it)
1. Phone, hero flow: existing citizen.mp4 (38 s) covers 0:15-0:58; I would re-record one clean take with slower pacing and one extra beat (scroll the 7 reasons slowly).
2. Desktop: existing reviewer.mp4 (24 s) covers refused, verify, advisory. Need a shot of the FHIR export result and the validator line (video/tools/fhir_view.py exists).
3. Tablet and foldable clips exist (tablet.mp4, duo.mp4).

## Self-check risks to flag now
- Act 1 hero is the phone for the first 43 s, then the city desk. The true end-to-end product story crosses two devices; I think that is more honest than a phone-only journey. Say if you want a phone-only Act 1.
- The earlier session rejected hand-drawn CSS frames and Blender photos. This plan uses only the Apple bezels and real recordings. The stream photo in the open is a synthetic Blender render from the app's demo data (disclosed in the film footnote if used).
