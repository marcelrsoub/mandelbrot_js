import Plotly from 'plotly.js-dist';

// import {range} from 'mathjs';

const math = require('mathjs');

class MandelbrotCalculation {
    core(points=100,limits=[-2.5, 1, -1.75, 1.75], iteration_number=50,boundary=2){

        this.points = points;

        this.limits = limits;

        var x = math.range(limits[0],limits[1],(limits[1]-limits[0])/points).toArray();
        var y = math.range(limits[2],limits[3],(limits[3]-limits[2])/points).toArray();

        var mandelbrot = math.zeros(points,points).toArray();

        for (let i = 0; i < x.length; i++) {
            for (let j = 0; j < y.length; j++) {
                var x_pixel = x[i];
                var y_pixel = y[j];

                var c = math.complex(x_pixel,y_pixel);
                var z = c;

                for (let iteration = 1; iteration < iteration_number; iteration++) {
                    z=math.add(math.pow(z,2),c);
                    if (math.abs(z)>boundary) {
                        mandelbrot[i][j] = iteration;
                        break;
                    }
                }
                
            }

        }

        mandelbrot=math.matrix(mandelbrot);
        mandelbrot=math.transpose(mandelbrot).toArray();

        this.mandelbrot=mandelbrot;
        this.x=x;
        this.y=y;

    }
}

// var mandelbrot = [[0,2,3], [20, 1, 60], [30, 60, 1]];

var Mandel = new MandelbrotCalculation();
Mandel.core(100);

// PLOTLY
var data = [
    {
      z: Mandel.mandelbrot,
      x:Mandel.x,
      y:Mandel.y,
      type: 'heatmap',
    //   colorscale:'hot',
      showlegend:false,
      colorbar: {
          thickness:0,
          visible:false
      }
    }
  ];

var layout = 
    {
        autosize:false,
        width: 1200,
        height: 1200
    };
  
  Plotly.newPlot('myChart', data, layout,{displayModeBar: false});