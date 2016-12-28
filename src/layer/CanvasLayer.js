/**
 * CanvasLayer provides some interface methods for canvas context operations. <br>
 * You can use it directly, but can't ser/dser a CanvasLayer with json in this way. <br>
 * It is more recommended to extend it with a subclass and implement canvas paintings inside the subclass.
 * @classdesc
 * A layer with a HTML5 2D canvas context.
 * @example
 *  var layer = new maptalks.CanvasLayer('canvas');
 *
 *  layer.prepareToDraw = function (context) {
 *      var size = map.getSize();
 *      return [size.width, size.height]
 *  };
 *
 *  layer.draw = function (context, width, height) {
 *      context.fillStyle = "#f00";
 *      context.fillRect(0, 0, w, h);
 *  };
 *  layer.addTo(map);
 * @class
 * @category layer
 * @extends {maptalks.Layer}
 * @param {String|Number} id - layer's id
 * @param {Object} options - options defined in [options]{@link maptalks.CanvasLayer#options}
 */
maptalks.CanvasLayer = maptalks.Layer.extend(/** @lends maptalks.CanvasLayer.prototype */{

    options: {
        'doubleBuffer'  : false,
        'animation'     : false,
        'fps'           : 70
    },

    /**
     * An optional interface function called only once before the first draw, useful for preparing your canvas operations.
     * @param  {CanvasRenderingContext2D } context - CanvasRenderingContext2D of the layer canvas.
     * @return {Object[]} objects that will be passed to function draw(context, ..) as parameters.
     */
    prepareToDraw: function () {},

    /**
     * The required interface function to draw things on the layer canvas.
     * @param  {CanvasRenderingContext2D} context - CanvasRenderingContext2D of the layer canvas.
     * @param  {*} params.. - parameters returned by function prepareToDraw(context).
     */
    draw: function () {},

    play: function () {
        if (this._getRenderer()) {
            this._getRenderer().startAnim();
        }
        return this;
    },

    pause: function () {
        if (this._getRenderer()) {
            this._getRenderer().pauseAnim();
        }
        return this;
    },

    isPlaying : function () {
        if (this._getRenderer()) {
            return this._getRenderer().isPlaying();
        }
        return false;
    },

    clearCanvas: function () {
        if (this._getRenderer()) {
            this._getRenderer().clearCanvas();
        }
        return this;
    },

    /**
     * Ask the map to redraw the layer canvas without firing any event.
     * @return {maptalks.CanvasLayer} this
     */
    requestMapToRender: function () {
        if (this._getRenderer()) {
            this._getRenderer().requestMapToRender();
        }
        return this;
    },

    /**
     * Ask the map to redraw the layer canvas and fire layerload event
     * @return {maptalks.CanvasLayer} this
     */
    completeRender: function () {
        if (this._getRenderer()) {
            this._getRenderer().completeRender();
        }
        return this;
    },

    onCanvasCreate: function () {
        return this;
    },

    /**
     * The event callback for map's zoomstart event.
     * @param  {Object} param - event parameter
     */
    onZoomStart: function () {},

    /**
     * The event callback for map's zoomend event.
     * @param  {Object} param - event parameter
     */
    onZoomEnd: function () {},

    /**
     * The event callback for map's movestart event.
     * @param  {Object} param - event parameter
     */
    onMoveStart: function () {},

    /**
     * The event callback for map's moveend event.
     * @param  {Object} param - event parameter
     */
    onMoveEnd: function () {},

    /**
     * The event callback for map's resize event.
     * @param  {Object} param - event parameter
     */
    onResize: function () {},

    doubleBuffer: function (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return this;
    }

});

maptalks.CanvasLayer.registerRenderer('canvas', maptalks.renderer.Canvas.extend({

    onCanvasCreate: function () {
        if (this.canvas && this.layer.options['doubleBuffer']) {
            var map = this.getMap();
            this.buffer = maptalks.Canvas.createCanvas(this.canvas.width, this.canvas.height, map.CanvasClass);
        }
    },

    draw: function () {
        if (!this._predrawed) {
            this._drawContext = this.layer.prepareToDraw(this.context);
            if (!this._drawContext) {
                this._drawContext = [];
            }
            if (!Array.isArray(this._drawContext)) {
                this._drawContext = [this._drawContext];
            }
            this._predrawed = true;
        }
        this.prepareCanvas();
        this._drawLayer();
    },

    getCanvasImage: function () {
        var canvasImg = maptalks.renderer.Canvas.prototype.getCanvasImage.apply(this, arguments);
        if (canvasImg && canvasImg.image && this.layer.options['doubleBuffer']) {
            var canvas = canvasImg.image;
            if (this.buffer.width !== canvas.width || this.buffer.height !== canvas.height) {
                this.buffer.width = canvas.width;
                this.buffer.height = canvas.height;
            }
            var bufferContext = this.buffer.getContext('2d');
            this.layer.doubleBuffer(bufferContext, this.context);
            bufferContext.drawImage(canvas, 0, 0);
            canvasImg.image = this.buffer;
        }
        return canvasImg;
    },

    startAnim: function () {
        this._animTime = maptalks.Util.now();
        this._paused = false;
        this._play();
    },

    pauseAnim: function () {
        this._pause();
        this._paused = true;
        delete this._animTime;
    },

    isPlaying : function () {
        return !maptalks.Util.isNil(this._animFrame);
    },

    hide: function () {
        this._pause();
        return maptalks.renderer.Canvas.prototype.hide.call(this);
    },

    show: function () {
        return maptalks.renderer.Canvas.prototype.show.call(this);
    },

    remove: function () {
        this._pause();
        delete this._drawContext;
        return maptalks.renderer.Canvas.prototype.remove.call(this);
    },

    onZoomStart: function (param) {
        this._pause();
        this.layer.onZoomStart(param);
        maptalks.renderer.Canvas.prototype.onZoomStart.call(this);
    },

    onZoomEnd: function (param) {
        this.layer.onZoomEnd(param);
        maptalks.renderer.Canvas.prototype.onZoomEnd.call(this);
    },

    onMoveStart: function (param) {
        this._pause();
        this.layer.onMoveStart(param);
        maptalks.renderer.Canvas.prototype.onMoveStart.call(this);
    },

    onMoveEnd: function (param) {
        this.layer.onMoveEnd(param);
        maptalks.renderer.Canvas.prototype.onMoveEnd.call(this);
    },

    onResize: function (param) {
        this.layer.onResize(param);
        maptalks.renderer.Canvas.prototype.onResize.call(this);
    },

    _drawLayer: function () {
        var args = [this.context];
        if (this._animTime) {
            args.push(maptalks.Util.now() - this._animTime);
        }
        args.push.apply(args, this._drawContext);
        this.layer.draw.apply(this.layer, args);
        this.completeRender();
        this._play();
    },

    _pause : function () {
        if (this._animFrame) {
            maptalks.Util.cancelAnimFrame(this._animFrame);
            delete this._animFrame;
        }
        if (this._fpsFrame) {
            clearTimeout(this._fpsFrame);
            delete this._fpsFrame;
        }
    },

    _play : function () {
        if (this._paused || !this.layer || !this.layer.options['animation']) {
            return;
        }
        if (!this._animTime) {
            this._animTime = maptalks.Util.now();
        }
        var frameFn = maptalks.Util.bind(this._drawLayer, this);
        this._pause();
        var fps = this.layer.options['fps'];
        if (fps >= 1000 / 16) {
            this._animFrame = maptalks.Util.requestAnimFrame(frameFn);
        } else {
            this._fpsFrame = setTimeout(function () {
                if (maptalks.Browser.ie9) {
                    // ie9 doesn't support RAF
                    frameFn();
                    this._animFrame = 1;
                } else {
                    this._animFrame = maptalks.Util.requestAnimFrame(frameFn);
                }
            }.bind(this), 1000 / this.layer.options['fps']);
        }
    }
}));
