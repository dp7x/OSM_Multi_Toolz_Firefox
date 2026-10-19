# Review notes — OSM MultiToolz 2.0.1

The extension's own JavaScript uses DOM element creation and textContent for API values, translations and imported watchlist data. It contains no innerHTML assignments. The deleted-object viewer passes HTMLElement objects to Leaflet popups.

The seven remaining innerHTML warnings are inside the unmodified official Leaflet 1.9.4 distribution, bundled locally at vendor/leaflet/leaflet.js. Attribution and license are in THIRD_PARTY_NOTICES.md and vendor/leaflet/LICENSE. Leaflet source map is included. This library has not been patched to hide validator warnings.

Leaflet distribution SHA-256: `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a`.

The package contains no obsolete XPI/ZIP backups. No remote code is executed. Historical OSM requests and map tiles are read-only; external tools and translation links are opened when selected by the user. No telemetry has been added.

The existing data-collection manifest declaration has not been changed to claim "none" solely to suppress a warning. This submission updates an existing extension; its necessary user-directed transmissions must be classified accurately before adopting the new Mozilla data-consent declaration.
