var SC = {};

var _debug = false;

Class(SC, 'App').inherits(Widget)({
    prototype : {
        home : null, // Coords [x, y] of the selected path
        polygonPoints : null, // Points of the enclosing polygon
        flightDirection : null, // Angle of the flight path, 0 is north and 180 is south
        legDistance : null, // Distance between 'legs', or perpendicular paths to the flight path
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
            if(_debug) {
                this.map.on('mouseover, mousemove', function(ev) {
                    $('.x').text(ev.clientX);
                    $('.y').text(ev.clientY);
                });
            }
            this.polygonDraw.bind('path:close', function() {
                app.polygonPoints = app.polygonDraw.getCoords();

                alert("Select home point");
                app.map.css({cursor : 'crosshair'});
                app.map.on('click', function(ev) {
                    app.map.css({cursor : 'default'});
                    app.home = [ev.clientX, ev.clientY];
                    app._snap.circle(ev.clientX, ev.clientY, 10).attr({
                        fill : '#5559B1',
                        stroke : '#242323',
                        strokeWidth : 2
                    });
                    app.legDistance = prompt("Distance between legs:", 50);
                    app.flightDirection = prompt("Direction: (0 - 180)", 45);
                    app.calculateFlight();

                    // app.calculateFlight({
                    //     polygon : app.polygonDraw.getCoords(),
                    //     home : [ev.clientX, ev.clientY],
                    //     legDistance : legDistance,
                    //     flightDirection : flightDirection
                    // });
                });
            });
        },

        calculateFlight : function() {
            // Scale can be passed as well and applied to the coords before the
            // calculations. Assume 1px = 1m for now
            var app = this;
            var homeX = this.home[0],
                homeY = this.home[1],
                legDistance = this.legDistance,
                flightDirection = this.flightDirection;

            // Adjust angle to work on a geom where 0 deg is right, and angle goes
            // from x ayis clockwise
            flightDirection = flightDirection - 90;

            var flightAngleRad = (flightDirection * (Math.PI / 180));

            var flightPathSlope = Math.tan(flightAngleRad);
            var legsSlope = -1 / flightPathSlope;

            this.legsSlope = legsSlope;
            var bbox = this.getBBox();

            if(_debug) {
                this._snap.rect(bbox.x, bbox.y, bbox.w, bbox.h).attr({
                    fill : 'none',
                    strokeWidth : 2,
                    stroke : '#ff0000'
                });
            }

            if(_debug) {
                var fp0 = (flightPathSlope * (bbox.x - homeX)) + homeY;
                var fp1 = (flightPathSlope * (bbox.x + bbox.w - homeX)) + homeY;

                this._snap.path("M" + bbox.x + ',' + fp0 + 'L' + (bbox.x + bbox.w) + ',' + fp1).attr({
                    stroke: '#FFFF00',
                    strokeWidth: 3
                });
            }

            // From home, and knowing the equation of the flight path line, sweep
            // both ends until no intersections are found.
            var step = 0;
            var point = [homeX, homeY];
            var y0 = (legsSlope * (bbox.x - homeX)) + homeY;
            var y1 = (legsSlope * (bbox.x + bbox.w - homeX)) + homeY;
            var legParallelX, legParallelY;

            // Get the line that intersects the polygon at `step` times the
            // leg distance (sign indicates direction)
            var getIntersection = function(legStep) {
                // console.log("INTER: ", intersection);

                legParallelX = homeX + (Math.cos(flightAngleRad) * legDistance * legStep);
                legParallelY = homeY + (Math.sin(flightAngleRad) * legDistance * legStep);

                y0 = (legsSlope * (bbox.x - legParallelX)) + legParallelY;
                y1 = (legsSlope * (bbox.x + bbox.w - legParallelX)) + legParallelY;
                if(_debug) { app._snap.circle(legParallelX, legParallelY, 7); }

                intersection = Snap.path.intersection(
                    app.polygonDraw._pathSVG.attr('path'),
                    'M' + bbox.x + ',' + y0 + 'L' + (bbox.x + bbox.w) + ',' + y1
                );
                // console.log("Intersection at ", legStep, ": ")
                // console.log(intersection);
                return intersection;
            }

            // Sweep the flight path line looking for intersections in both ways
            // First on the positive direction
            var step = 0;
            var intersection = getIntersection(step);
            var positivePoints = [];
            while(intersection.length >= 2) {
                step = step + 1;
                app._debugIntersection(intersection);
                positivePoints.push([intersection[0].x, intersection[0].y]);
                positivePoints.push([intersection[1].x, intersection[1].y]);
                intersection = getIntersection(step);
            }

            // Then on the negative direction
            var negativePoints = [];
            var step = -1;
            intersection = getIntersection(step)
            while(intersection.length >= 2) {
                step = step - 1;
                app._debugIntersection(intersection);
                negativePoints.push([intersection[1].x, intersection[1].y]);
                negativePoints.push([intersection[0].x, intersection[0].y]);
                intersection = getIntersection(step);
            }

            var totalPoints = negativePoints.reverse().concat(positivePoints)

            var closest = null;
            var sweepDirection = 0;
            var legTravelDirection = 0;
            var closestHomeDistance;

            if(totalPoints.length == 0) {
                throw("Flight path could not be calculated");
            }

            // Find the closest point to home.
            // First evaluate the ones in the positive path
            var d0 = app.getDistance(totalPoints[0], [homeX, homeY]);
            var d1 = app.getDistance(totalPoints[1], [homeX, homeY]);
            if(d0 <= d1) {
                closest = totalPoints[0];
                legTravelDirection = 0;
                closestHomeDistance = d0;
            } else {
                closest = totalPoints[1];
                legTravelDirection = -1;
                closestHomeDistance = d1;
            }
            sweepDirection = 0;

            // Then in the negative range
            if(totalPoints.length > 2) { // There are at least two legs
                d0 = app.getDistance(totalPoints[totalPoints.length - 2], [homeX, homeY]);
                d1 = app.getDistance(totalPoints[totalPoints.length - 1], [homeX, homeY]);
                if(d0 < closestHomeDistance || d1 < closestHomeDistance) {
                    if(d0 <= d1) {
                        closest = totalPoints[totalPoints.length - 2];
                        legTravelDirection = 0;
                        closestHomeDistance = d0;
                    } else {
                        closest = totalPoints[totalPoints.length - 1];
                        legTravelDirection = -1;
                        closestHomeDistance = d1;
                    }
                    sweepDirection = -1;
                }
            }

            if(_debug) { app._snap.circle(closest[0], closest[1], 10); }

            var dataResult = app.buildFlightData(
                totalPoints,
                legTravelDirection,
                sweepDirection
            );
            console.dir(dataResult);

            this.dataResult = dataResult;
            this.map.off('click'); // Disable flow

            var jsonUri = 'data:application/json,' + encodeURIComponent(JSON.stringify(app.dataResult));
            $('body').append(
                $('<a>View as json</a>').attr('href', jsonUri).addClass('dl')
            ).append(
                $('<a download>Download as json</a>').attr('href', jsonUri).addClass('dl')
            )
        },

        buildFlightData : function(totalPoints, legTravelDirection, sweepDirection) {
            var app = this;
            var homeX = this.home[0],
                homeY = this.home[1];
            var orderedPath = [];
            var legSweep = legTravelDirection;
            if(sweepDirection == -1) {
                totalPoints = totalPoints.reverse();
                legSweep = -1 - legSweep; // Alternate between 0 and -1
            }

            for(var i = 0; i < totalPoints.length; i += 2) {
                if(legSweep == 0) {
                    orderedPath.push(totalPoints[i]);
                    orderedPath.push(totalPoints[i + 1]);
                } else {
                    orderedPath.push(totalPoints[i + 1]);
                    orderedPath.push(totalPoints[i]);
                }
                legSweep = -1 - legSweep;
            }

            var points = [].concat.apply([], orderedPath);
            app._snap.polyline(points).attr({
                fill : 'none',
                stroke : '#FFF',
                strokeWidth : 3
            });
            // Add a marker with the waypoint index to each
            orderedPath.forEach(function(point, i) {
                app._snap.rect(point[0] - 10, point[1] - 15, 20, 15).attr({
                    opacity: 0.5,
                    fill: '#fff'
                })
                app._snap.text(point[0] - 4, point[1] - 4, ''+(i + 1))
            });

            var totalDistance = app.getDistance(orderedPath[0], [homeX, homeY]);
            for(var i = 1; i < orderedPath.length; i++) {
                totalDistance = totalDistance + app.getDistance(orderedPath[i - 1], orderedPath[i]);
            }
            totalDistance = totalDistance + app.getDistance(
                orderedPath[orderedPath.length - 1],
                [homeX, homeY]
            );
            return {
                waypointCount : orderedPath.length,
                totalDistance : totalDistance,
                waypoints : orderedPath.map(function(point) {
                    return {
                        lat : point[0].toFixed(4),
                        lon : point[1].toFixed(4)
                    }
                })
            }
        },

        // Utility methods
        getBBox : function() {
            if(!this.bbox) {
                this.bbox = this.polygonDraw._pathSVG.getBBox(
                    this.polygonDraw._pathSVG.attr('path')
                );
            }
            return this.bbox;
        },

        getDistance : function(p1, p2) {
            return Math.abs(Math.sqrt(
                Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2)
            ));
        },

        _debugIntersection : function(intersection) {
            if(_debug) {
                this._snap.path(
                    "M" + intersection[0].x + ',' + intersection[0].y +
                    'L' + intersection[1].x + ',' + intersection[1].y
                ).attr({
                    stroke: '#0f0',
                    strokeWidth: 5
                });
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

