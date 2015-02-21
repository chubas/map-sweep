Class('PolygonDraw').inherits(Widget)({

    prototype : {
        init : function(config) {
            Widget.prototype.init.call(this, config);

            this.bindEvents();
        },

        getCoords : function() {
            return this._pathCoords;
        },

        bindEvents : function() {
            var polygon = this;
            this.map.on('click', function(ev) {
                polygon._drawMarker(ev.clientX, ev.clientY);
                if(polygon._pathSVG) {
                    polygon._pathCoords.push([ev.clientX, ev.clientY]);
                } else {
                    polygon._pathCoords = [[ev.clientX, ev.clientY]];
                }
                polygon._drawPath();
            });
            this.map.on('dblclick', function(ev) {
                polygon._drawMarker(ev.clientX, ev.clientY);
                if(polygon._pathSVG) {
                    polygon._closed = true;
                    polygon.map.off('click');
                    polygon.map.off('dblclick');
                    polygon._drawPath();
                    polygon.dispatch('path:close');
                }
            });
            // Prevent select on dblclick for image
            this.map.add(this.map.find('img')).on('selectstart', function(ev) {
                return false;
            })
        },

        _drawMarker : function(x, y) {
            this._snap.circle(x, y, 5).attr({
                fill : '#DDE66E',
                strokeWidth : 1,
                stroke : '#000'
            });
        },

        _drawPath : function() {
            if(!this._pathCoords) { return; }
            var path = 'M' + this._pathCoords[0][0] + ',' + this._pathCoords[0][1];
            for(var i = 1; i < this._pathCoords.length; i++) {
                path = path + 'L' + this._pathCoords[i][0] + ',' + this._pathCoords[i][1]
            }
            if(!this._pathSVG) {
                this._pathSVG = this._snap.path(path).attr({
                    fill : '#BD302C',
                    strokeWidth : 3,
                    stroke : '#000',
                    opacity : 0.5
                });
            }
            if(this._closed) {
                path = path + 'Z';
            }
            this._pathSVG.attr({
                path : path
            });
        }

    }

});