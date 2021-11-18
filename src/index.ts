// const title = document.getElementById("title");
// title.innerHTML = "Damn";
import "./assets/main.css";

import MandelbrotCalculation from "./mandelbrot";

class Model {
  mandelbrot: MandelbrotCalculation;
  observers: any[];
  mask: number[];
  points: number;

  constructor(points) {
    this.mandelbrot = new MandelbrotCalculation(points);
    this.points = points;
    this.observers = [];
    this.mask = this.mandelbrot.core();
  }

  update(mouseSubject) {
    const delta_mandel =
      (this.mandelbrot.x_high - this.mandelbrot.x_low) / this.points;
    const dx: number = mouseSubject.x * delta_mandel;
    const dy = mouseSubject.y * delta_mandel;
    console.log("mousemove X:", mouseSubject.x);
    console.log("mousemove Y:", mouseSubject.y);
    console.log("dx:", dx);
    console.log("dy:", dy);
    this.move(dx, dy);
  }

  move(dx, dy) {
    this.mandelbrot.x_low += dx;
    this.mandelbrot.x_high += dx;
    this.mandelbrot.y_high += dy;
    this.mandelbrot.y_low += dy;
    this.mask = this.mandelbrot.core();
    this.notifyObservers();
  }

  addObserver(observer) {
    this.observers.push(observer);
  }

  notifyObservers() {
    for (let o of this.observers) {
      o.update(this);
    }
  }
}

class CanvasObserver {
  canvasEl: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageData: any;
  data: any;
  points: number;

  constructor(canvas: HTMLCanvasElement, points) {
    this.points = points;
    canvas.width = points;
    canvas.height = points;
    this.canvasEl = canvas;
    this.ctx = canvas.getContext("2d");
    this.imageData = this.ctx.createImageData(canvas.width, canvas.height);

    /** data has 4 values for each pixel [R,G,B,A], so length is equal to 4 times the number of pixels */
    this.data = this.imageData.data;
    if (this.data.length !== this.points ** 2 * 4) {
      throw "ERROR:" + this.data.length + "!==" + this.points ** 2 * 4;
    }
  }

  update(model) {
    const data = this.imageData.data;
    if (this.data.length !== model.mask.length * 4) {
      throw "ERROR:" + this.data.length + "!==" + model.mask.length * 4;
    }
    model.mask.forEach((pixel: number, index: number) => {
      const index_calc = index * 4;
      const red = index_calc;
      const green = index_calc + 1;
      const blue = index_calc + 2;
      const alpha = index_calc + 3;
      data[red] = pixel * 255;
      data[green] = pixel * 255;
      data[blue] = pixel * 255;
      data[alpha] = pixel * 255;
    });
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  paintWhite() {
    const data = this.imageData.data;
    Array(this.points ** 2)
      .fill(0)
      .map((pixel: number, index: number) => {
        const index_calc = index * 4;
        const red = index_calc;
        const green = index_calc + 1;
        const blue = index_calc + 2;
        const alpha = index_calc + 3;

        data[red] = 255;
        data[green] = 255;
        data[blue] = 255;
        data[alpha] = 2555;
      });

    this.ctx.putImageData(this.imageData, 0, 0);
    console.log("canvas painted white");
  }
}

class MouseSubject {
  canvas: HTMLCanvasElement;
  mousedown: boolean;
  observers: any[];
  x: number;
  y: number;

  constructor(canvas) {
    this.canvas = canvas;

    this.observers = [];
    this.mousedown = false;
    canvas.addEventListener("mousedown", () => {
      this.mousedown = true;
      console.log("mousedown");
    });
    canvas.addEventListener("mouseup", () => {
      this.mousedown = false;
      console.log("mouseup");
    });
    canvas.addEventListener("mousemove", (e: MouseEvent) => {
      const screenLimit = this.canvas.width;
      if (this.mousedown) {
        this.x = (2 * e.movementX) / screenLimit - 1;
        this.y = (2 * e.movementY) / screenLimit - 1;
        console.log(this.x);

        this.notifyObservers();
      }
    });
  }

  addObserver(observer) {
    this.observers.push(observer);
  }

  notifyObservers() {
    for (let o of this.observers) {
      o.update(this);
    }
  }
}

const points = 100;
const myModel = new Model(points);

const canvas = <HTMLCanvasElement>document.getElementById("canvas");
const canvasObs = new CanvasObserver(canvas, points);
// canvasObs.paintWhite();
const mouseSub = new MouseSubject(canvas);
mouseSub.addObserver(myModel);

myModel.addObserver(canvasObs);
myModel.notifyObservers();

// canvas.addEventListener('mousedown', ()=>{console.log('mousedown')})
// canvas.addEventListener('mousemove', (e) => {
//   console.log('mousemove X:', e.x)
//   console.log('mousemove Y:', e.y)
// })
