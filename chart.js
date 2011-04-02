//___________________________________________________________________________//
// JamochaTrade
//  
// JamochaTrade is a rewrite of pyTrade, a stock charting and paper trading 
// program, in Javascript.
//
// JamochaTrade is free software: you can redistribute it and/or
// modify it under the terms of the GNU Affero General Public
// License version 3 as published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License version 3 for more details.
//
// You should have received a copy of the GNU Affero General Public
// License version 3 along with this program. If not, see
// <http://www.gnu.org/licenses/>.
//___________________________________________________________________________//

var width = 600, height = 500
var chart = document.getElementById("chart");
var c = chart.getContext("2d");
c.width = width; c.height = height

chart.onclick = moveRects;

//___________________________________________________________________________//
// Query Procedures
//___________________________________________________________________________//

// This is the YQL Query which still must be properly escaped @
// http://developer.yahoo.com/yql/console/
// Also the dataset is too large for YQL so the timeframe must be trimmed.
// select * from csv where url='http://ichart.finance.yahoo.com/table.csv?s=GE&d=2&e=27&f=2011&g=d&a=0&b=2&c=1962&ignore=.csv'

// This is the original escaped url from http://developer.yahoo.com/yql/console/
// Modifications: diagnostics=True was removed and callback=? instead of cbfunc and date was set to year 2000
// var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D'http%3A%2F%2Fichart.finance.yahoo.com%2Ftable.csv%3Fs%3DGE%26d%3D2%26e%3D27%26f%3D2011%26g%3Dd%26a%3D0%26b%3D1%26c%3D2000%26ignore%3D.csv'&format=json&diagnostics=true&callback=?";

function getUrl(symbol) {
  // This should use the current date instead of a hardcoded date.
  return "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D'http%3A%2F%2Fichart.finance.yahoo.com%2Ftable.csv%3Fs%3D" + symbol + "%26d%3D2%26e%3D27%26f%3D2011%26g%3Dd%26a%3D0%26b%3D1%26c%3D2000%26ignore%3D.csv'&format=json&callback=?";
}
  
function parseData(result) {
  // This returns an array of date objects the first row is labels.
  console.log(result.query.results.row);
}

// Loading and using jquery just for this is definately overkill.
$.getJSON(getUrl("ibm"), parseData)


//___________________________________________________________________________//
// Chart Drawing Procedures
//___________________________________________________________________________//

function drawRects() {
  for (var i in rects) {
    var r = rects[i];
    c.fillRect(r.x, r.y, r.width, r.height);
  }
}

function moveRects() {
  for (var i in rects) {
    rects[i].x += 20;
  }
  c.clearRect(0, 0, chart.width, chart.height);
  drawRects();
}

function Rect(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

var rects = [new Rect(10, 25, 20, 50), new Rect(40, 25, 20, 50)];

drawRects();
