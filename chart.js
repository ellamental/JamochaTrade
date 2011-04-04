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
chart.width = width; chart.height = height

//chart.onclick = moveRects;


//___________________________________________________________________________//
// Query and Init Procedures
//___________________________________________________________________________//

function getUrl(symbol) {
  return "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D'http%3A%2F%2Fichart.finance.yahoo.com%2Ftable.csv%3Fs%3D" + symbol + "%26d%3D2%26e%3D27%26f%3D2011%26g%3Dd%26a%3D0%26b%3D1%26c%3D2000%26ignore%3D.csv'&format=json&callback=?";
}

$.getJSON(getUrl("ibm"), init);

function init(result) {
  var data = result.query.results.row;
  drawRects(data, 1);
}


//___________________________________________________________________________//
// Chart Drawing Procedures
//___________________________________________________________________________//

function drawRects(d, s) {
  var e = s + 30;
  for (var i = s; i < e; i++) {
    c.fillRect(i*30, d[i].col1, 20, d[i].col1 - d[i].col4);
  }
}
