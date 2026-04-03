

function dmsToDecimal(dms) {
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
      // Handle case like 4355616N -> seconds = 61.6
      seconds = parseFloat(secondsTxt.substring(0, 2) + "." + secondsTxt.substring(2));
    } else {
      seconds = parseInt(secondsTxt);
    }
  }

  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Normalization for the console log (to show valid DMS to the user)
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

  console.log(`DMS Normalized -> Type: ${direction === "N" || direction === "S" ? "Lat" : "Lon"}, Deg: ${normDegrees}, Min: ${normMinutes}, Sec: ${normSeconds}, Dir: ${direction} (Raw Sec was: ${seconds})`);

  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  return decimal;
}

function analizarNotam(textoCompleto) {
  const segments = textoCompleto.split(/(?=![A-Z]{3})/g);
  const results = [];

  segments.forEach(textoNotam => {
    if (!textoNotam.trim()) return;

    const texto = textoNotam.toUpperCase();
    const result = {
      raw: textoNotam.trim(),
      coordinates: [],
      altitudes: [],
      dates: [],
      geometryType: "UNKNOWN",
      radius: null,
      navaids: [], // New field for VORs/Fixes
      description: ""
    };

    // 1. Extract DMS Coordinates (Flexible 6-8 digits)
    const coordMatches = texto.match(/(\d{6,8}[NS])\s*(\d{7,9}[EW])/g);
    if (coordMatches) {
      coordMatches.forEach(match => {
        const latPart = match.match(/\d{6,8}[NS]/)[0];
        const lonPart = match.match(/\d{7,9}[EW]/)[0];
        const lat = dmsToDecimal(latPart);
        const lon = dmsToDecimal(lonPart);
        if (lat !== null && lon !== null) {
          result.coordinates.push({ lat, lon });
        }
      });
    }

    // 2. Extract NAVAIDs and Fixes (e.g., ONL VORTAC, TYNDA INT, MHE VOR)
    const navaidMatches = texto.match(/([A-Z]{3,5})\s+(VORTAC|VOR|INT|FIX|DME|NDB)/g);
    if (navaidMatches) {
      result.navaids = [...new Set(navaidMatches.map(m => m.trim()))];
    }

    // 3. Extract Radials (e.g., R-039)
    const radialMatches = texto.match(/R-\d{3}/g);
    if (radialMatches) {
      result.description += " Radials: " + radialMatches.join(", ");
    }

    // 4. Extract Altitudes (Handle digits, SFC and UNL)
    const altMatches = texto.match(/(\d+)\s*(FT|AGL|MSL)|SFC|UNL/g);
    if (altMatches) {
      result.altitudes = altMatches.map(m => {
        const val = m.trim();
        if (val === "SFC") return "0FT";
        if (val === "UNL") return "99999FT";
        return val;
      });
    }

    // 5. Determine Geometry Type
    const radiusMatch = texto.match(/(\d+)\s*NM\s*RADIUS/);
    if (radiusMatch) {
      result.radius = parseFloat(radiusMatch[1]);
      result.geometryType = "RADIUS";
    } else if (result.coordinates.length === 1) {
      result.geometryType = "POINT";
    } else if (result.coordinates.length > 2) {
      result.geometryType = "AREA";
    } else if (result.coordinates.length === 2) {
      result.geometryType = "ROUTE";
    } else if (result.navaids.length > 0) {
      result.geometryType = "NAVAID/ROUTE";
    }

    // 6. Extract Dates (Handle suffixes like EST, UTC)
    const dateMatch = texto.match(/(\d{10})-(\d{10})(\w{0,3})/);
    if (dateMatch) {
      result.dates = [dateMatch[1], dateMatch[2]];
      if (dateMatch[3]) result.description += ` [TZ: ${dateMatch[3]}]`;
    }

    if (result.coordinates.length > 0 || result.navaids.length > 0) {
      results.push(result);
    }
  });

  return results;
}
