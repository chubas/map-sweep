# skycatch-challenge
Sweep area to produce a flight path

## Problem description

Allow an interface for the user to select a polygon in a map, then select a
home point, a flight path direction and a 'leg distance'. Given these parameters:

Sweep the polygon in perpendicular lines to the flight path direction, traveling
in zig-zag motion through the waypoints. In the end, draw the flight path and
produce stats object with the total waypoints, their coordinates and the total
distance.

## Running server

`node bin/server.js`

## Usage

When openen, click the points that define the polygon, then double click to close
the shape. After that, you will be required to click where the home should be,
and after that, a prompt asking for the two parameters "leg distance" and "flight
path direction". The path will be calculated and displayed, and the links for
either presenting or downloading the flight data will appear in the bottom of the
page.

## Limitations

Currently, the program doesn't validate if the area is a convex polygon, and will
produce incorrect results on a concave one (or even break when polygon is segmented)

There is also no validation for the range of the leg path or the flight direction
inputs from the user
