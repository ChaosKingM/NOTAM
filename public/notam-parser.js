
/* console.log("probando")

const readline = require('node:readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(`Insert NOTAM: `, notam => {
  console.log(analizarNotam(notam))
  rl.close();
}); */

function analizarNotam(textoNotam) {
  const texto = textoNotam.toUpperCase();

  const coords = texto.match(/\d{6}[NS]\s*\d{7}[EW]/g);

  console.log("COORDS ENCONTRADAS:", coords);

  if (!coords) return "UNKNOWN";
  if (coords.length === 1) return "POINT";
  if (coords.length === 2) return "LINE";
  if (coords.length === 3) return "TRIANGLE";
  if (coords.length === 4) return "SQUARE";
  if (coords.length > 4) return "POLYGON";
}
