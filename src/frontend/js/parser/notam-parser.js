import { dmsToDecimal, getBearing, generateArcPoints } from '../utils/geo-utils.js';

/**
 * Centralized regular expression patterns for the parser.
 */
const PATTERNS = {
    SEGMENT: /(?=![A-Z]{3})/g,
    NOTAM_ID: /!([A-Z]{3})\s+(\d+\/\d+)/,
    COORDINATES: /(\d{6,8}(?:\.\d+)?[NS])\s*(\d{7,9}(?:\.\d+)?[EW])/g,
    NAV_AIDS: /([A-Z]{3,5})\s+(VORTAC|VOR|INT|FIX|DME|NDB)/g,
    RADIALS: /R-\d{3}/g,
    ALTITUDES: /(\d+)\s*(FT|AGL|MSL)|SFC|UNL/g,
    RADIUS: /(\d+(?:\.\d+)?)\s*NM\s*RADIUS/,
    DATES: /(\d{10})-(\d{10})(\w{0,3})/,
    // Specific instruction patterns
    AREA_START: /WI AN AREA DEFINED AS/g,
    RADIUS_START: /(\d+(?:\.\d+)?)\s*NM\s*RADIUS\s+OF/,
    ARC: /THEN\s+(CLOCKWISE|COUNTER\s*CLOCKWISE)\s+ON\s+A\s+(\d+(?:\.\d+)?)\s*NM\s+ARC\s+CENTERED\s+ON\s+(\d{6,8}(?:\.\d+)?[NS])\s*(\d{7,9}(?:\.\d+)?[EW])/
};

/**
 * Main entry point to analyze a text string with several NOTAMs.
 * @param {string} fullText - Full text containing one or more NOTAMs.
 * @returns {Array} Collection of processed NOTAM objects.
 */
export function analyzeNotam(fullText) {
    const segments = fullText.split(PATTERNS.SEGMENT);
    const groups = new Map();

    // Group parts by ID
    segments.forEach(seg => {
        if (!seg.trim()) return;
        const match = seg.match(PATTERNS.NOTAM_ID);
        const id = match ? match[2] : `UNKNOWN_${Math.random()}`;
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id).push(seg.toUpperCase());
    });

    const results = [];

    groups.forEach((parts, id) => {
        const mergedText = parts.join(" ");
        const baseResult = initializeNotamObject(mergedText);
        const groupResults = [];
        
        // Global metadata
        baseResult.altitudes = extractAltitudes(mergedText);
        baseResult.dates = extractDates(mergedText, baseResult);
        baseResult.navaids = extractNavaids(mergedText);

        // Split by geometry blocks
        const geometryBlocks = mergedText.split(/(?=WI AN AREA DEFINED AS|WI\s+\d+(?:\.\d+)?\s*NM\s*RADIUS\s+OF|WI A LINE FROM)/);
        
        geometryBlocks.forEach(block => {
            const trimmedBlock = block.trim();
            if (!trimmedBlock) return;

            // Check for RADIUS first (it might be inside an AREA DEFINED AS)
            const radMatch = trimmedBlock.match(PATTERNS.RADIUS_START);
            if (radMatch) {
                const radiusVal = parseFloat(radMatch[1]);
                const coords = extractCoordinates(trimmedBlock);
                if (coords.length > 0) {
                    groupResults.push({ ...baseResult, raw: trimmedBlock, radius: radiusVal, coordinates: [coords[0]], geometryType: "RADIUS" });
                }
            } else if (trimmedBlock.includes("WI AN AREA DEFINED AS") || trimmedBlock.includes("WI A LINE FROM")) {
                const areaResult = { ...baseResult, raw: trimmedBlock };
                areaResult.coordinates = parseAreaCoordinates(trimmedBlock);
                areaResult.geometryType = "AREA";
                if (areaResult.coordinates.length > 0) groupResults.push(areaResult);
            }
        });

        // Fallback if no specific blocks found
        if (groupResults.length === 0) {
            const coords = extractCoordinates(mergedText);
            if (coords.length > 0) {
                const fallback = { ...baseResult, coordinates: coords };
                fallback.geometryType = determineGeometry(mergedText, fallback);
                groupResults.push(fallback);
            }
        }
        
        results.push(...groupResults);
    });

    return results;
}

/**
 * Advanced parsing of AREA coordinates including Arcs and "Point of Origin".
 */
function parseAreaCoordinates(text) {
    let coords = [];
    const pointsText = text.split(/ TO /);
    const origin = pointsText.length > 0 ? extractCoordinates(pointsText[0])[0] : null;

    pointsText.forEach((segment, index) => {
        const segmentCoords = extractCoordinates(segment);
        const arcMatch = segment.match(PATTERNS.ARC);

        if (arcMatch) {
            const centerLat = dmsToDecimal(arcMatch[3]);
            const centerLon = dmsToDecimal(arcMatch[4]);
            const center = { lat: centerLat, lon: centerLon };
            const radius = parseFloat(arcMatch[2]);
            const clockwise = arcMatch[1].includes("CLOCKWISE") && !arcMatch[1].includes("COUNTER");

            // Filter out the center coordinate from segment points
            const filteredSegmentCoords = segmentCoords.filter(c => 
                Math.abs(c.lat - center.lat) > 0.0001 || Math.abs(c.lon - center.lon) > 0.0001
            );
            coords.push(...filteredSegmentCoords);

            const startPoint = coords[coords.length - 1];

            // Determine endPoint
            let endPoint = null;
            if (index < pointsText.length - 1) {
                const nextCoords = extractCoordinates(pointsText[index + 1]);
                if (nextCoords.length > 0) endPoint = nextCoords[0];
            }
            if (!endPoint && (segment.includes("POINT OF ORIGIN") || (pointsText[index+1] && pointsText[index+1].includes("POINT OF ORIGIN")))) {
                endPoint = origin;
            }

            if (startPoint && center && endPoint) {
                const startBrng = getBearing(center, startPoint);
                const endBrng = getBearing(center, endPoint);
                const arcPoints = generateArcPoints(center, radius, startBrng, endBrng, clockwise);
                // Last point of generated arc will usually be endPoint
                coords.push(...arcPoints.slice(1, -1)); 
                coords.push(endPoint);
            }
        } else {
            coords.push(...segmentCoords);
            if (segment.includes("POINT OF ORIGIN") && origin) {
                coords.push(origin);
            }
        }
    });

    // Remove duplicates and ensure it's not empty
    return coords.filter((c, i, a) => i === 0 || (c.lat !== a[i-1].lat || c.lon !== a[i-1].lon));
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
            const latPart = match.match(/\d{6,8}(?:\.\d+)?[NS]/)[0];
            const lonPart = match.match(/\d{7,9}(?:\.\d+)?[EW]/)[0];
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
