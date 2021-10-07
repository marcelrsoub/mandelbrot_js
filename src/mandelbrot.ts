import { add, Complex, complex, index, MathType, matrix, multiply, pow, range, sqrt, transpose, zeros } from "mathjs";

export default class MandelbrotCalculation {
  points: number;
  limits: number[];
  mandelbrot: any;
  max: number;
  applyPixel:(i:number,j:number,intensity:number)=>void | undefined

  constructor(points) {
    this.points = points;
    this.max = 0;
  }
  core(limits = [-2.5, 1, -1.75, 1.75], iteration_number = 100, boundary = 2) {
    const startTime = performance.now()
    this.limits = limits;

    const x= range(
      limits[0],
      limits[1],
      (limits[1] - limits[0]) / this.points
    ).toArray();
    const y = range(
      limits[2],
      limits[3],
      (limits[3] - limits[2]) / this.points
    ).toArray();

    let mandelbrot = matrix(zeros(this.points, this.points)).toArray();

    for (let i = 0; i < x.length; i++) {
      for (let j = 0; j < y.length; j++) {
        const x_pixel = x[i] as number;
        const y_pixel = y[j] as number;

        let c = complex(x_pixel, y_pixel);
        let z = c;
        console.clear()
        console.log("x=",i)
        console.log("y=", j)

        for (let iteration = 0; iteration < iteration_number; iteration++) {
          z = <Complex>add(pow(z,2), c);
          const boundaryCheck = sqrt(z.im ** 2 + z.re ** 2);
          if ( boundaryCheck >= boundary) {
            if (iteration > this.max) {
              this.max = iteration;
            }
            mandelbrot[i][j] = iteration;
            if (this.applyPixel) {
              this.applyPixel(i, j, iteration/iteration_number);
            }
            break;
          }
        }
      }
    }

    // mandelbrot = matrix(mandelbrot);
    // mandelbrot = transpose(mandelbrot);
    mandelbrot = multiply(mandelbrot, 1 / this.max); //normalize the matrix
    
    const endTime = performance.now()
    console.log(`Mandelbrot calculated in ${Math.round((endTime-startTime)/1000 * 100) / 100} seconds`);
    

    this.mandelbrot = mandelbrot;
  }
}

// const Mandel = new MandelbrotCalculation();
// Mandel.core(100);
