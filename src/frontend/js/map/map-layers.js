/**
 * Configure layers and fonts in map object.
 * @param {Object} map - MapLibre GL Instance
 */
export function setupMapResources(map) {
    if (!map.getSource('notam-shapes')) {
        // Source for all filtered NOTAMs
        map.addSource('notam-shapes', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        // Source for selected NOTAM (Highlight)
        map.addSource('selected-shape', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        // Fill Layer for general NOTAMs
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

        // Line Layer for general NOTAMs
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

        // Fill Layer for Selection
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

        // Line Layer for Selection (Highlight)
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

/**
 * Updates the GeoJSON information of a specific source.
 * @param {Object} map - MapLibre GL Instance
 * @param {string} sourceId - Source ID ('notam-shapes' or 'selected-shape')
 * @param {Array|Object} data - Features to set
 */
export function updateMapSource(map, sourceId, data) {
    const source = map.getSource(sourceId);
    if (!source) return;

    if (Array.isArray(data)) {
        source.setData({
            type: 'FeatureCollection',
            features: data
        });
    } else {
        source.setData({
            type: 'FeatureCollection',
            features: data ? [data] : []
        });
    }
}
