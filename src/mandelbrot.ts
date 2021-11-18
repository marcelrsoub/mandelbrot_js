import { add, Complex, complex, pow, range, sqrt } from "mathjs";

export default class MandelbrotCalculation {
  points: number;
  limits: number[];
  canvas: number[];
  max: number;
  x_low:number;
x_high:number;
y_low:number;
y_high:number;

  
  applyPixel:(i:number,j:number,intensity:number,x_coordinates:number,y_coordinates:number)=>void | undefined

  constructor(points) {
    this.points = points;
    this.max = 0;
    this.x_low = -2.5
    this.x_high = 1
    this.y_low = -1.75
    this.y_high = 1.75
  }
  core( iteration_number = 20, boundary = 2) {
    const mask = Array(this.points ** 2).fill(0)
    
    const startTime = performance.now()

    const x= range(
      this.x_low,
      this.x_high,
      (this.x_high - this.x_low) / this.points
    ).toArray();
    const y = range(
      this.y_low,
      this.y_high,
      (this.y_high - this.y_low) / this.points
    ).toArray();


    for (let i = 0; i < x.length; i++) {
      for (let j = 0; j < y.length; j++) {
        const index = (j * this.points + i);

        const x_pixel_value = x[i] as number;
        const y_pixel_value = y[j] as number;

        let c = complex(x_pixel_value, y_pixel_value);
        let z = c;
        
        for (let iteration = 0; iteration <= iteration_number; iteration++) {
          z = <Complex>add(pow(z,2), c);
          const boundaryCheck = sqrt(z.im ** 2 + z.re ** 2);
          if (boundaryCheck >= boundary) {
            if (iteration > this.max) {
              this.max = iteration;
            }
            mask[index] = iteration/iteration_number
            break;
          
          } else if (boundaryCheck <= boundary && iteration == iteration_number) {
            mask[index]=1
            //PAINTING INSIDE OF MANDELBROT SET
            if (this.applyPixel) {
              this.applyPixel(i, j, 1,x_pixel_value,y_pixel_value);
            }
          }
        }
      }
    }
    
    const endTime = performance.now()
    console.log(`Mandelbrot calculated in ${Math.round((endTime - startTime) / 1000 * 100) / 100} seconds`);
    return mask;
  }
}
