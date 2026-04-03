// Imports
const path = require('path');
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// We start the server
app.listen(port, () => {
  console.log(`Express server listening in http://localhost:${port}`);
});