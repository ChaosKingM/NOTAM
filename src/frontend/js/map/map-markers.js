/**
 * Manages simple markers on the map.
 */
let activeMarkers = [];

/**
 * Clears all currently visible markers.
 */
export function clearMarkers() {
    activeMarkers.forEach(m => m.remove());
    activeMarkers = [];
}

/**
 * Creates a new marker and adds it to the map with hover tooltip.
 * @param {Object} map - MapLibre GL Instance
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} color - Hexadecimal marker color
 * @param {Function} onClick - Callback for click event
 * @returns {Object} Created marker
 */
export function addMarker(map, lat, lon, color = '#00bef0', onClick = null) {
    const marker = new maplibregl.Marker({ color })
        .setLngLat([lon, lat])
        .addTo(map);

    // Create a popup for the hover tooltip
    const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 25,
        className: 'marker-popup'
    }).setHTML(`<strong>Coord:</strong> ${lat.toFixed(4)}, ${lon.toFixed(4)}`);

    const el = marker.getElement();
    
    // Show coordinates on hover
    el.addEventListener('mouseenter', () => popup.setLngLat([lon, lat]).addTo(map));
    el.addEventListener('mouseleave', () => popup.remove());

    // Also remove popup if clicked, to prevent it staying "sticky" when marker is removed
    el.addEventListener('click', () => popup.remove());

    if (onClick) {
        el.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the map from deselecting immediately
            onClick(e);
        });
    }

    activeMarkers.push(marker);
    return marker;
}
