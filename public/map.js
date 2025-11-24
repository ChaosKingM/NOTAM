document.addEventListener('DOMContentLoaded', function() {
    const map = new maplibregl.Map({
        container: 'map',
        zoom: 12,
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
