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


function newChart(symbol) {
  var width = 600, height = 500
  var chart = document.getElementById("chart");
  var c = chart.getContext("2d");
  chart.width = width; chart.height = height;

  var symbol = symbol;
  
  var today = 30;
  var chart_length = 15;

  var data = false;
  getData(symbol);
  
  var chart_style = "candle";
  var chart_styles = {"candle" : drawCandle,
                      "bar" :    drawBar,
                      "ohlc" :   drawOHLC,
                      "hlc" :    drawHLC,
                      "line" :   drawLine}
  
  var account = 100000;
  var portfolio = {};
  
  
  //__________________________________________________________________________
  // Event binding
  //__________________________________________________________________________
  
  $("#next_day").click(function () {
    if (today > 0) {
      today--;
      drawChart();
    }
  });
  
  function getChart() {
    var name = $("#symbol_entry").val()
    symbol = name;
    getData(name);
    $("#symbol_name").text(name.toUpperCase());
    $("#symbol_entry").val("");
  }
  $("#new_symbol").click(getChart);
  $("#symbol_entry").bind("keypress", function (e) {if (e.which === 13) {getChart();}});
  
  $("#chart_style").change(function () {
    chart_style = $("#chart_style").val();
    drawChart();
  });

  $("#time_period").change(function () {
    chart_length = parseInt($("#time_period").val());
    drawChart();
  });

  $("#buy").click(function () {
    price = data[today].close;
    shares = Math.floor(account / price);
    cost = shares * price;
    account = account - cost;
    portfolio[symbol] = shares;
    $("#account").text("$" + account.toFixed(2));
    $("#portfolio").text(JSON.stringify(portfolio));
  });
  
  $("#sell").click(function () {
    if (symbol in portfolio) {
      price = data[today].close;
      profit = price * portfolio[symbol];
      portfolio[symbol] = 0;
      account += profit;
      $("#account").text("$" + account.toFixed(2));
      $("#portfolio").text(JSON.stringify(portfolio));
    }
  });
  
  //__________________________________________________________________________
  // Data Retrieval
  //__________________________________________________________________________
  
  function getData(symbol) {
    var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D'http%3A%2F%2Fichart.finance.yahoo.com%2Ftable.csv%3Fs%3D" + symbol + "%26d%3D2%26e%4D04%26f%3D2011%26g%3Dd%26a%3D0%26b%3D1%26c%3D2000%26ignore%3D.csv'&format=json&callback=?";

    $.getJSON(url, function (result) {
      //col0=Date, col1=Open, col2=High, col3=Low, col4=Close, col5=Volume, col6=Adj Close
      // result_data[0] = headers, result_data[1:] = data, most recent first
      var result_data = result.query.results.row.slice(1);
      
      // Format result_data to change col1->open, col2->high, ...
      data = new Array(result_data.length - 1)
      for (var i=0; i < data.length; i++) {
        data[i] = {open:   result_data[i].col1,
                   high:   result_data[i].col2,
                   low:    result_data[i].col3,
                   close:  result_data[i].col4,
                   date:   result_data[i].col0,
                   volume: result_data[i].col5};
      }
      drawChart();
      console.log(data.slice(today,today+10));
    });
  }

  
  //__________________________________________________________________________
  // Chart drawing (Candlestick, Bar, OHLC, HLC, Line)
  //__________________________________________________________________________

  function drawChart() {
    chart_styles[chart_style]();
  }

  function drawCandle() {
    c.clearRect(0, 0, width, height);
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
      c.fillStyle = "#000";
      c.fillRect(width - ((i-today)*width_mul) + (width_mul / 4) - 1, 
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

  function drawBar() {
    c.clearRect(0, 0, width, height);
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

    for (var i = end; i > today; i--) {
      if (data[i].open < data[i].close) { c.fillStyle = "#444"; }
      else { c.fillStyle = "#000"; }
      c.fillRect(width - ((i-today)*width_mul), 
                (height-7) - (height_mul * (data[i].close-low)),
                width / (chart_length*2), //20,
                height);//(height_mul * (data[i].open - data[i].close)));
    }
  }
  
  function drawOHLC() {
    c.clearRect(0, 0, width, height);
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
      c.fillStyle = "#000";
      c.fillRect(width - ((i-today)*width_mul) + (width_mul / 4) - 1, 
                (height-7) - (height_mul * (data[i].low-low)),
                2,
                (height_mul * (data[i].low - data[i].high)));
      c.fillRect(width - ((i-today)*width_mul) + (width_mul / 4) - 1,
                (height-7) - (height_mul * (data[i].close-low)),
                width_mul / 2,
                2);
      c.fillRect(width - ((i-today)*width_mul) + (width_mul / 4) - 1,
                (height-7) - (height_mul * (data[i].open-low)),
                -(width_mul / 2),
                2);
    }
  }

  function drawHLC() {
    c.clearRect(0, 0, width, height);
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
      c.fillStyle = "#000";
      c.fillRect(width - ((i-today)*width_mul) + (width_mul / 4) - 1, 
                (height-7) - (height_mul * (data[i].low-low)),
                2,
                (height_mul * (data[i].low - data[i].high)));
      c.fillRect(width - ((i-today)*width_mul) + (width_mul / 4) - 1,
                (height-7) - (height_mul * (data[i].close-low)),
                width_mul / 2,
                2);
    }
  }

  function drawLine() {
    chart.width = chart.width;  // c.clearRect(0, 0, width, height); doesn't work here
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

    // draw line
    c.moveTo(width - ((end-today)*width_mul) + (width_mul / 4) - 1, 
             (height-7) - (height_mul * (data[end].close-low)))
    for (var i = end; i > today; i--) {
      c.lineTo(width - ((i-today)*width_mul) + (width_mul / 4) - 1, 
              (height-7) - (height_mul * (data[i].close-low)));
    }
    c.stroke();
  }


};


$(document).ready(function() {
  newChart("ibm");
});

