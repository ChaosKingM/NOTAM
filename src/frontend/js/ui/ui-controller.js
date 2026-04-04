/**
 * Collects and exports references to DOM elements.
 * Updated with semantic IDs.
 */
export const ui = {
    notamInput: document.getElementById('notam-input'),
    analyzerBtn: document.getElementById('btn-analyzer'),
    filterAlt: document.getElementById('filter-alt'),
    filterDateStart: document.getElementById('filter-date-start'),
    filterDateEnd: document.getElementById('filter-date-end'),
    infoPanel: document.getElementById('selection-details'),
    infoType: document.getElementById('info-type'),
    infoCoords: document.getElementById('info-coords'),
    infoAlt: document.getElementById('info-alt'),
    infoDate: document.getElementById('info-date'),
    navContainer: document.getElementById('notam-navigation'),
    counterText: document.getElementById('notam-counter'),
    btnPrev: document.getElementById('btn-prev-notam'),
    btnNext: document.getElementById('btn-next-notam'),
    btnCopy: document.getElementById('btn-copy'),
    btnDownload: document.getElementById('btn-download'),
    btnToggleView: document.getElementById('btn-toggle-view'),
    btnMapMark: document.getElementById('btn-map-mark'),
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    latField: document.getElementById('lat-field'),
    lonField: document.getElementById('lon-field')
};

/**
 * Initializes UI event listeners (Non-intrusive).
 * Replaces old onclick attributes.
 */
export function initUIEventListeners() {
    // Handle collapsible sections
    const headers = document.querySelectorAll('.collapsible-header');
    headers.forEach(header => {
        header.onclick = () => {
            const contentId = header.getAttribute('data-target');
            if (contentId) toggleSection(contentId);
        };
    });

    // Handle sidebar toggle
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    if (btnToggle) {
        btnToggle.onclick = () => {
            const panel = document.getElementById('control-panel');
            if (!panel) return;

            panel.classList.toggle('collapsed-sidebar');
            btnToggle.classList.toggle('collapsed-tab');
            
            const arrow = btnToggle.querySelector('.toggle-arrow');
            if (arrow) {
                const isCollapsed = panel.classList.contains('collapsed-sidebar');
                arrow.innerText = isCollapsed ? '◀' : '▶';
            }
        };
    }
}

/**
 * Updates the lateral panel with information about the selected NOTAM.
 * @param {Object} data - Processed NOTAM data
 * @param {number} currentIdx - Current index in the stack (for navigation)
 * @param {number} stackTotal - Total number of NOTAMs in the stack
 */
export function updateSidebarInfo(data, currentIdx, stackTotal) {
    if (!data) {
        ui.infoPanel.style.display = 'none';
        return;
    }

    ui.infoPanel.style.display = 'block';

    // Navigation (if there are multiple NOTAMs at the same point)
    if (stackTotal > 1) {
        ui.navContainer.style.display = 'flex';
        ui.counterText.innerText = `${currentIdx + 1} of ${stackTotal}`;
        ui.btnPrev.disabled = (currentIdx === 0);
        ui.btnNext.disabled = (currentIdx === stackTotal - 1);
    } else {
        ui.navContainer.style.display = 'none';
    }

    // Information text
    let typeStr = `TYPE: ${data.geometryType}${data.radius ? ` (${data.radius}NM RADIUS)` : ''}`;
    if (data.navaids && data.navaids.length > 0) {
        typeStr += ` | Detected Navaids: ${data.navaids.join(', ')}`;
    }
    ui.infoType.innerText = typeStr;

    ui.infoCoords.innerText = data.coordinates && data.coordinates.length > 0
        ? `Coordinates: ${data.coordinates.map(c => `${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`).join(' | ')}`
        : "Coordinates: NOT DEFINED (Route/Navaid)";

    ui.infoAlt.innerText = `Altitude: ${data.altitudes.join(', ') || 'N/A'}`;
    ui.infoDate.innerText = `Dates: ${data.dates.join(' TO ') || 'N/A'} ${data.description || ''}`;

    // Store for export
    window.currentNotamData = data;
}

/**
 * Shows/Hides collapsible sections.
 * @param {string} id - ID of the content to collapse
 */
export function toggleSection(id) {
    const content = document.getElementById(id);
    if (!content) return;
    const header = content.previousElementSibling;
    content.classList.toggle('collapsed');
    if (header) header.classList.toggle('collapsed');
}
