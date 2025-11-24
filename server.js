// Importamos la librería Express
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));


let productos = [
    { id: 1, nombre: 'Monitor', precio: 150 },
    { id: 2, nombre: 'Teclado', precio: 45 }
];

// ----------------------------------------------------
// ➡️ Ruta POST: Para CREAR un nuevo recurso
// ----------------------------------------------------
app.post('/productos', (req, res) => {
    // 1. Obtener los datos del cuerpo (body) de la petición
    // Gracias al middleware express.json(), req.body es un objeto JavaScript
    const nuevoProducto = req.body;

    // 2. Validar que vengan los datos necesarios
    if (!nuevoProducto.nombre || !nuevoProducto.precio) {
        // Códigos de estado HTTP: 400 Bad Request indica datos faltantes
        return res.status(400).json({ mensaje: 'Error: El nombre y el precio son obligatorios.' });
    }

    // 3. Simular la adición a la base de datos
    const nuevoId = productos.length + 1;
    nuevoProducto.id = nuevoId;
    productos.push(nuevoProducto);

    // 4. Enviar la respuesta
    // Código de estado HTTP: 201 Created es la respuesta estándar para POST
    res.status(201).json({
        mensaje: 'Producto creado exitosamente',
        producto: nuevoProducto
    });
});

// ----------------------------------------------------
// ➡️ Ruta GET (de ejemplo) para ver los cambios
// ----------------------------------------------------
app.get('/productos', (req, res) => {
    res.json(productos);
});


// Iniciamos el servidor y lo ponemos a escuchar en el puerto 3000
app.listen(port, () => {
  console.log(`Servidor Express escuchando en http://localhost:${port}`);
});