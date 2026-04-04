import { dmsToDecimal } from '../utils/geo-utils.js';

/**
 * Centralized regular expression patterns for the parser.
 */
const PATTERNS = {
    SEGMENT: /(?=![A-Z]{3})/g,
    COORDINATES: /(\d{6,8}[NS])\s*(\d{7,9}[EW])/g,
    NAV_AIDS: /([A-Z]{3,5})\s+(VORTAC|VOR|INT|FIX|DME|NDB)/g,
    RADIALS: /R-\d{3}/g,
    ALTITUDES: /(\d+)\s*(FT|AGL|MSL)|SFC|UNL/g,
    RADIUS: /(\d+)\s*NM\s*RADIUS/,
    DATES: /(\d{10})-(\d{10})(\w{0,3})/
};

/**
 * Main entry point to analyze a text string with several NOTAMs.
 * @param {string} fullText - Full text containing one or more NOTAMs.
 * @returns {Array} Collection of processed NOTAM objects.
 */
export function analyzeNotam(fullText) {
    const segments = fullText.split(PATTERNS.SEGMENT);
    const results = [];

    segments.forEach(notamText => {
        if (!notamText.trim()) return;

        const text = notamText.toUpperCase();
        const result = initializeNotamObject(notamText.trim());

        // Process extractions
        result.coordinates = extractCoordinates(text);
        result.navaids = extractNavaids(text);
        result.altitudes = extractAltitudes(text);
        result.dates = extractDates(text, result);
        
        // Extract radials (as extra description)
        const radials = text.match(PATTERNS.RADIALS);
        if (radials) result.description += " Radials: " + radials.join(", ");

        // Determine Geometry
        result.geometryType = determineGeometry(text, result);

        // Only add if we detect something useful (Coordinates or Navaids)
        if (result.coordinates.length > 0 || result.navaids.length > 0) {
            results.push(result);
        }
    });

    return results;
}

/**
 * Initializes the basic structure of a NOTAM object.
 */
function initializeNotamObject(raw) {
    return {
        raw: raw,
        coordinates: [],
        altitudes: [],
        dates: [],
        geometryType: "UNKNOWN",
        radius: null,
        navaids: [],
        description: ""
    };
}

/**
 * Extracts and converts DMS coordinates to decimals.
 */
function extractCoordinates(text) {
    const coords = [];
    const matches = text.match(PATTERNS.COORDINATES);
    
    if (matches) {
        matches.forEach(match => {
            const latPart = match.match(/\d{6,8}[NS]/)[0];
            const lonPart = match.match(/\d{7,9}[EW]/)[0];
            const lat = dmsToDecimal(latPart);
            const lon = dmsToDecimal(lonPart);
            if (lat !== null && lon !== null) {
                coords.push({ lat, lon });
            }
        });
    }
    return coords;
}

/**
 * Extracts radio aids (NAVAIDs) and intersections.
 */
function extractNavaids(text) {
    const matches = text.match(PATTERNS.NAV_AIDS);
    return matches ? [...new Set(matches.map(m => m.trim()))] : [];
}

/**
 * Extracts and normalizes altitudes.
 */
function extractAltitudes(text) {
    const matches = text.match(PATTERNS.ALTITUDES);
    if (!matches) return [];

    return matches.map(m => {
        const val = m.trim();
        if (val === "SFC") return "0FT";
        if (val === "UNL") return "99999FT";
        return val;
    });
}

/**
 * Extracts the date range and time zone.
 */
function extractDates(text, result) {
    const match = text.match(PATTERNS.DATES);
    if (match) {
        if (match[3]) result.description += ` [TZ: ${match[3]}]`;
        return [match[1], match[2]];
    }
    return [];
}

/**
 * Determines the geometry type based on extracted data.
 */
function determineGeometry(text, result) {
    const radiusMatch = text.match(PATTERNS.RADIUS);
    
    if (radiusMatch) {
        result.radius = parseFloat(radiusMatch[1]);
        return "RADIUS";
    }
    
    if (result.coordinates.length === 1) return "POINT";
    if (result.coordinates.length === 2) return "ROUTE";
    if (result.coordinates.length > 2) return "AREA";
    if (result.navaids.length > 0) return "NAVAID/ROUTE";
    
    return "UNKNOWN";
}
