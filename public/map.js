document.addEventListener('DOMContentLoaded', function() {
    const map = new maplibregl.Map({
        container: 'map',
        zoom: 8,
        center: [-3.703790, 40.416775],
        pitch: 70,
        style: {
            version: 8,
            sources: {
                // Vista normal OSM
                osm: {
                    type: 'raster',
                    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    maxzoom: 19
                },

                // Vista satelital (MapTiler)
                satellite: {
                    type: 'raster',
                    tiles: [
                        'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=FPrACFQDiXCzyiG0WjWt'
                    ],
                    tileSize: 256,
                    maxzoom: 19
                },

                /* // DEM para el terreno
                terrainSource: {
                    type: 'raster-dem',
                    url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
                    tileSize: 256
                } */
            },

            layers: [
                {
                    id: 'osm-layer',
                    type: 'raster',
                    source: 'osm',
                    layout: { visibility: 'visible' }
                },
                {
                    id: 'satellite-layer',
                    type: 'raster',
                    source: 'satellite',
                    layout: { visibility: 'none' }
                }
            ],

            terrain: {
                source: 'terrainSource',
                exaggeration: 1
            }
        },
        maxPitch: 85
    });


    map.addControl(
        new maplibregl.NavigationControl({
            visualizePitch: true,
            showZoom: true,
            showCompass: true
        })
    );

    /* map.addControl(
        new maplibregl.TerrainControl({
            source: 'terrainSource',
            exaggeration: 1
        })
    ); */

    map.on('load', () => {

        const latInput = document.getElementById('lat-field');
        const lonInput = document.getElementById('lon-field');
        const moveBtn = document.getElementById('btn-map-mark');
        const notamInput = document.getElementById('notam-input')
        const analyzerButton = document.getElementById('btn-analyzer')

        latInput.value = map.getCenter().lat.toFixed(4);
        lonInput.value = map.getCenter().lng.toFixed(4);

        let currentMarker = null;

        analyzerButton.addEventListener('click', () => {
            const notamText = notamInput.value;

            const geometryType = analizarNotam(notamText)

            console.log(`Resultado del análisis: ${geometryType}`);
        })

        moveBtn.onclick = () => {
            const newLat = parseFloat(latInput.value);
            const newLon = parseFloat(lonInput.value);

            if (!isNaN(newLat) && !isNaN(newLon)) {
                map.flyTo({
                    center: [newLon, newLat],
                    essential: true,
                    zoom: 14 
                });

                if (currentMarker) {
                    currentMarker.remove();
                }

                currentMarker = new maplibregl.Marker() 
                    .setLngLat([newLon, newLat])
                    .addTo(map);
                        
            } else {
                alert("Por favor, introduce coordenadas válidas.");
            }

                
        };


        // ---- BOTÓN PARA ALTERNAR VISTA ----
        const btn = document.createElement("button");
        btn.innerText = "Cambiar vista";
        btn.style.position = "absolute";
        btn.style.top = "10px";
        btn.style.left = "10px";
        btn.style.padding = "8px 12px";
        btn.style.zIndex = 5;
        btn.style.cursor = "pointer";

        document.body.appendChild(btn);

        let isSatellite = false;

        btn.onclick = () => {
            isSatellite = !isSatellite;

            map.setLayoutProperty(
                'osm-layer',
                'visibility',
                isSatellite ? 'none' : 'visible'
            );

            map.setLayoutProperty(
                'satellite-layer',
                'visibility',
                isSatellite ? 'visible' : 'none'
            );
        };

    });
});
