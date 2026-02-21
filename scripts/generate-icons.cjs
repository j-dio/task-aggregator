const fs = require("fs");

function createSVG(size) {
  return [
    "<svg xmlns='http://www.w3.org/2000/svg'",
    " width='" + size + "' height='" + size + "'",
    " viewBox='0 0 512 512'>",
    "<rect width='512' height='512' rx='64' fill='#18181b'/>",
    "<text x='256' y='340' text-anchor='middle'",
    " font-family='system-ui,sans-serif'",
    " font-size='280' font-weight='700' fill='#fafafa'>T</text>",
    "</svg>",
  ].join("");
}

fs.writeFileSync("public/icons/icon-192.svg", createSVG(192));
fs.writeFileSync("public/icons/icon-512.svg", createSVG(512));
console.log("Created placeholder SVG icons in public/icons/");
