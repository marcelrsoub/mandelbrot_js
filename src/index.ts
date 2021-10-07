// const title = document.getElementById("title");
// title.innerHTML = "Damn";
import "./assets/main.css";

import MandelbrotCalculation from "./mandelbrot";
const points = 100;
const canvas = <HTMLCanvasElement>document.getElementById("canvas");
canvas.width = points;
canvas.height = points;
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const ctx = canvas.getContext("2d");

// canvas.style.background = "cyan";

// const imageData = ctx.createImageData(canvasWidth, canvasHeight);
// console.log(imageData);
// const data = imageData.data;

const Mandelbrot = new MandelbrotCalculation(points);
Mandelbrot.applyPixel = (i, j, intensity) => {
  ctx.fillStyle = `rgba(255,255,255,${intensity*10})`
            ctx.fillRect(i, j, 1, 1)
}
Mandelbrot.core();
const mandel_matrix = Mandelbrot.mandelbrot;

console.log("Mandelbrot:", mandel_matrix);

const multiplier = 255;


// for (let y = 0; y < points; y++) {
//   for (let x = 0; x < points; x++) {
//     const index = (y * points + x) * 4;
//     const red = index;
//     const green = index + 1;
//     const blue = index + 2;
//     const alpha = index + 3;

//     data[red] = mandel_matrix[x][y]*multiplier;
//     data[green] = mandel_matrix[x][y]*multiplier;
//     data[blue] = mandel_matrix[x][y]*multiplier;
//     data[alpha] = 255;
//   }
// }
// for (let y = 0; y < canvasHeight; y++) {
//   for (let x = 0; x < canvasWidth; x++) {
//     const index = (y * canvasWidth + x) * 4;
//     const red = index;
//     const green = index + 1;
//     const blue = index + 2;
//     const alpha = index + 3;

//     data[red] = 0;
//     data[green] = 255;
//     data[blue] = 0;
//     data[alpha] = 255;
//   }
// }

// ctx.putImageData(imageData, 0, 0);
