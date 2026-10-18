# Energy balance engine (MR 3)

The energy balance is **read-only** and **opt-in**. It computes instantaneous active
power (kW) for each *connected* AC or DC electrical network from the typed
topology introduced in MR !49.

MR 3 introduced the model. MR 4 provides manual port editing and assignment,
conservative branch animation, and three test scenarios (HA/hybrid/simulation).
Manual bends remain authoritative. There is **no automatic cable routing**,
no inference from SVG crossings, and no HA service calls.
See [ENERGY_FLOW.md](ENERGY_FLOW.md) for animation limits and test behavior.

## Model

Add an \`energy_balance\` member to \`studio_layout\`:

\`\`\`json
{
  "enabled": true,
  "tolerance_kw": 0.05,
  "participants": [
    {"node_id": "sofar", "mode": "device"},
    {"node_id": "house", "mode": "manual", "manual_kw": 2.5},
    {"node_id": "utility", "mode": "calculate"}
  ]
}
\`\`\`

The nodes must have \`energy_ports\` and electric connections must have
\`energy_start\` and \`energy_end\` referencing a valid node and port.
Ports sharing a logical \`bus\` within a device are equivalent electrically;
crossing SVG paths **do not** connect.

Up to 100 explicit participant overrides may be configured. Missing overrides
use native device readings. Allowed \`mode\` values: \`device\`, \`ha\`,
\`manual\`, \`calculate\`, \`off\`. A \`ha\` participant uses a \`W\` or \`kW\`
entity and can optionally use \`reverse_sign\`. A \`manual\` participant
specifies a test value in kW. For a **load**, positive manual/HA kW means
consumption, while positive device-normalized injection means supply.

Supported native roles:

- \`inverter\`: AC generation (positive injection)
- \`building\`: consumption (negative injection)
- \`ev_charger\`: consumption; device configuration determines sign
- \`energy_storage\`: charging is negative, discharging positive
- \`power_grid\`: positive grid import / negative export

The power grid can use separate native import/export power measurements
(default \`grid_strategy: "import_export"\`) or a signed native
\`total_kw\` (\`grid_strategy: "signed_total"\`). Choose signed conventions
explicitly. Import/export readings are **power** in W/kW, not kWh totals.

## Results and limitations

\`HASSStudioEnergyBalance.resolve(layout, hass)\` returns per-network
\`devices\`, \`totals\`, \`residual_kw\`, \`state\`, \`reasons\` and \`warnings\`.
Power signs represent injections **into** the network:

- PV/other source output: positive
- house/EV consumption: negative
- grid import: positive; grid export: negative
- storage discharge: positive; storage charge: negative

A single unknown participant explicitly marked \`calculate\` can be inferred
from conservation of power. Two unknowns or one unavailable required measurement
give \`insufficient\` with no invented total; incompatible source/load directions
and overlapping aggregate+individual loads give \`invalid\`.
Known conflicting measurements give \`unbalanced\` with a signed residual.

No battery SOC dynamics, energy history, phase-by-phase power estimates,
AC/DC conversion efficiencies or meshed-network branch flow calculations are
claimed. The model is instantaneous and assumes losses are already accounted for
or negligible. For history use Home Assistant / InfluxDB.
