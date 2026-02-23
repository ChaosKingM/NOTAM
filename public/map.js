function toggleSection(id) {
    const content = document.getElementById(id);
    const header = content.previousElementSibling;
    content.classList.toggle('collapsed');
    header.classList.toggle('collapsed');
}

document.addEventListener('DOMContentLoaded', function () {
    const map = new maplibregl.Map({
        container: 'map',
        zoom: 3,
        center: [-98, 39],
        style: 'https://api.maptiler.com/maps/basic/style.json?key=FPrACFQDiXCzyiG0WjWt',
    });

    map.addControl(new maplibregl.NavigationControl());

    let allNotams = [];
    let activeMarkers = [];
    let selectedNotamStack = [];
    let currentStackIndex = 0;
    let selectionMarker = null;
    let isSatellite = false;

    function setupMapResources() {
        if (!map.getSource('notam-shapes')) {
            map.addSource('notam-shapes', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            map.addSource('selected-shape', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            map.addLayer({
                id: 'notam-fill',
                type: 'fill',
                source: 'notam-shapes',
                paint: {
                    'fill-color': '#00bef0',
                    'fill-opacity': 0.3,
                    'fill-outline-color': '#00bef0'
                }
            });

            map.addLayer({
                id: 'notam-line',
                type: 'line',
                source: 'notam-shapes',
                paint: {
                    'line-color': '#00bef0',
                    'line-width': 4,
                    'line-opacity': 0.8
                }
            });

            map.addLayer({
                id: 'selected-fill',
                type: 'fill',
                source: 'selected-shape',
                paint: {
                    'fill-color': '#ff9800',
                    'fill-opacity': 0.5,
                    'fill-outline-color': '#ff9800'
                }
            });

            map.addLayer({
                id: 'selected-line-highlight',
                type: 'line',
                source: 'selected-shape',
                paint: {
                    'line-color': '#ff9800',
                    'line-width': 6,
                    'line-opacity': 1
                }
            });
        }
    }

    map.on('load', () => {
        setupMapResources();

        const notamInput = document.getElementById('notam-input');
        const analyzerBtn = document.getElementById('btn-analyzer');
        const filterAlt = document.getElementById('filter-alt');
        const filterDateStart = document.getElementById('filter-date-start');
        const filterDateEnd = document.getElementById('filter-date-end');

        const infoPanel = document.getElementById('info-panel');
        const infoType = document.getElementById('info-type');
        const infoCoords = document.getElementById('info-coords');
        const infoAlt = document.getElementById('info-alt');
        const infoDate = document.getElementById('info-date');

        const navContainer = document.getElementById('notam-navigation');
        const counterText = document.getElementById('notam-counter');
        const btnPrev = document.getElementById('btn-prev-notam');
        const btnNext = document.getElementById('btn-next-notam');

        analyzerBtn.onclick = () => {
            const results = analizarNotam(notamInput.value);
            allNotams = results;
            applyFiltersAndRender();
        };

        [filterAlt, filterDateStart, filterDateEnd].forEach(el => {
            el.oninput = () => applyFiltersAndRender();
        });

        document.getElementById('btn-toggle-view').onclick = () => {
            isSatellite = !isSatellite;
            map.setStyle(isSatellite
                ? 'https://api.maptiler.com/maps/hybrid/style.json?key=FPrACFQDiXCzyiG0WjWt'
                : 'https://api.maptiler.com/maps/basic/style.json?key=FPrACFQDiXCzyiG0WjWt'
            );
            map.once('idle', () => applyFiltersAndRender(false));
        };

        function applyFiltersAndRender(shouldFly = true) {
            setupMapResources();
            if (!map.getSource('notam-shapes')) return;

            const minAlt = parseInt(filterAlt.value) || 0;
            const dStart = filterDateStart.value;
            const dEnd = filterDateEnd.value;

            const filtered = allNotams.filter(n => {
                const maxAltInNotam = Math.max(...n.altitudes.map(a => parseInt(a) || 0), 0);
                if (maxAltInNotam < minAlt && n.altitudes.length > 0) return false;
                if (dStart && n.dates[1] && n.dates[1].substring(0, 6) < dStart) return false;
                if (dEnd && n.dates[0] && n.dates[0].substring(0, 6) > dEnd) return false;
                return true;
            });

            renderData(filtered, shouldFly);
        }

        function renderData(data, shouldFly = true) {
            activeMarkers.forEach(m => m.remove());
            activeMarkers = [];
            if (selectionMarker) { selectionMarker.remove(); selectionMarker = null; }
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
                } else if (n.geometryType === "ROUTE") {
                    const coords = n.coordinates.map(c => [c.lon, c.lat]);
                    features.push({
                        type: 'Feature',
                        properties: { id: globalIdx },
                        geometry: { type: 'LineString', coordinates: coords }
                    });
                } else {
                    const marker = new maplibregl.Marker({ color: '#00bef0' })
                        .setLngLat([first.lon, first.lat])
                        .addTo(map);
                    marker.getElement().addEventListener('click', () => {
                        selectedNotamStack = [n];
                        currentStackIndex = 0;
                        showCurrentFromStack();
                    });
                    activeMarkers.push(marker);
                }
            });

            const source = map.getSource('notam-shapes');
            if (source) source.setData({ type: 'FeatureCollection', features: features });

            const selSource = map.getSource('selected-shape');
            if (selSource) selSource.setData({ type: 'FeatureCollection', features: [] });

            if (shouldFly && data.length > 0 && data[0].coordinates && data[0].coordinates.length > 0) {
                const first = data[0].coordinates[0];
                map.flyTo({ center: [first.lon, first.lat], zoom: 6, essential: true });
            }
        }

        map.on('click', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['notam-fill', 'notam-line'] });
            if (features.length > 0) {
                const ids = [...new Set(features.map(f => f.properties.id))];
                selectedNotamStack = ids.map(id => allNotams[id]);
                currentStackIndex = 0;
                showCurrentFromStack();
            } else {
                infoPanel.style.display = 'none';
                if (selectionMarker) { selectionMarker.remove(); selectionMarker = null; }
                const selSource = map.getSource('selected-shape');
                if (selSource) selSource.setData({ type: 'FeatureCollection', features: [] });
            }
        });

        function showCurrentFromStack() {
            if (selectedNotamStack.length === 0) return;
            const data = selectedNotamStack[currentStackIndex];
            infoPanel.style.display = 'block';

            const selSource = map.getSource('selected-shape');
            if (selSource) {
                let feat = null;
                const coords = data.coordinates.map(c => [c.lon, c.lat]);
                if (data.geometryType === "RADIUS" && data.radius && data.coordinates[0]) {
                    feat = createCircleFeature(data.coordinates[0].lon, data.coordinates[0].lat, data.radius);
                } else if (data.geometryType === "AREA") {
                    const polyCoords = [...coords, coords[0]];
                    feat = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [polyCoords] } };
                } else if (data.geometryType === "ROUTE") {
                    feat = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
                }
                selSource.setData({ type: 'FeatureCollection', features: feat ? [feat] : [] });
            }

            if (selectionMarker) { selectionMarker.remove(); selectionMarker = null; }
            if (data.coordinates.length > 0) {
                const first = data.coordinates[0];
                selectionMarker = new maplibregl.Marker({ color: '#ff9800' })
                    .setLngLat([first.lon, first.lat])
                    .addTo(map);
            }

            if (selectedNotamStack.length > 1) {
                navContainer.style.display = 'flex';
                counterText.innerText = `${currentStackIndex + 1} of ${selectedNotamStack.length}`;
                btnPrev.disabled = (currentStackIndex === 0);
                btnNext.disabled = (currentStackIndex === selectedNotamStack.length - 1);
            } else {
                navContainer.style.display = 'none';
            }

            let typeStr = `TYPE: ${data.geometryType}${data.radius ? ` (${data.radius}NM RADIUS)` : ''}`;
            if (data.navaids.length > 0) typeStr += ` | Detected Fixes: ${data.navaids.join(', ')}`;
            infoType.innerText = typeStr;
            infoCoords.innerText = data.coordinates.length > 0
                ? `Coords: ${data.coordinates.map(c => `${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`).join(' | ')}`
                : "Coordinates: NOT DEFINED (Route/NAVAID)";
            infoAlt.innerText = `Altitude: ${data.altitudes.join(', ') || 'N/A'}`;
            infoDate.innerText = `Dates: ${data.dates.join(' TO ') || 'N/A'} ${data.description || ''}`;
            window.currentNotamData = data;
        }

        btnPrev.onclick = () => { if (currentStackIndex > 0) { currentStackIndex--; showCurrentFromStack(); } };
        btnNext.onclick = () => { if (currentStackIndex < selectedNotamStack.length - 1) { currentStackIndex++; showCurrentFromStack(); } };

        function createCircleFeature(lon, lat, radiusNM) {
            const radiusKM = radiusNM * 1.852;
            const points = 64;
            const coords = [];
            const dX = radiusKM / (111.32 * Math.cos(lat * Math.PI / 180));
            const dY = radiusKM / 110.574;
            for (let i = 0; i < points; i++) {
                const theta = (i / points) * (2 * Math.PI);
                coords.push([lon + dX * Math.cos(theta), lat + dY * Math.sin(theta)]);
            }
            coords.push(coords[0]);
            return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
        }

        document.getElementById('btn-copy').onclick = () => {
            if (window.currentNotamData) {
                navigator.clipboard.writeText(JSON.stringify(window.currentNotamData, null, 2));
                alert("JSON copied!");
            }
        };

        document.getElementById('btn-download').onclick = () => {
            if (window.currentNotamData) {
                const n = window.currentNotamData;
                const csv = `Attribute,Value\nType,${n.geometryType}\nCoords,"${n.coordinates.map(c => `${c.lat},${c.lon}`).join(';')}"\nAltitudes,"${n.altitudes.join(';')}"\nDates,"${n.dates.join('-')}"`;
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'notam_details.csv';
                a.click();
            }
        };

        document.getElementById('btn-map-mark').onclick = () => {
            const lat = parseFloat(document.getElementById('lat-field').value);
            const lon = parseFloat(document.getElementById('lon-field').value);
            if (!isNaN(lat) && !isNaN(lon)) {
                map.flyTo({ center: [lon, lat], zoom: 12 });
                new maplibregl.Marker().setLngLat([lon, lat]).addTo(map);
            }
        };
    });
});
