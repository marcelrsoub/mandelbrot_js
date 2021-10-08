// const title = document.getElementById("title");
// title.innerHTML = "Damn";
import "./assets/main.css";

import MandelbrotCalculation from "./mandelbrot";
const points = 500;
const canvas = <HTMLCanvasElement>document.getElementById("canvas");
canvas.width = points;
canvas.height = points;
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const ctx = canvas.getContext("2d");

// canvas.style.background = "cyan";

const imageData = ctx.createImageData(canvasWidth, canvasHeight);
const data = imageData.data;

const multiplier = 255;

const Mandelbrot = new MandelbrotCalculation(points);
Mandelbrot.applyPixel = (i, j, intensity,x_coordinates,y_coordinates) => {
  const index = (j * points + i) * 4;
    const red = index;
    const green = index + 1;
    const blue = index + 2;
    const alpha = index + 3;

    data[red] = Math.sqrt(x_coordinates**2+y_coordinates**2)*multiplier;
    data[green] = Math.sqrt((x_coordinates+1)**2+(y_coordinates)**2)*multiplier;
    data[blue] = Math.sqrt((x_coordinates*0.5)**2+(y_coordinates*0.5)**2)*multiplier;
    data[alpha] = intensity*multiplier;
  // ctx.fillStyle = `rgba(255,255,255,${intensity * 10})`;
  // ctx.fillRect(i, j, 1, 1)
}
Mandelbrot.core();
ctx.putImageData(imageData, 0, 0);



