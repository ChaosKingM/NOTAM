import { analyzeNotam } from '../parser/notam-parser.js';
import { ui, updateSidebarInfo, initUIEventListeners } from '../ui/ui-controller.js';
import { setupMapResources, updateMapSource } from './map-layers.js';
import { addMarker, clearMarkers } from './map-markers.js';
import { createCircleFeature, getNotamBounds } from '../utils/geo-utils.js';

/**
 * Global state of the module (Encapsulated)
 */
let allNotams = [];
let selectedNotamStack = [];
let currentStackIndex = 0;
let selectionMarkers = [];
let isSatellite = false;

/**
 * Main initialization
 */
document.addEventListener('DOMContentLoaded', function () {
    const map = new maplibregl.Map({
        container: 'map',
        zoom: 3,
        center: [-98, 39],
        style: 'https://api.maptiler.com/maps/basic/style.json?key=N4odKOFgILAX4nqNXz1J',
    });

    map.addControl(new maplibregl.NavigationControl());

    map.on('load', () => {
        setupMapResources(map);
    });

    initUIEventListeners();
    bindUIEvents(map);

    /**
     * Binds UI events to map logic.
     */
    function bindUIEvents(map) {
        // NOTAM Analyzer
        ui.analyzerBtn.onclick = () => {
            if (!ui.notamInput.value.trim()) return;
            allNotams = analyzeNotam(ui.notamInput.value);
            applyFiltersAndRender(map);
        };

        // Filters (Altitude and Dates)
        [ui.filterAlt, ui.filterDateStart, ui.filterDateEnd].forEach(el => {
            el.oninput = () => applyFiltersAndRender(map);
        });

        // View Change (Satellite/OSM)
        ui.btnToggleView.onclick = () => {
            isSatellite = !isSatellite;
            map.setStyle(isSatellite
                ? 'https://api.maptiler.com/maps/hybrid/style.json?key=N4odKOFgILAX4nqNXz1J'
                : 'https://api.maptiler.com/maps/basic/style.json?key=N4odKOFgILAX4nqNXz1J'
            );
            map.once('idle', () => applyFiltersAndRender(map, false));
        };

        // Click on the map for selection
        map.on('click', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['notam-fill', 'notam-line'] });
            if (features.length > 0) {
                const ids = [...new Set(features.map(f => f.properties.id))];
                selectedNotamStack = ids.map(id => allNotams[id]);
                currentStackIndex = 0;
                showCurrentFromStack(map);
            } else {
                updateSidebarInfo(null);
                clearSelectionMarkers();
                updateMapSource(map, 'selected-shape', null);
            }
        });

        // NOTAM stack navigation
        ui.btnPrev.onclick = () => { if (currentStackIndex > 0) { currentStackIndex--; showCurrentFromStack(map); } };
        ui.btnNext.onclick = () => { if (currentStackIndex < selectedNotamStack.length - 1) { currentStackIndex++; showCurrentFromStack(map); } };

        // Export buttons
        ui.btnCopy.onclick = () => exportToClipboard();
        ui.btnDownload.onclick = () => exportToCSV();

        // Manual coordinate marking
        ui.btnMapMark.onclick = () => {
            const lat = parseFloat(ui.latField.value);
            const lon = parseFloat(ui.lonField.value);
            if (!isNaN(lat) && !isNaN(lon)) {
                map.flyTo({ center: [lon, lat], zoom: 12 });
                addMarker(map, lat, lon, '#ff5722'); // Orange marker for manual
            }
        };
    }

    /**
     * Filters current NOTAMs and renders them on the map.
     */
    function applyFiltersAndRender(map, shouldFly = true) {
        setupMapResources(map);

        const minAlt = parseInt(ui.filterAlt.value) || 0;
        const dStart = ui.filterDateStart.value;
        const dEnd = ui.filterDateEnd.value;

        const filtered = allNotams.filter(n => {
            const maxAltInNotam = Math.max(...n.altitudes.map(a => parseInt(a) || 0), 0);
            if (maxAltInNotam < minAlt && n.altitudes.length > 0) return false;
            if (dStart && n.dates[1] && n.dates[1].substring(0, 6) < dStart) return false;
            if (dEnd && n.dates[0] && n.dates[0].substring(0, 6) > dEnd) return false;
            return true;
        });

        renderData(map, filtered, shouldFly);
    }

    /**
     * Draws filtered data in layers or as markers.
     */
    function renderData(map, data, shouldFly = true) {
        clearMarkers();
        clearSelectionMarkers();
        const features = [];

        data.forEach((n) => {
            const first = n.coordinates[0];
            if (!first) return;
            const globalIdx = allNotams.indexOf(n);

            if (n.geometryType === "RADIUS" && n.radius) {
                const feat = createCircleFeature(first.lon, first.lat, n.radius);
                feat.properties = { id: globalIdx };
                features.push(feat);
            } else if (n.geometryType === "AREA") {
                const coords = n.coordinates.map(c => [c.lon, c.lat]);
                coords.push(coords[0]);
                features.push({
                    type: 'Feature',
                    properties: { id: globalIdx },
                    geometry: { type: 'Polygon', coordinates: [coords] }
                });

                // Add markers for ALL points of the area
                n.coordinates.forEach(coord => {
                    addMarker(map, coord.lat, coord.lon, '#00bef0', () => {
                        selectedNotamStack = [n];
                        currentStackIndex = 0;
                        showCurrentFromStack(map);
                    });
                });
            } else if (n.geometryType === "ROUTE") {
                const coords = n.coordinates.map(c => [c.lon, c.lat]);
                features.push({
                    type: 'Feature',
                    properties: { id: globalIdx },
                    geometry: { type: 'LineString', coordinates: coords }
                });

                // Add markers for start and end points of the route
                if (n.coordinates.length > 0) {
                    const start = n.coordinates[0];
                    addMarker(map, start.lat, start.lon, '#00bef0', () => {
                        selectedNotamStack = [n];
                        currentStackIndex = 0;
                        showCurrentFromStack(map);
                    });

                    if (n.coordinates.length > 1) {
                        const end = n.coordinates[n.coordinates.length - 1];
                        addMarker(map, end.lat, end.lon, '#00bef0', () => {
                            selectedNotamStack = [n];
                            currentStackIndex = 0;
                            showCurrentFromStack(map);
                        });
                    }
                }
            } else {
                // If it's a point, use a marker
                addMarker(map, first.lat, first.lon, '#00bef0', () => {
                    selectedNotamStack = [n];
                    currentStackIndex = 0;
                    showCurrentFromStack(map);
                });
            }
        });

        // Update data sources
        updateMapSource(map, 'notam-shapes', features);
        updateMapSource(map, 'selected-shape', null);

        // Smart Zoom: Fit the map to the bounds of the first NOTAM analyzed
        if (shouldFly && data.length > 0) {
            const bounds = getNotamBounds(data[0]);
            if (bounds) {
                map.fitBounds(bounds, { padding: 80, maxZoom: 15, essential: true });
            }
        }
    }

    /**
     * Shows the detail of the selected NOTAM and highlights it on the map.
     */
    function showCurrentFromStack(map) {
        if (selectedNotamStack.length === 0) return;
        const data = selectedNotamStack[currentStackIndex];
        
        updateSidebarInfo(data, currentStackIndex, selectedNotamStack.length);

        // Highlight the shape on the map
        let highlightFeat = null;
        if (data.geometryType === "RADIUS" && data.radius && data.coordinates[0]) {
            highlightFeat = createCircleFeature(data.coordinates[0].lon, data.coordinates[0].lat, data.radius);
        } else if (data.geometryType === "AREA") {
            const pc = data.coordinates.map(c => [c.lon, c.lat]);
            highlightFeat = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...pc, pc[0]]] } };
        } else if (data.geometryType === "ROUTE") {
            const rc = data.coordinates.map(c => [c.lon, c.lat]);
            highlightFeat = { type: 'Feature', geometry: { type: 'LineString', coordinates: rc } };
        }
        updateMapSource(map, 'selected-shape', highlightFeat);

        // Selection markers and fly to the selection
        clearSelectionMarkers();
        if (data.coordinates.length > 0) {
            // Add markers for all coordinates (especially useful for AREA and ROUTE)
            data.coordinates.forEach(coord => {
                selectionMarkers.push(addMarker(map, coord.lat, coord.lon, '#ff9800'));
            });
            
            const bounds = getNotamBounds(data);
            if (bounds) {
                map.fitBounds(bounds, { padding: 100, maxZoom: 15, essential: true });
            }
        }
    }

    function clearSelectionMarkers() {
        selectionMarkers.forEach(m => m.remove());
        selectionMarkers = [];
    }

    function exportToClipboard() {
        if (window.currentNotamData) {
            navigator.clipboard.writeText(JSON.stringify(window.currentNotamData, null, 2));
            alert("Copied as JSON!");
        }
    }

    function exportToCSV() {
        if (window.currentNotamData) {
            const n = window.currentNotamData;
            const csv = `Attribute,Value\nType,${n.geometryType}\nCoord,"${n.coordinates.map(c => `${c.lat},${c.lon}`).join(';')}"\nAltitude,"${n.altitudes.join(';')}"\nDates,"${n.dates.join('-')}"`;
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `notam_${n.geometryType}.csv`;
            a.click();
        }
    }
});
