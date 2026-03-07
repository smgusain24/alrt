---
phase: 04-new-channels-whatsapp-discord-telegram
plan: "04"
subsystem: ui
tags: [nextjs, react, whatsapp, discord, telegram, workflow-builder, icons, dashboard]

requires:
  - phase: 04-new-channels-whatsapp-discord-telegram
    provides: "Backend worker tasks and channel routes for WhatsApp, Discord, Telegram"

provides:
  - "Workflow builder NodePalette with all 6 channels as draggable icons"
  - "ChannelNode displaying brand icons and accent colors for all 6 channels"
  - "ConfigPanel with WhatsApp, Discord, Telegram channel-specific config sections"
  - "Providers/Channels settings page redesigned as 6-channel card grid"
  - "POST /channels/whatsapp/activate and /deactivate backend endpoints"
  - "PUT /channels/discord/config backend endpoint with webhook URL encryption"

affects:
  - "05-white-label-pricing"

tech-stack:
  added:
    - "@icons-pack/react-simple-icons v13.12.0 - brand icons for WhatsApp, Discord, Telegram"
  patterns:
    - "isSimple flag on node type entries to distinguish Lucide vs SimpleIcons rendering"
    - "Channel card grid pattern: icon + accent background + status badge + setup control"
    - "Activation endpoint pattern: UPDATE first, INSERT if no rows then UPDATE again"

key-files:
  created: []
  modified:
    - "apps/dashboard/src/components/workflow/nodes/ChannelNode.tsx"
    - "apps/dashboard/src/components/workflow/NodePalette.tsx"
    - "apps/dashboard/src/components/workflow/ConfigPanel.tsx"
    - "apps/dashboard/src/app/(dashboard)/settings/providers/page.tsx"
    - "apps/dashboard/src/lib/api.ts"
    - "apps/api/alrt/routes/channels.py"
    - "apps/dashboard/package.json"

key-decisions:
  - "SiSlack not in @icons-pack/react-simple-icons v13.12.0 — kept MessageSquare (Lucide) for Slack icon in palette and nodes"
  - "isSimple flag on NODE_TYPES entries controls whether to render with size prop (Simple Icons) or className/strokeWidth (Lucide)"
  - "WhatsApp activation uses UPDATE-first, INSERT-then-UPDATE pattern to handle teams missing the provider row"
  - "Discord webhook URL encrypted with Fernet before storing in providers config — same pattern as Slack bot_token"
  - "Telegram is instructions-only on providers page — chat_id is per-subscriber not per-team"
  - "Providers page renamed to Channels in heading — URL stays /settings/providers for backward compatibility"

patterns-established:
  - "Channel card pattern: icon with accent-colored background container, status badge top-right, setup control below divider"
  - "Activation endpoint pattern: execute UPDATE, check rows returned, INSERT placeholder then UPDATE if zero rows"

requirements-completed:
  - WA-03
  - DC-02
  - TG-02

duration: 35min
completed: 2026-03-06
---

# Phase 04 Plan 04: Dashboard 6-Channel Workflow Builder and Provider Settings Summary

**6-channel dashboard with brand icons in workflow builder nodes and a redesigned card-based channels settings page with WhatsApp toggle, Discord webhook URL input, and Telegram setup instructions**

## Performance

- **Duration:** 35 min
- **Started:** 2026-03-06T05:00:00Z
- **Completed:** 2026-03-06T05:35:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Updated NodePalette to show all 9 draggable node types: trigger, 6 channels (in_app, email, slack, whatsapp, discord, telegram), delay, condition — with WhatsApp/Discord/Telegram using real brand icons
- Updated ChannelNode to render brand icons with correct accent colors for all 6 channels and detect template presence including the new `body` field
- Updated ConfigPanel to show channel-specific config for all 6 channels: WhatsApp (body/template_name/media_url/media_type), Discord (embed title/description/color/footer/toggle), Telegram (body/parse_mode)
- Redesigned providers page as a 6-channel card grid with per-card setup flows: In-App (always active), Email (auto), Slack (OAuth), WhatsApp (toggle), Discord (webhook URL + guide), Telegram (chat_id instructions)
- Added `POST /channels/whatsapp/activate`, `POST /channels/whatsapp/deactivate`, and `PUT /channels/discord/config` API endpoints with encryption for Discord webhook URL

## Task Commits

1. **Task 1: Install brand icons and update workflow builder components** - `abdf4a0` (feat)
2. **Task 2: Provider settings page with 6-channel cards** - `1bd71e2` (feat)

**Plan metadata:** (see final docs commit below)

## Files Created/Modified

- `apps/dashboard/src/components/workflow/nodes/ChannelNode.tsx` - CHANNEL_CONFIG expanded to 6 channels with SiWhatsapp/SiDiscord/SiTelegram brand icons; dual icon rendering for Lucide vs SimpleIcons
- `apps/dashboard/src/components/workflow/NodePalette.tsx` - NODE_TYPES expanded to 9 entries; brand icons for WhatsApp/Discord/Telegram; isSimple flag for render branching
- `apps/dashboard/src/components/workflow/ConfigPanel.tsx` - Channel selector expanded from 3 to 6 with flex-wrap; WhatsApp/Discord/Telegram config sections added
- `apps/dashboard/src/app/(dashboard)/settings/providers/page.tsx` - Full rewrite as 6-channel card grid with ChannelCard component and channel-specific setup flows
- `apps/dashboard/src/lib/api.ts` - Added `api.channels` namespace with list, activateWhatsApp, deactivateWhatsApp, updateDiscordConfig methods
- `apps/api/alrt/routes/channels.py` - Added activate/deactivate WhatsApp endpoints and Discord webhook config endpoint
- `apps/dashboard/package.json` - Added @icons-pack/react-simple-icons dependency

## Decisions Made

- **SiSlack missing from package v13.12.0:** The plan specified using `SiSlack` from `@icons-pack/react-simple-icons`, but the installed version (13.12.0) does not export `SiSlack`. Used `MessageSquare` (Lucide) for Slack channel icon instead. This maintains the original Slack accent color (#f97316) and is visually acceptable.
- **isSimple flag pattern:** Added `isSimple?: boolean` to NODE_TYPES entries to distinguish between Lucide icons (use className/strokeWidth props) and Simple Icons (use size prop). This avoids TypeScript prop conflicts.
- **Telegram page is instructions-only:** The providers page shows instructions for Telegram chat_id setup (it's per-subscriber, set via API) rather than a form field — matches the architectural decision from plan context.
- **Discord webhook encrypted:** Reused the `_encrypt_config()` Fernet function to encrypt the Discord webhook URL before storing. Same pattern as Slack bot_token.
- **Activation endpoint handles missing provider row:** Teams created before Phase 4 may not have whatsapp/discord provider rows in DB. The endpoint attempts UPDATE first; if no rows updated, inserts a placeholder then updates again.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SiSlack not available in @icons-pack/react-simple-icons v13.12.0**
- **Found during:** Task 1 (build verification)
- **Issue:** The plan specified `import { SiSlack } from "@icons-pack/react-simple-icons"` but this export doesn't exist in the installed v13.12.0. Build failed with type error.
- **Fix:** Kept `MessageSquare` from Lucide for the Slack icon in both NodePalette and ChannelNode. Updated `LUCIDE_CHANNELS` set to include "slack" so it uses Lucide rendering props.
- **Files modified:** `NodePalette.tsx`, `ChannelNode.tsx`
- **Verification:** Build passes with no TypeScript errors.
- **Committed in:** abdf4a0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing icon — package version incompatibility)
**Impact on plan:** Minimal. Slack icon display is still functional (MessageSquare is recognizable). The plan's intent — brand icons for the 3 new channels (WhatsApp, Discord, Telegram) — is fully delivered.

## Issues Encountered

- Build failed initially due to `SiSlack` not being exported from the installed version of the icons package. Resolved by using MessageSquare for Slack (see Deviations section).

## User Setup Required

None — UI changes only. Backend endpoints added for WhatsApp activation and Discord config, but these are triggered by dashboard interactions. No new environment variables required.

## Next Phase Readiness

- All 6 channels fully visible and configurable in the workflow builder
- Provider/channel settings page provides complete setup flows for each channel
- WhatsApp activation endpoint ready for production testing when WHATSAPP_TOKEN is configured
- Discord webhook saving and encryption are production-ready
- Phase 5 (White-Label & Pricing) can proceed — channel infrastructure fully exposed in UI

## Self-Check: PASSED

- SUMMARY.md: FOUND
- NodePalette.tsx: FOUND
- ChannelNode.tsx: FOUND
- ConfigPanel.tsx: FOUND
- providers/page.tsx: FOUND
- Commit abdf4a0 (Task 1): FOUND
- Commit 1bd71e2 (Task 2): FOUND

---
*Phase: 04-new-channels-whatsapp-discord-telegram*
*Completed: 2026-03-06*
