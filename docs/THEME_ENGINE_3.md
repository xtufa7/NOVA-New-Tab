# Website appearance, inspector and focus

## Enable and choose access

Open Settings → Website Appearance. Turn on appearance, then grant a specific domain or all HTTP/HTTPS sites. Domain access is the narrower choice. Browser permission prompts require a user gesture and cannot be bypassed by the extension. Revoking access or disabling appearance restores original properties on loaded pages. Browser internal pages, extension stores and other protected contexts cannot be themed.

Choose Smart, Force, Dark-only, Original or Custom. Smart maps light, dark, mixed and transparent surfaces to the selected token hierarchy; tinted semantic surfaces retain an accent contribution. Force applies a stronger mapping. Dark-only leaves light surfaces unchanged. Original restores colors. Custom uses your token overrides. Intensity, contrast target, saturation, preservation selectors and performance mode are independent controls.

Nested transparent backgrounds are composited against their original parent surfaces. Perceptual lightness maps different backgrounds to different surfaces rather than flattening everything into one color. Text color is selected against the mapped background, targeting the configured contrast. Borders, links, highlights, gradients and shadows use separate tokens. Image backgrounds and media are preserved. Canvas/SVG charts, images, videos, embedded documents, editors, contenteditable and sensitive forms are protected.

### Domain rules

Create a rule with an exact domain, optional subdomains and priority 0–100. Higher priority wins; a more specific domain wins a tie. A rule can inherit the global palette or choose its own, override individual tokens, preserve elements, specify validated custom CSS, enable reading width and reduced motion, and store focus selectors. Allowlist/blocklist controls gate automatic recoloring. Original mode concerns colors; explicit focus and reading rules are separate choices.

Custom CSS is a separate, clearly labeled advanced feature. It is bounded and rejects remote imports, URLs, CSS escape bypasses and executable constructs. Because it expresses your own styling intent, it can override layout beyond the automatic engine's preservation safeguards. Use selector rules first and export before broad CSS edits.

## Inspector

Use the browser toolbar → Inspect, or the command palette. Hover and click an eligible element; Escape closes selection. The panel shows its selector, matching count, current/original colors, contrast, current site rule and token values. Preview background/text/border changes, undo/redo, save the element override, preserve its original style or reset overrides.

Stable unique IDs and test attributes are preferred, then a bounded structural selector. A selector that is ambiguous or crosses a shadow boundary is not silently persisted. Dynamic applications may later invalidate a previously unique structural selector; the panel warns about this risk. Preview changes are undone on close, and all highlights/listeners are removed. Saved rules survive reload; live preview history is not exported.

## Marketplace and adaptive appearance

The marketplace is an offline curated catalog of 14 palettes, including official Catppuccin Mocha/Latte, Deep Purple, Soft Dark and existing NØVA themes. Search, filter, preview, apply to New Tab or websites, duplicate, edit, create, delete custom themes, and import/export validated JSON. It is not a remote store and downloads no theme scripts.

Adaptive Appearance supports local time ranges (including overnight), system light/dark preference and active profiles/workspaces, with explicit rule priority. A manual palette selection overrides schedules for one hour; Resume clears it. Browser alarms target the next boundary. Waking the browser or showing a tab refreshes selection. Timezone changes are applied on the next lifecycle refresh; no periodic timezone watcher runs.

## Focus

Focus Mode is reversible and per site. Pick nonessential elements, use a preset, adjust reading width or reduce motion. The picker refuses primary content containers, controls, forms, alerts and login/payment/security surfaces. Site-specific structural selectors can change with a website redesign; review them if a site stops matching.

Closed shadow roots, cross-origin frames without their own host grants, inaccessible native controls and pixels inside canvas/video cannot be recolored by this engine. Open shadow roots are discovered initially, through observed insertions and pointer/focus interaction. Immediate discovery of an unobserved late closed-root component is impossible without modifying the host page's JavaScript.
