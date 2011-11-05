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

// Maybe put everything inside the $getJSON(url, function (result) { //all code here }
// with the getUrl(symbol) function being the only one outside this scope?


function newChart(symbol) {
  var width = 600, height = 500
  var chart = document.getElementById("chart");
  var c = chart.getContext("2d");
  chart.width = width; chart.height = height
  
  var today = 0;
  var chart_length = 15;

  
  function getUrl(symbol) {
    return "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D'http%3A%2F%2Fichart.finance.yahoo.com%2Ftable.csv%3Fs%3D" + symbol + "%26d%3D2%26e%4D04%26f%3D2011%26g%3Dd%26a%3D0%26b%3D1%26c%3D2000%26ignore%3D.csv'&format=json&callback=?";
  }
  
  $.getJSON(getUrl("ibm"), function (result) {
    //col0=Date, col1=Open, col2=High, col3=Low, col4=Close, col5=Volume, col6=Adj Close
    // result_data[0] = headers, result_data[1:] = data, most recent first
    var result_data = result.query.results.row.slice(1);
    
    // Format result_data to change col1->open, col2->high, ...
    var data = new Array(result_data.length - 1)
    for (var i=0; i < data.length; i++) {
      data[i] = {open:  result_data[i].col1,
              high:  result_data[i].col2,
              low:   result_data[i].col3,
              close: result_data[i].col4,
              date:   result_data[i].col0,
              volume: result_data[i].col5};
    }

    
    
    drawChart();
    console.log(data.slice(today,today+10));

    function drawChart() {
      var end = today + chart_length;
      var low = data[today].low;
      var high = data[today].high;
      
      // get lowest low and highest high
      for (var i = today; i < end; i++) {
        if (data[i].low < low) { low = data[i].low }
        if (data[i].high > high) { high = data[i].high }
      }

      // get multipliers
      var height_mul = (height-30) / (high - low);
      var width_mul = (width-20) / chart_length;

      // draw wicks
      for (var i = end; i > today; i--) {
        if (data[i].open < data[i].close) { c.fillStyle = "#00f"; }
        else { c.fillStyle = "#f00"; }
        c.fillRect((width + ((width / (chart_length * 2)) / 2) - 1) - ((i-today)*width_mul), 
                  (height-7) - (height_mul * (data[i].low-low)),
                  2,
                  (height_mul * (data[i].low - data[i].high)));
      }

      
      // draw bodies
      for (var i = end; i > today; i--) {
        if (data[i].open < data[i].close) { c.fillStyle = "#00f"; }
        else { c.fillStyle = "#f00"; }
        c.fillRect(width - ((i-today)*width_mul), 
                  (height-7) - (height_mul * (data[i].open-low)),
                  width / (chart_length*2), //20,
                  (height_mul * (data[i].open - data[i].close)));
      }
    }
    
    
  });
};

newChart("ibm");

