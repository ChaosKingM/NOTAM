/**
 * Creates a Polygon (Circle) type Feature based on a center point and a radius.
 * @param {number} lon - Center longitude
 * @param {number} lat - Center latitude
 * @param {number} radiusNM - Radius in Nautical Miles (NM)
 * @returns {Object} GeoJSON Feature (Polygon)
 */
export function createCircleFeature(lon, lat, radiusNM) {
    const radiusKM = radiusNM * 1.852; // Conversion from NM to KM
    const points = 64; // Number of points to smooth the circle
    const coords = [];
    
    // Approximation of Earth's coordinate deformation
    const dX = radiusKM / (111.32 * Math.cos(lat * Math.PI / 180));
    const dY = radiusKM / 110.574;

    for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        coords.push([
            lon + dX * Math.cos(theta), 
            lat + dY * Math.sin(theta)
        ]);
    }
    
    // Close the polygon by repeating the first point
    coords.push(coords[0]);
    
    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [coords]
        }
    };
}

/**
 * Converts coordinates in DMS (Degrees, Minutes, Seconds) format to Decimal.
 * Supports 6 to 8 digit formats (e.g., 4355616N).
 * @param {string} dms - Coordinate in DMS format (e.g., "435561N")
 * @returns {number|null} Decimal coordinate or null if invalid
 */
export function dmsToDecimal(dms) {
    if (!dms) return null;
    const directionMatch = dms.match(/[NSWE]/);
    if (!directionMatch) return null;
    const direction = directionMatch[0];

    // North/South (Latitude) uses 2 digits for degrees: DDMMSS
    // East/West (Longitude) uses 3 digits for degrees: DDDMMSS
    const degDigits = (direction === 'N' || direction === 'S') ? 2 : 3;

    const digits = dms.replace(direction, "");
    const degrees = parseInt(digits.substring(0, degDigits));
    const minutes = parseInt(digits.substring(degDigits, degDigits + 2));
    const secondsTxt = digits.substring(degDigits + 2);

    let seconds = 0;
    if (secondsTxt) {
        if (secondsTxt.length > 2) {
            // Handle cases like 4355616N -> seconds = 61.6
            seconds = parseFloat(secondsTxt.substring(0, 2) + "." + secondsTxt.substring(2));
        } else {
            seconds = parseInt(secondsTxt);
        }
    }

    let decimal = degrees + minutes / 60 + seconds / 3600;

    // Normalization for the log (helps user see processed DMS)
    let normSeconds = seconds;
    let normMinutes = minutes;
    let normDegrees = degrees;

    if (normSeconds >= 60) {
        normMinutes += Math.floor(normSeconds / 60);
        normSeconds = (normSeconds % 60).toFixed(2);
    }
    if (normMinutes >= 60) {
        normDegrees += Math.floor(normMinutes / 60);
        normMinutes = normMinutes % 60;
    }

    console.log(`DMS Normalized -> Type: ${direction === "N" || direction === "S" ? "Lat" : "Lon"}, Deg: ${normDegrees}, Min: ${normMinutes}, Sec: ${normSeconds}, Dir: ${direction}`);

    if (direction === 'S' || direction === 'W') {
        decimal = -decimal;
    }
    return decimal;
}

/**
 * Calculates the bounding box (Bounds) for any NOTAM based on its geometry.
 * @param {Object} notam - NOTAM object from parser
 * @returns {Array|null} Bounds as [[minLon, minLat], [maxLon, maxLat]] or null
 */
export function getNotamBounds(notam) {
    if (!notam.coordinates || notam.coordinates.length === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    // 1. Process explicit coordinates (Points, Routes, Areas)
    notam.coordinates.forEach(c => {
        if (c.lat < minLat) minLat = c.lat;
        if (c.lat > maxLat) maxLat = c.lat;
        if (c.lon < minLon) minLon = c.lon;
        if (c.lon > maxLon) maxLon = c.lon;
    });

    // 2. Adjust bounds if it's a CIRCLE/RADIUS
    if (notam.geometryType === "RADIUS" && notam.radius) {
        const radiusKM = notam.radius * 1.852;
        const latOffset = radiusKM / 110.574;
        const lonOffset = radiusKM / (111.32 * Math.cos(minLat * Math.PI / 180));

        minLat -= latOffset;
        maxLat += latOffset;
        minLon -= lonOffset;
        maxLon += lonOffset;
    }

    // 3. For single point without radius, MapLibre fitBounds needs a small box
    // or we can just return a box with tiny padding to force the fly
    if (minLat === maxLat && minLon === maxLon) {
        const padding = 0.005; // ~500m
        return [[minLon - padding, minLat - padding], [maxLon + padding, maxLat + padding]];
    }

    return [[minLon, minLat], [maxLon, maxLat]];
}
