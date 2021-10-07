// const title = document.getElementById("title");
// title.innerHTML = "Damn";
import "./assets/main.css";

const canvas = document.getElementById("canvas");
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const ctx = canvas.getContext("2d");
// canvas.style.background = "cyan";

const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
const data = imageData.data;

for (const y = 0; y < canvasHeight; ++y) {
  for (const x = 0; x < canvasWidth; ++x) {
    const index = (y * canvasWidth + x) * 4;
    const red = index;
    const green = index + 1;
    const blue = index + 2;

    imageData.data[red] = 0;
    imageData.data[green] = 255;
    imageData.data[blue] = 0;
  }
}

ctx.drawImage(imageData.data, 0, 0);
