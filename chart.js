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
  
  var today = 300;
  var chart_length = 15;

  var appData = {};
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
  
  function nextDay(days, delay) {
    function nextD() {
      if (days > 0) {
        t=setTimeout(nextD, delay); 
        days--;
        if (today > 0) {
          today--; 
          drawChart();
        }
      }
    }
    nextD();
  }
  $("#next_day").click(function () { nextDay(1, 0) });
  $("#next_week").click(function () { nextDay(5, 100); });
  $("#next_month").click(function () { nextDay(20, 25); });
  
  function getChart() {
    var name = $("#symbol_entry").val().toUpperCase();
    symbol = name;
    getData(name);
    $("#symbol_name").text(name);
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
    num_shares = $("#shares_to_buy").val();
    if (num_shares === "") {
      shares = Math.floor(account / price);
    }
    else {
      shares = parseInt(num_shares);
      if (shares * price > account) {
        shares = Math.floor(account / price)
      }
    }
    cost = shares * price;
    account = account - cost;
    if (symbol in portfolio) {
      if (portfolio[symbol] === 0) { $("#pi_" + symbol).show(); }
      portfolio[symbol] += shares;
      var div_id = "#pi_"+symbol+" > .shares";
      $(div_id).text(portfolio[symbol])
    }
    else {
      portfolio[symbol] = shares;
      var div_id = "pi_"+symbol;
      $("#security_list").prepend('<div id="'+div_id+'" name="'+symbol+'" class="portfolio_item ui-corner-all ui-widget-content">Symbol: '+symbol+'<br />Shares: <span class="shares">'+shares+'</span><br /><input id="sell_shares_'+symbol+'" size="6"></input><button id="sell_'+symbol+'">Sell</button></div>');
      $("#sell_" + symbol).button();
      var s = symbol;
      $("#sell_"+symbol).click(function () {
        sell(s);
      });
    }
    $("#account").text("$" + account.toFixed(2));
  });
  
  $("#sell").click(function () { sell(symbol); });

  function sell(sym) {
    if (sym in portfolio) {
      price = appData[sym][today].close;
      num_shares = $("#sell_shares_"+sym).val();
      if (num_shares === "") {
        shares = portfolio[sym];
      }
      else if (parseInt(num_shares) > portfolio[sym]) {
        shares = portfolio[sym];
      }
      else {
        shares = parseInt(num_shares);
      }
      profit = price * shares;
      portfolio[sym] = portfolio[sym] - shares;
      account += profit;
      if (portfolio[sym] === 0) { $("#pi_"+sym).hide(); }
      var div_id = "#pi_"+sym+" > .shares";
      $(div_id).text(portfolio[sym]);
      $("#account").text("$" + account.toFixed(2));
    }
  }

  
  //__________________________________________________________________________
  // Data Retrieval
  //__________________________________________________________________________
  
  function getData(symbol) {
    if (symbol in appData) {
      data = appData[symbol];
      drawChart();
    }
    else {
      console.log("Downloading...");
      date = new Date();
      var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D'http%3A%2F%2Fichart.finance.yahoo.com%2Ftable.csv%3Fs%3D" + symbol + "%26d%3D"+(date.getMonth()+1)+"%26e%3D"+date.getDate()+"%26f%3D"+date.getFullYear()+"%26g%3Dd%26a%3D0%26b%3D2%26c%3D1962%26ignore%3D.csv'&format=json&callback=?";
      
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
        appData[symbol] = data;
        drawChart();
        //console.log(data.slice(today,today+10));
      });
    }
  }

  
  //__________________________________________________________________________
  // Chart drawing (Candlestick, Bar, OHLC, HLC, Line)
  //__________________________________________________________________________

  function drawChart() {
    chart_styles[chart_style]();
  }

  function getAdjustments() {
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

    return {"end": end,
            "low": low,
            "high": high,
            "height_mul": height_mul,
            "width_mul": width_mul}
  }
  
  function drawHorizontalLines() {
    var mul = height / 6;
    c.fillStyle = "#000";
    for (var i=1; i<6; i++) {
      c.fillRect(0,
                 i*mul,
                 width,
                 1);
    }
  }

  function drawCandle() {
    c.clearRect(0, 0, width, height);
    var a = getAdjustments();
    var end = a.end, low = a.low, high = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();
    
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
    var a = getAdjustments();
    var end = a.end, low = a.low, high = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();

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
    var a = getAdjustments();
    var end = a.end, low = a.low, high = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();

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
    var a = getAdjustments();
    var end = a.end, low = a.low, high = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();

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
    var a = getAdjustments();
    var end = a.end, low = a.low, high = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();

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
  newChart("IBM");
});

