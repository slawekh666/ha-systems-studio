# MR 5 — optional energy diagnostics

The per-network diagnostics widget is **disabled by default**. In Custom Designer,
enable *Pokaż panel w schemacie* under *Bilans energii*. You can independently
show/hide the device list, cable diagnostics and warnings.

The card overlays a collapsible read-only diagnostic panel without changing
canvas coordinates, manual bends, or existing device SVG icons. There is also an
editor diagnostic view. Each network has its own AC/DC label and status.
Totals are shown only for solved networks; unknown readings display a dash.
Network residual, individual participant signed injection, HA/simulation/calculated
source and only uniquely resolved cable flow are displayed. Detached or incompatible
connections and topology errors are reported separately. Unrelated networks are
never summed or silently joined.

UI strings are Polish/English and user-defined labels are HTML-escaped. The
panel cannot call HA services. All prior schemas normalize with
`energy_diagnostics.enabled = false`. `node dev/test-energy-diagnostics.js`
covers available/unavailable data, source attribution, escaping, options and
save/reload compatibility. The entire project suite runs in GitLab CI.

Visual acceptance is still required in a running HA installation for placement,
screen reader navigation, mobile clipping and dark/light theme contrast.
