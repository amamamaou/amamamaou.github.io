/*! Draw Shapes | v1.0.0 | (c) @amamamaou */
{
  const util = {
    getRndArray(array) { return array[Math.floor(Math.random() * array.length)]; },
    getRndNum(min, max) { return Math.random() * (max - min) + min; },
    getRGB(color) {
      const div = document.createElement('div');
      div.style.color = color;
      document.body.appendChild(div);

      const rgbColor = window.getComputedStyle(div).color;
      div.remove();

      const [, ...rgb] = rgbColor.match(/\((\d+),\s?(\d+),\s?(\d+)/) || [null, '0', '0', '0'];

      return rgb;
    },
  };

  class DrawShapes {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d');
      this.options = Object.assign({}, DrawShapes.defaluts, options);
      this.options.fill = util.getRGB(this.options.fill).join();
      this.shape = DrawShapes.shapes.hasOwnProperty(this.options.type)
        ? this.options.type : 'circle';
    }

    setShape(init = false) {
      const
        opt = this.options,
        radius = util.getRndNum(opt.minRadius, opt.maxRadius),
        {innerWidth, innerHeight} = window;

      let startY;

      if (init === true) {
        startY = innerHeight + radius * 2 - Math.random() * (innerHeight + 1);
      } else {
        startY = opt.reverse ? radius + innerHeight : -radius;
      }

      return {
        radius,
        shape: opt.type === 'all' ? util.getRndArray(DrawShapes.shapeList) : this.shape,
        speed: util.getRndNum(opt.minSpeed, opt.maxSpeed),
        x: Math.random() * (innerWidth - radius * 2 + 1) + radius,
        y: startY,
        opacity: util.getRndNum(opt.minOpacity, opt.maxOpacity),
        rotate: opt.rotate ? util.getRndNum(0, 1) : 0,
        direction: Math.random() * 2 | 0 ? 1 : -1,
      };
    }

    drawShape(x, y, r, type, rp) {
      const
        shape = DrawShapes.shapes[type],
        diff = rp * (360 / shape.length);
      let begin = true;

      for (const deg of shape) {
        const rad = (diff - deg) / 180 * Math.PI;
        this.context[begin ? 'moveTo' : 'lineTo'](r * Math.cos(rad) + x, r * Math.sin(rad) + y);
        begin = false;
      }
    }

    draw() {
      const
        shapeData = [],
        {
          canvas, context,
          options: {length, bg, fill, reverse, blur, rotate},
        } = this;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.backgroundColor = bg;

      // set shape data
      for (let i = 0; i < length; i++) { shapeData[i] = this.setShape(true); }

      const draw = () => {
        const {innerWidth, innerHeight} = window;

        context.clearRect(0, 0, innerWidth, innerHeight);

        for (let i = 0; i < length; i++) {
          const data = shapeData[i];
          let {x, y, radius, shape, speed, opacity, direction} = data;

          context.beginPath();

          if (DrawShapes.shapes.hasOwnProperty(shape)) {
            this.drawShape(x, y, radius, shape, data.rotate);
          } else {
            context.arc(x, y, radius, 0, Math.PI * 2, true);
          }

          context.closePath();

          if (rotate) {
            data.rotate += direction * speed / 200;

            if (data.rotate < 0) {
              data.rotate = 1;
            } else if (data.rotate >= 1) {
              data.rotate = 0;
            }
          }

          const fadeBase = radius * 4.5;

          if (reverse) {
            if (y - radius < fadeBase) {
              opacity = (1 + (y - radius - fadeBase) / fadeBase) * opacity;
            }

            data.y -= speed;

            if (data.y < radius) { Object.assign(data, this.setShape()); }
          } else {
            if (y + radius > innerHeight - fadeBase) {
              opacity = (1 - (y + radius - innerHeight + fadeBase) / fadeBase) * opacity;
            }

            data.y += speed;

            if (data.y > innerHeight - radius) { Object.assign(data, this.setShape()); }
          }

          if (blur) {
            const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

            gradient.addColorStop(0, `rgba(${fill},${opacity})`);
            gradient.addColorStop(1, `rgba(${fill},0)`);

            context.fillStyle = gradient;
          } else {
            context.fillStyle = `rgba(${fill},${opacity})`;
          }

          context.fill();
        }

        window.requestAnimationFrame(draw);
      };

      draw();

      let timer = null;
      window.addEventListener('resize', () => {
        window.cancelAnimationFrame(timer);
        timer = window.requestAnimationFrame(() => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        });
      });
    }
  }

  Object.assign(DrawShapes, {
    defaluts: {
      type: 'all',
      length: 100,
      minRadius: 5,
      maxRadius: 80,
      minOpacity: 0.3,
      maxOpacity: 0.8,
      minSpeed: 0.5,
      maxSpeed: 5,
      bg: '#51a0d1',
      fill: '#ebebff',
      reverse: false,
      blur: false,
      rotate: true,
    },
    shapes: {
      triangle: [0, 120, 240],
      square:   [0, 90, 180, 270],
      pentagon: [0, 72, 144, 216, 288],
      hexagon:  [0, 60, 120, 180, 240, 300],
      star:     [90, 234, 18, 162, 306],
    },
  });

  DrawShapes.shapeList = ['circle', ...Object.keys(DrawShapes.shapes)];

  // url params
  const
    bools = ['reverse', 'blur', 'rotate'],
    params = new URLSearchParams(location.search),
    options = {};

  // set params
  for (const [key, value] of params.entries()) {
    if (bools.includes(key)) {
      options[key] = value === 'true';
    } else if (!Number.isNaN(value - parseFloat(value))) {
      options[key] = parseFloat(value);
    } else {
      options[key] = value;
    }
  }

  const
    canvas = document.getElementById('mainCanvas'),
    ds = new DrawShapes(canvas, options);

  ds.draw();
}