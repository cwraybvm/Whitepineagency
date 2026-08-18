# Graph Report - .  (2026-08-07)

## Corpus Check
- 325 files · ~370,533 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1556 nodes · 2543 edges · 184 communities (97 shown, 87 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 156
- Community 157
- Community 158
- Community 159
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 176
- Community 177
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183

## God Nodes (most connected - your core abstractions)
1. `prisma` - 47 edges
2. `callOpenAiJson()` - 33 edges
3. `a` - 18 edges
4. `fetchJsonArray()` - 17 edges
5. `fetchGenerationJson()` - 17 edges
6. `BrandDna` - 17 edges
7. `dispatchWebhookEvent()` - 16 edges
8. `compilerOptions` - 16 edges
9. `compilerOptions` - 16 edges
10. `StrategyHandler` - 14 edges

## Surprising Connections (you probably didn't know these)
- `DevTenantBadge component` --references--> `getCurrentTenant`  [EXTRACTED]
  docs/superpowers/specs/2026-08-06-white-label-engine-phase-2-design.md → src/config/clientConfig.ts
- `FeatureKey type alias` --references--> `SandboxTool`  [EXTRACTED]
  docs/superpowers/specs/2026-08-06-white-label-engine-design.md → src/components/sandbox/types.ts
- `Per-Request Resolver via React.cache(), Not a Module Singleton (avoids leaking between tenants)` --rationale_for--> `getCurrentTenant`  [EXTRACTED]
  docs/superpowers/specs/2026-08-06-white-label-engine-design.md → src/config/clientConfig.ts
- `Next.js Breaking-Changes Warning (root AGENTS.md)` --semantically_similar_to--> `Next.js Breaking-Changes Warning (nested AGENTS.md)`  [INFERRED] [semantically similar]
  AGENTS.md → white-pine-portal/AGENTS.md
- `CLAUDE.md Root Project Instructions` --semantically_similar_to--> `CLAUDE.md Nested Project Instructions`  [INFERRED] [semantically similar]
  CLAUDE.md → white-pine-portal/CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Hub Hotkey Module Routing (1-5)** — demo_playbook_hub, demo_playbook_admin_module, demo_playbook_crm_module, demo_playbook_fulfillment_module, demo_playbook_demo_portal, demo_playbook_client_portal [EXTRACTED 1.00]
- **5-Minute Pitch Script (5 Beats)** — demo_playbook_hub, demo_playbook_audit_generator, demo_playbook_missed_call_simulator, demo_playbook_shadow_portal, demo_playbook_crm_module [EXTRACTED 1.00]
- **Design System MASTER + Per-Page Override Cascade** — design_system_white_pine_portal_master, design_system_white_pine_portal_pages_admin, design_system_white_pine_portal_pages_portal [EXTRACTED 1.00]
- **Six System Prompts Share role/frameworks/rules/output_format XML Structure** — src_lib_sandboxprompts_system_prompts_copy, src_lib_sandboxprompts_system_prompts_ad, src_lib_sandboxprompts_system_prompts_video, src_lib_sandboxprompts_matrix_prompt, src_lib_sandboxprompts_dco_prompt, src_lib_sandboxprompts_drip_prompt [EXTRACTED 1.00]
- **Creative Sandbox UX & Robustness Enhancements Roadmap Sub-Projects** — docs_superpowers_specs_2026_08_06_direct_mail_inline_edit_design_spec, docs_superpowers_specs_2026_08_06_cross_studio_handoff_design_spec, docs_superpowers_specs_2026_08_06_print_safety_overlay_and_prompt_health_badge_design_spec, docs_superpowers_specs_2026_08_06_multi_asset_zip_exporter_design_spec [INFERRED 0.95]
- **Tenant Resolution & Feature-Gating Architecture (Phase 1 + Phase 2)** — src_config_clientconfig_getcurrenttenant, src_components_featureguard, src_components_tenantprovider, src_app_api_portal_branding_route, src_components_devtenantbadge [INFERRED 0.85]

## Communities (184 total, 87 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (24): a, b(), constructor(), deleteCacheAndMetadata(), et, F, G, get() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (48): Case, cases, POST(), VALID_PLATFORMS, POST(), VALID_TYPES, AssetStatus, STATUS_BADGE_STYLES (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (15): cacheMatchIgnoreParams(), Deferred, executeQuotaErrorCallbacks(), NetworkFirst, NetworkOnly, TODO: Remove this log message in v4., RegExpRoute, Route (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (14): dynamic, dynamic, POST(), requireAuth(), dynamic, dynamic, dynamic, dynamic (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (34): cases, POST(), AdMetadataSchema, AllProvidersUnavailableError, AngleDraftSchema, ANGLES, ComplianceViolationSchema, CopyDcoSchema (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (40): autoprefixer, @capacitor/cli, devDependencies, autoprefixer, @capacitor/cli, eslint, eslint-config-next, postcss (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (30): Branding, SENTIMENT_STYLES, buildCsv(), buildPlainText(), GeoExpansionPage(), LocalizedAdVariation, adLibraryLinks(), BrandIdentityPanel() (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (35): AuditGeneratorPage(), AuditResult, CTR_BY_RANK, ctrForRank(), firaCode, RankResult, scoreColor(), SpeedResult (+27 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (22): main(), dynamic, dynamic, POST(), POST(), setSessionCookies(), dynamic, buildModules() (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (32): dependencies, next, react, react-dom, devDependencies, eslint, eslint-config-next, tailwindcss (+24 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (22): auth, drive, INTAKE_CHECKLIST, POST(), globalForPrisma, internalLeadsDatabase, LeadRecord, POST() (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (23): POST(), POST(), POST(), extractBrandFromUrl(), generateMidjourneyPromptFromImage(), CHROME_USER_AGENT, EXCLUDED, extractHexColors() (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (22): dynamic, formatRemaining(), GET(), verifyCronSecret(), POST(), POST(), driveOne(), dynamic (+14 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (21): Skip Generic Action-Menu Dropdown, Cross-Studio Handoff (Send to Tool) Design, Blog Studio In-Memory-String ZIP Mechanism (no DOM capture, no state switching), Client-Side ZIP, No New Server Route, Direct Mail Sequential-Capture ZIP Mechanism (drive activeVariantIndex, reuse captureCanvas/jsPDF), Multi-Asset ZIP Exporter Design, PromptHealthBadge Purely Advisory, Never Blocks Generate Button, jszip (+13 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (21): HistoryDrawer(), HistoryDrawerProps, timeAgo(), CAMERA_MOVEMENTS, CameraMovement, SHOT_DURATIONS, ShotDuration, VOICE_PERSONA_OPTIONS (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (16): ActivityDrawerProps, ActivitySignal, ActivityType, BattleCard, BrandTheme, CommandPaletteModalProps, DealStage, DEFAULT_BATTLE_CARDS (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (21): POST(), POST(), VALID_SCORABLE_TYPES, AdBuilderSchema, AssetDraftSchema, basePromptForType(), brandClauseFor(), CampaignBatchSchema (+13 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (17): Print Safety Overlay + Prompt Health Badge Design, BrandDnaDrawer(), BrandDnaDrawerProps, CharLimitBadges(), CopyStudioSnapshot, MODES, Angle, AngleDraft (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (13): Any, Bool, Capacitor, AppDelegate, NSUserActivity, UIApplication, UIApplicationDelegate, UIKit (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (16): Extract handleInsertPhrase (5 call sites justify it), TABS, AdBuilderPanel(), BrandDna, BrandDnaHud(), CampaignBatchPanel(), CopyStudioPanel(), SwipeAnalyzerPanel() (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (19): POST(), anthropicJsonAttempt(), callOpenAiJson(), callOpenAiVisionJson(), fetchImageAsInlineData(), formatBrandDnaBlock(), geminiApiKey(), geminiJsonAttempt() (+11 more)

### Community 24 - "Community 24"
Cohesion: 0.23
Nodes (13): Add Role Check to Previously-Unguarded Branding Route, GET(), PUT(), requireOrgId(), currentPeriod(), GET(), PATCH(), GET() (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (14): ActionItem, ActivityFeedItem, AiSummary, CompleteOperationalClientPortal(), DEMO_FEED_ITEMS, FmsStatus, LayoutDensity, LeadSource (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (13): portal/settings/branding/page.tsx, AdBuilderSnapshot, AdDraft, Platform, PLATFORMS, AdMockupCard(), ScoreBadge(), ASPECT_RATIOS (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (17): Single Source of Truth for Banned Word List, Sandbox Prompt Banned-Word Guardrails Design, Sandbox Prompt Few-Shot Exemplar Bank Design, Exemplar Token/Latency Cost Tradeoff (2 per block), No New Builder Abstraction, Match Existing String-Concat Style, Sandbox System Prompt XML/Framework Refactor Design, COPY_AD_EXEMPLARS_BLOCK constant, DCO_PROMPT (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (10): firaCode, firaSans, metadata, firaCode, firaSans, metadata, AdminCommandPalette(), CommandItem (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (12): dynamic, GET(), dynamic, GET(), AutoFulfillMeta, maybeAdvance(), maybeAdvanceMany(), NEXT_STATUS (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.21
Nodes (12): SandboxPage(), FeatureGuard(), FeatureGuardProps, useTenant(), isFeatureEnabled() function, OrgRow, tenantWithBlogDisabled, TENANT_SELECT (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (13): checks, draft, html, noBadgeHtml, escapeHtml(), renderLandingPageHtml(), downloadTextFile(), LandingPageStudioPanel() (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (13): POST(), escapeHtml(), mediaFigureHtml(), renderBlogPostHtml(), BlogPostTone, BlogPostToneOptions, generateBlogPostPackage(), BLOG_POST_PROMPT (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (11): Blog Studio Inline Editing (deferred, separate design pass), Commit contentEditable on Blur Only (avoids cursor-jump), No Tailwind Color Classes (Tailwind v4 oklch() crashes html2canvas-pro), Single contentEditable Region for Letter Body (avoids re-deriving paragraph boundaries), Direct Mail Inline Click-to-Edit Design, Guides Render as Sibling Outside Capture Subtree (no export-time toggling needed), DirectMailLetterMockup(), EditableField (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.26
Nodes (11): dynamic, POST(), verifyRequest(), dynamic, GET(), POST(), PUT(), requireAuth() (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (13): compileReportData(), dynamic, esc(), GET(), pctBadge(), persistReport(), POST(), renderReportHtml() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.21
Nodes (11): CrmPipelinePage(), firaCode, formatTimestamp(), Lead, priorityStyle(), Stage, STAGES, formatTime() (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (11): ActivitySignal, AdminPage(), BrandTheme, DealStage, Industry, Lead, playAudioChime(), Toast (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.23
Nodes (11): No Supabase — Reuse Existing Multi-Tenant Stack, White-Label Engine (Foundation) Design, Extend Existing API Route, Not a New Server Action, White-Label Engine Phase 2: Admin UI & Custom Domain Pipeline Design, DevTenantBadge component, allowedRolesFor(), config, proxy() (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.20
Nodes (8): Currency, CURRENCY_SYMBOLS, CustomPreset, DEFAULT_SERVICES_LIST, playTactileChime(), QuotingEngineProps, ServiceOption, StreamlinedCompleteQuotingEngine()

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (10): ChannelId, CHANNELS, downloadTextFile(), MasterCampaignPanel(), slugify(), buildMasterCampaignHtml(), buildMasterCampaignMarkdown(), Channel (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (11): @anthropic-ai/sdk, gsap, next-themes, dependencies, @anthropic-ai/sdk, gsap, next-themes, react (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (11): /admin — Admin Operations Module, Prospect Audit Generator (/demo/audit-generator), Objection Battlecard Cheat Sheet, /portal/dashboard — Client Portal Experience, /crm — CRM & Pipeline Module, /fulfillment — Fulfillment Center Module, /hub — Operator Launchpad, /login — Admin Login (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.18
Nodes (11): Design System Master File (MASTER.md), Master Color Palette (navy + blue CTA), Enterprise Gateway Page Pattern, Master Typography (Fira Code + Fira Sans), Admin/Ops Surface Overrides (admin.md), Charts Spec (recharts), Kanban Board Spec (TaskColumn/TaskCard), Client Portal Surface Overrides (portal.md) (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (9): Per-Request Resolver via React.cache(), Not a Module Singleton (avoids leaking between tenants), firaCode, jakarta, metadata, PortalLayout(), SandboxLayout(), TenantTheme(), TenantThemeProps (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.35
Nodes (9): ExportPackRequest, fetchAudioBuffer(), POST(), Beat, buildCopyVariationsCsv(), buildReadme(), buildStoryboardMarkdown(), csvEscape() (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (8): POST(), FormFactor, generateDirectMailPackage(), DIRECT_MAIL_PROMPT, DirectMailPackage, DirectMailPackageSchema, mockDirectMailPackage(), validateDirectMailInput()

### Community 47 - "Community 47"
Cohesion: 0.31
Nodes (7): geist, metadata, RootLayout(), viewport, Button(), buttonVariants, cn()

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 49 - "Community 49"
Cohesion: 0.32
Nodes (6): cases, POST(), LANDING_PAGE_SECTION_REFINE_PROMPT, mockSectionRefine(), SectionRefineSchema, validateRefineSectionInput()

### Community 50 - "Community 50"
Cohesion: 0.32
Nodes (6): cases, POST(), LANDING_PAGE_PROMPT, LandingPageSchema, mockLandingPage(), validateLandingPageInput()

### Community 51 - "Community 51"
Cohesion: 0.32
Nodes (5): digitsOnly(), EstimatorProps, InstantQuoteEstimator(), ServiceOption, SERVICES

### Community 52 - "Community 52"
Cohesion: 0.32
Nodes (5): OrgSwitcher(), Organization, OrganizationContext, OrgContextType, useOrganization()

### Community 53 - "Community 53"
Cohesion: 0.48
Nodes (7): Next.js Breaking-Changes Warning (root AGENTS.md), CLAUDE.md Root Project Instructions, Next.js Framework, README.md (root, create-next-app boilerplate), Next.js Breaking-Changes Warning (nested AGENTS.md), CLAUDE.md Nested Project Instructions, README.md (nested, create-next-app boilerplate)

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (6): ClientHealth, formatRelativeLogin(), HEALTH_STYLE, HealthScore, RevenueMetrics, RevenuePage()

### Community 55 - "Community 55"
Cohesion: 0.43
Nodes (5): dynamic, GET(), getTwilioClient(), POST(), requireAuth()

### Community 56 - "Community 56"
Cohesion: 0.38
Nodes (6): ChecklistItem, daysInStage(), FulfillmentTask, slaCountdown(), STAGES, UltimateFulfillmentPage()

### Community 57 - "Community 57"
Cohesion: 0.43
Nodes (6): calculateCTR(), ClientReportPage(), guessCompetitors(), Lead, PRICING_PACKAGES, urlParamsHasKey()

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (5): firaCode, firaSans, metadata, TenantContext, TenantProvider()

### Community 59 - "Community 59"
Cohesion: 0.47
Nodes (5): dynamic, GET(), HealthScore, requireOwner(), scoreClient()

### Community 60 - "Community 60"
Cohesion: 0.40
Nodes (4): jspdf, jspdf, FlyerGeneratorPage(), Theme

### Community 62 - "Community 62"
Cohesion: 0.50
Nodes (4): dynamic, GET(), TERMINAL_STATUSES, verifyCronSecret()

### Community 63 - "Community 63"
Cohesion: 0.50
Nodes (4): POST(), GEO_EXPANSION_PROMPT, GeoExpansionPackageSchema, mockGeoExpansionPackage()

### Community 64 - "Community 64"
Cohesion: 0.60
Nodes (4): dynamic, getTwilioClient(), POST(), requireAuth()

### Community 65 - "Community 65"
Cohesion: 0.60
Nodes (4): dynamic, GET(), POST(), requireOwner()

### Community 66 - "Community 66"
Cohesion: 0.50
Nodes (4): POST(), GBP_REVIEW_RESPONDER_PROMPT, GbpReviewResponseSchema, mockGbpReviewResponse()

### Community 67 - "Community 67"
Cohesion: 0.50
Nodes (4): POST(), COMPLIANCE_AUDITOR_PROMPT, ComplianceReportSchema, mockComplianceReport()

### Community 68 - "Community 68"
Cohesion: 0.40
Nodes (4): CommandItem, CommandPaletteModal(), CommandPaletteModalProps, Lead

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (4): BoardColumn, ClientTrelloBoard(), ClientTrelloBoardProps, TaskCard

### Community 70 - "Community 70"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 71 - "Community 71"
Cohesion: 0.50
Nodes (4): disabledFeatures Denylist Default [] Avoids Migration Hazard, Organization Prisma model, DEFAULT_TENANT constant, TenantConfig interface

### Community 75 - "Community 75"
Cohesion: 0.67
Nodes (3): dynamic, PUT(), requireAuth()

## Ambiguous Edges - Review These
- `Next.js Breaking-Changes Warning (root AGENTS.md)` → `README.md (root, create-next-app boilerplate)`  [AMBIGUOUS]
  AGENTS.md · relation: conceptually_related_to

## Knowledge Gaps
- **495 isolated node(s):** `config`, `$schema`, `style`, `rsc`, `tsx` (+490 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **87 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Next.js Breaking-Changes Warning (root AGENTS.md)` and `README.md (root, create-next-app boilerplate)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `Community 41` to `Community 128`, `Community 129`, `Community 130`, `Community 131`, `Community 132`, `Community 5`, `Community 133`, `Community 134`, `Community 135`, `Community 15`, `Community 60`, `Community 101`, `Community 102`, `Community 103`, `Community 104`, `Community 105`, `Community 107`, `Community 108`, `Community 110`, `Community 111`, `Community 112`, `Community 113`, `Community 114`, `Community 115`, `Community 117`, `Community 118`, `Community 119`, `Community 120`, `Community 121`, `Community 122`, `Community 123`, `Community 124`, `Community 125`, `Community 126`, `Community 127`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `prisma` connect `Community 3` to `Community 1`, `Community 4`, `Community 10`, `Community 14`, `Community 24`, `Community 29`, `Community 30`, `Community 34`, `Community 35`, `Community 50`, `Community 55`, `Community 59`, `Community 62`, `Community 64`, `Community 65`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `jszip` connect `Community 15` to `Community 41`, `Community 45`, `Community 1`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `config`, `$schema`, `style` to the rest of the system?**
  _495 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05030643513789581 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05817028027498678 - nodes in this community are weakly interconnected._