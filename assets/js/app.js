var SC = {};

Class(SC, 'App').inherits(Widget)({
    prototype : {
        init : function(config) {
            var app = this;
            Widget.prototype.init.call(this, config);

            this._snap = Snap(this.map.width(), this.map.height());
            $(this._snap.node).appendTo(this.map).css({
                position: 'absolute',
                top: 0,
                left : 0
            });

            this.polygonDraw = new PolygonDraw({
                map : this.map,
                _snap : this._snap
            });
            this.polygonDraw.bind('path:close', function() {
                // alert("Select home");
                // app.map.on('click', function(ev) {
                    var ev = {
                        clientX : 374,
                        clientY : 130
                    }
                    app._snap.circle(ev.clientX, ev.clientY, 10).attr({
                        fill : '#5559B1',
                        stroke : '#242323',
                        strokeWidth : 2
                    });
                    // var legDistance = prompt("Distance between legs:", 50);
                    // var flightDirection = prompt("Direction: (0 - 180)", 45);
                    var legDistance = 40;
                    var flightDirection = 135;

                    app.calculateFlight({
                        polygon : app.polygonDraw.getCoords(),
                        home : [ev.clientX, ev.clientY],
                        legDistance : legDistance,
                        flightDirection : flightDirection
                    })
                // });
            });
            // For quick dev
            this.polygonDraw._pathCoords = [
                [79,200],
                [476,105],
                [610,300],
                [435,467],
                [80,404],
                [80,403]
            ];
            this.polygonDraw._closed = true;
            this.polygonDraw._drawPath();
            this.polygonDraw.map.off();
            this.polygonDraw.dispatch('path:close');
        },

        calculateFlight : function(flightParams) {
            // Scale can be passed as well and applied to the coords before the
            // calculations. Assume 1px = 1m for now
            var app = this;
            var homeX = flightParams.home[0],
                homeY = flightParams.home[1],
                legDistance = flightParams.legDistance,
                flightDirection = flightParams.flightDirection;

            console.log(flightParams);

            // Adjust angle to work on a geom where 0 deg is right, and angle goes
            // from x ayis clockwise
            flightDirection = flightDirection - 90;

            var flightAngleRad = (flightDirection * (Math.PI / 180));

            var flightPathSlope = Math.tan(flightAngleRad);
            var legsSlope = -1 / flightPathSlope;

            var bbox = this.polygonDraw._pathSVG.getBBox(this.polygonDraw._pathSVG.attr('path'));
            this._snap.rect(bbox.x, bbox.y, bbox.w, bbox.h).attr({
                fill : 'none',
                strokeWidth : 2,
                stroke : '#ff0000'
            });

            var y0 = (flightPathSlope * (bbox.x - homeX)) + homeY;
            var y1 = (flightPathSlope * (bbox.x + bbox.w - homeX)) + homeY;
            console.log("M" + bbox.x + ',' + y0 + 'L' + (bbox.x + bbox.w) + ',' + y1);
            p = this._snap.path("M" + bbox.x + ',' + y0 + 'L' + (bbox.x + bbox.w) + ',' + y1).attr({
                stroke: '#FFFF00',
                strokeWidth: 3
            });
            console.log(p)

            // From home, and knowing the equation of the flight path line, sweep
            // both ends until no intersections are found. These will be the lines
            var step = 0;
            var point = [homeX, homeY];
            var y0 = (legsSlope * (bbox.x - homeX)) + homeY;
            var y1 = (legsSlope * (bbox.x + bbox.w - homeX)) + homeY;
            var legParallelX, legParallelY;


            console.log("~~~~~~~~~");
            // Get the line that intersects the polygon at `step` times the
            // leg distance (sign indicates direction)
            var getIntersection = function(legStep) {
                // console.log("INTER: ", intersection);

                legParallelX = homeX + (Math.cos(flightAngleRad) * legDistance * legStep);
                legParallelY = homeY + (Math.sin(flightAngleRad) * legDistance * legStep);

                y0 = (legsSlope * (bbox.x - legParallelX)) + legParallelY;
                y1 = (legsSlope * (bbox.x + bbox.w - legParallelX)) + legParallelY;
                app._snap.circle(legParallelX, legParallelY, 4);

                intersection = Snap.path.intersection(
                    app.polygonDraw._pathSVG.attr('path'),
                    'M' + bbox.x + ',' + y0 + 'L' + (bbox.x + bbox.w) + ',' + y1
                );
                console.log(intersection);
                return intersection;
            }

            var drawIntersection = function(intersection) {
                app._snap.path(
                    "M" + intersection[0].x + ',' + intersection[0].y +
                    'L' + intersection[1].x + ',' + intersection[1].y
                ).attr({
                    stroke: '#0f0',
                    strokeWidth: 3
                });
            }

            var step = 0;
            var intersection = getIntersection(step);
            var positivePoints = [];
            while(intersection.length >= 2) {
                step = step + 1;
                drawIntersection(intersection);
                positivePoints.push([intersection[0].x, intersection[0].y]);
                positivePoints.push([intersection[1].x, intersection[1].y]);
                intersection = getIntersection(step);
            }

            var negativePoints = [];
            var step = -1;
            intersection = getIntersection(step)
            while(intersection.length >= 2) {
                step = step - 1;
                drawIntersection(intersection);
                negativePoints.push([intersection[0].x, intersection[0].y]);
                negativePoints.push([intersection[1].x, intersection[1].y]);
                intersection = getIntersection(step);
            }


        }
    }
});

$(function() {
    window.app = new SC.App({
        map : $('.map')
    });
});

var f = function(angle) {
    var a = angle - 90;
    a = 360 - a;
    a = (a + 360) % 360;
    return a;
}

