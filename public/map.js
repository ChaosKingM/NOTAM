// Esperamos a que la estructura HTML (el DOM) esté completamente cargada
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado. Inicializando mapa...");

    // 1. Inicializar el mapa
    // Usamos 'maplibregl' porque así se define la librería cargada por unpkg.
    const map = new maplibregl.Map({
        container: 'map', // Usa el ID 'map' definido en tu HTML
        style: 'https://demotiles.maplibre.org/style.json', // Estilo
        center: [-3.703790, 40.416775], // Madrid, por ejemplo
        zoom: 5,
        maplibreLogo: true
    });

    // 2. Agregar lógica adicional (ejemplo: un marcador)
    map.on('load', function() {
        console.log("Mapa cargado. Agregando marcador.");
        
        // Coordenadas para el marcador
        const coordenadas = [-3.703790, 40.416775]; 

        // Crear y añadir el marcador
        new maplibregl.Marker()
            .setLngLat(coordenadas)
            .setPopup(new maplibregl.Popup({ offset: 25 })
                .setHTML("<h3>¡Mi Mapa Funciona!</h3>"))
            .addTo(map);

        // Opcional: Agregar controles de navegación
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
    });
});