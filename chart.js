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
  var width = 620, height = 500
  var chart = document.getElementById("chart");
  var c = chart.getContext("2d");
  chart.width = width; chart.height = height;
  
  // Set select boxes to default
  $("#time_period").val("15");
  $("#chart_style").val("candle");
  $("#up_color").val("#00FF00");
  $("#down_color").val("#FF0000");
  $("#buy_order_type").val("market");

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
  
  var upColor = "#00FF00";
  var downColor = "#FF0000";
  
  var account = 100000;
  var portfolio = {};
  
  var pending_orders = [];
  var pending_order_counter = 0;
  
  $("#pending_orders_pane").hide();
  
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
          process_orders();
          //console.log(pending_orders);
          port_value = account;
          for (var sym in portfolio) {
            if (portfolio[sym] != 0) {
              port_value += appData[sym][today].close * portfolio[sym];
            }
          }
          $("#portfolio_value").text("$"+port_value.toFixed(2));
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
    if (chart_style === "candle" || chart_style === "bar") {
      $("#color_pickers").show(500);
    }
    else {
      $("#color_pickers").hide(500);
    }
  });
  
  $("#up_color").change(function () {
    upColor = $("#up_color").val();
    drawChart();
  });
  $("#down_color").change(function () {
    downColor = $("#down_color").val();
    drawChart();
  });

  $("#time_period").change(function () {
    chart_length = parseInt($("#time_period").val());
    drawChart();
  });

  //__________________________________________________________________________
  // Order Processing
  //__________________________________________________________________________

  $("#limit_price_div").hide();
  $("#buy_order_type").change(function () {
    var val = $("#buy_order_type").val();
    if (val === "market") {
      $("#limit_price_div").hide();
    }
    else if (val === "limit" || val === "stop") {
      $("#limit_price_div").show();
    }
  });
  
  $("#buy").click(function () {
    order_type = $("#buy_order_type").val();
    if (order_type === "market") {
      buy($("#shares_to_buy").val(), data[today].close);
    }
    else if (order_type === "limit") {
      add_pending_order("buy_limit", symbol, $("#limit_price").val(), $("#shares_to_buy").val());
    }
    else if (order_type === "stop") {
      add_pending_order("buy_stop", symbol, $("#limit_price").val(), $("#shares_to_buy").val());
    }
  });

  function add_pending_order(type, sym, price, shares) {
    var o = { "type": type,
              "symbol": sym,
              "price": price,
              "shares": shares,
              "id": pending_order_counter };
    pending_orders.push(o);
    pending_order_counter++;
    display_pending_order(o);
    if (pending_orders.length === 1) {
      $("#pending_orders_pane").show();
    }
  }
  
  function display_pending_order(o) {
    var display = { "buy_stop": "Buy Stop",
                    "buy_limit": "Buy Limit",
                    "sell_stop": "Sell Stop",
                    "sell_limit": "Sell Limit" }
    $("#pending_orders").append('<div id="pending_order_'+o.id+'" class="ui-corner-all ui-widget-content">'+display[o.type]+'<br />Symbol: '+o.symbol+'<br />Shares: '+o.shares+'<br />Price: '+o.price+'<br /><button id="cancel_'+o.id+'">Cancel</button></div>');
    $("#cancel_"+o.id).button();
    $("#cancel_"+o.id).click(function () {
      remove_pending_order(o.id);
    });
  }
  
  function buy(num_shares, price) {
    price = parseFloat(price);
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
      var shares_id = "#pi_"+symbol+" > .shares";
      $(shares_id).text(portfolio[symbol])
    }
    else {
      portfolio[symbol] = shares;
      addPortfolioItem(symbol);
    }
    $("#account").text("$" + account.toFixed(2));
  }
  
  function addPortfolioItem(sym) {
    var div_id = "pi_"+sym;
    $("#security_list").prepend('<div id="'+div_id+'" name="'+sym+'" class="portfolio_item ui-corner-all ui-widget-content">Symbol: '+sym+'<br />Shares: <span class="shares">'+shares+'</span><br />Order Type: <select id="order_type_'+sym+'" class="ui-state-default"><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option></select><br />Shares: <input id="sell_shares_'+sym+'" size="6"></input><div id="limit_div_'+sym+'">Limit Price: <input id="limit_price_'+sym+'" size="6"></div><div><button id="sell_'+sym+'">Sell</button><button id="view_'+sym+'">View</button></div></div>');
    $("#sell_" + sym).button();
    $("#view_" + sym).button();
    $("#view_" + sym).click(function () {
      symbol = sym;
      $("#symbol_name").text(sym.toUpperCase());
      getData(sym);
    });
    $("#limit_div_"+sym).hide();
    $("#order_type_"+sym).val("market");
    $("#order_type_"+sym).click(function () {
      var o = $("#order_type_"+sym).val();
      if (o === "market") {
        $("#limit_div_"+sym).hide();
      }
      else if (o === "limit" || o === "stop") {
        $("#limit_div_"+sym).show();
      }
    });
    $("#sell_"+sym).click(function () {
      order_type = $("#order_type_"+sym).val();
      if (order_type === "market") {
        sell(sym, $("#sell_shares_"+sym).val(), appData[sym][today].close);
      }
      else if (order_type === "limit") {
        add_pending_order("sell_limit", sym, $("#limit_price_"+sym).val(), $("#sell_shares_"+sym).val());
      }
      else if (order_type === "stop") {
        add_pending_order("sell_stop", sym, $("#limit_price_"+sym).val(), $("#sell_shares_"+sym).val());
      }
    });
  }
  
  function sell(sym, num_shares, price) {
    if (sym in portfolio) {
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

  function process_orders() {
    var remove_list = [];
    for (var i=0; i<pending_orders.length; i++) {
      var o = pending_orders[i];
      if (o.type === "buy_limit") {
        if (appData[o.symbol][today].low < o.price) {
          p = Math.min(appData[o.symbol][today].open, o.price);
          buy(o.shares, p);
          remove_list.push(i);
          alert("Limit order filled: "+o.symbol+" "+o.shares+" @ "+p+"/share");
          $("#pending_order_"+o.id).remove();
        }
      }
      else if (o.type === "buy_stop") {
        if (appData[o.symbol][today].high > o.price) {
          p = Math.max(appData[o.symbol][today].open, o.price);
          buy(o.shares, p);
          remove_list.push(i);
          alert("Stop order filled: "+o.symbol+" "+o.shares+" @ "+p+"/share");
          $("#pending_order_"+o.id).remove();
        }
      }
      else if (o.type === "sell_limit") {
        if (appData[o.symbol][today].high > o.price) {
          p = Math.max(appData[o.symbol][today].open, o.price);
          sell(o.symbol, o.shares, p);
          remove_list.push(i);
          alert("Limit sell order filled: "+o.symbol+" "+o.shares+" @ "+p+"/share");
          $("#pending_order_"+o.id).remove();
        }
      }
      else if (o.type === "sell_stop") {
        if (appData[o.symbol][today].low < o.price) {
          p = Math.min(appData[o.symbol][today].open, o.price);
          sell(o.symbol, o.shares, p);
          remove_list.push(i);
          alert("Stop sell order filled: "+o.symbol+" "+o.shares+" @ "+p+"/share");
          $("#pending_order_"+o.id).remove();
        }
      }
    }
    for (var i=remove_list.length-1; i >= 0; i--) {
      pending_orders.splice(i, 1);
    }
    if (pending_orders.length < 1) {
      $("#pending_orders_pane").hide();
    }
  }
  
  function remove_pending_order(order_id) {
    for (var i=0; i < pending_orders.length; i++) {
      if (pending_orders[i].id === order_id) {
        pending_orders.splice(i, 1);
        $("#pending_order_"+order_id).remove();
        if (pending_orders.length < 1) {
          $("#pending_orders_pane").hide();
        }
      }
    }
  }
  
  //__________________________________________________________________________
  // Indicators
  //__________________________________________________________________________
  
  $("#draw_sma").click(function () {
    draw_sma(parseInt($("#sma_days").val()));
  });
  
  function draw_sma(days) {
    var o = getAdjustments();
    var sma_data = [];
    var end = chart_length + today;
    for (var i=today; i < end; i++) {
      var slice = data.slice(i, i+days), 
          sum = 0;
      for (var j=0; j < days; j++) {
        sum += slice[j].close;
      }
      sma_data.push(sum/days);
    }
    console.log(sma_data);
    drawaLine(sma_data, o);
  }
  
  function drawaLine(data_list, o) {
    //chart.width = chart.width;  // c.clearRect(0, 0, width, height); doesn't work here
    //var a = getAdjustments();
    c.beginPath();
    var end = o.end, low = o.low, high = o.high,
        height_mul = o.height_mul, width_mul = o.width_mul;

    // draw line
    c.moveTo(width - ((end+1)*width_mul) + (width_mul / 4) - 1, 
             height - (height_mul * (data_list[data_list.length-1]-low)))
    for (var i = data_list.length; i >= 0; i--) {
      c.lineTo(width - ((i+1)*width_mul) + (width_mul / 4) - 1, 
               height - (height_mul * (data_list[i]-low)));
    }
    c.stroke();
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
          data[i] = {open:   parseFloat(result_data[i].col1),
                     high:   parseFloat(result_data[i].col2),
                     low:    parseFloat(result_data[i].col3),
                     close:  parseFloat(result_data[i].col4),
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

  function clear_canvas() {
    c.clearRect(0, 0, width, height);
    //chart.width++; chart.width--; // must change size for webkit compatibility
  }

  function drawChart() {
    chart_styles[chart_style]();
    var t = data[today];
    $("#today_date").text(t.date);
    $("#today_open").text(t.open);
    $("#today_high").text(t.high);
    $("#today_low").text(t.low);
    $("#today_close").text(t.close);
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
    var height_mul = (height) / (high - low);
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
    for (var i=0; i<6; i++) {
      c.fillRect(0,
                 height-(i*mul),
                 width,
                 1);
    }
  }

  function drawPriceLabels(a) {
    var mul = height / 6;
    var diff = (a.high-a.low) / 6;
    c.fillStyle = "#000";
    c.font = 'italic 15px sans-serif';
    c.textAlign = "right";
    for (var i=0; i<6; i++) {
      var p = (a.low+(diff*i)).toFixed(2);
      c.fillText(p, width-5, height-(i*mul)-2);
    }
  }

  function drawCandle() {
    clear_canvas();
    var a = getAdjustments();
    var end = a.end, low = a.low, high = a.high;// = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();
    
    // draw wicks
    for (var i = end; i >= today; i--) {
      c.fillStyle = "#000";
      c.fillRect(width - ((i-today+1)*width_mul) + (width_mul / 4) - 1, 
                 height - (height_mul * (data[i].low-low)),
                 2,
                 (height_mul * (data[i].low - data[i].high)));
    }

    // draw bodies
    for (var i = end; i >= today; i--) {
      if (data[i].open < data[i].close) { c.fillStyle = upColor; }
      else { c.fillStyle = downColor; }
      c.fillRect(width - ((i-today+1)*width_mul), 
                 height - (height_mul * (data[i].open-low)),
                 width / (chart_length*2), //20,
                 (height_mul * (data[i].open - data[i].close)));
    }
    drawPriceLabels(a);
  }

  function drawBar() {
    clear_canvas();
    var a = getAdjustments();
    var end = a.end, low = a.low, high = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();

    for (var i = end; i >= today; i--) {
      if (data[i].open < data[i].close) { c.fillStyle = upColor; }
      else { c.fillStyle = downColor; }
      c.fillRect(width - ((i-today+1)*width_mul), 
                 height - (height_mul * (data[i].close-low)),
                 width / (chart_length*2), //20,
                 height);//(height_mul * (data[i].open - data[i].close)));
    }
    drawPriceLabels(a);
  }
  
  function drawOHLC() {
    clear_canvas();
    var a = getAdjustments();
    var end = a.end, low = a.low, high = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();

    // draw wicks
    for (var i = end; i >= today; i--) {
      c.fillStyle = "#000";
      c.fillRect(width - ((i-today+1)*width_mul) + (width_mul / 4) - 1, 
                 height - (height_mul * (data[i].low-low)),
                 2,
                 (height_mul * (data[i].low - data[i].high)));
      c.fillRect(width - ((i-today+1)*width_mul) + (width_mul / 4),
                 height - (height_mul * (data[i].close-low)),
                 width_mul / 4,
                 2);
      c.fillRect(width - ((i-today+1)*width_mul) + (width_mul / 4) - 1,
                 height - (height_mul * (data[i].open-low)),
                 -(width_mul / 4),
                 2);
    }
    drawPriceLabels(a);
  }

  function drawHLC() {
    clear_canvas();
    var a = getAdjustments();
    var end = a.end, low = a.low, high = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();

    // draw wicks
    for (var i = end; i >= today; i--) {
      c.fillStyle = "#000";
      c.fillRect(width - ((i-today+1)*width_mul) + (width_mul / 4) - 1, 
                 height - (height_mul * (data[i].low-low)),
                 2,
                 (height_mul * (data[i].low - data[i].high)));
      c.fillRect(width - ((i-today+1)*width_mul) + (width_mul / 4),
                 height - (height_mul * (data[i].close-low)),
                 width_mul / 4,
                 2);
    }
    drawPriceLabels(a);
  }

  function drawLine() {
    clear_canvas();
    var a = getAdjustments();
    var end = a.end, low = a.low, high = data[today].high;
    var height_mul = a.height_mul, width_mul = a.width_mul;
    drawHorizontalLines();

    // draw line
    c.beginPath();
    c.moveTo(width - ((end-today+1)*width_mul) + (width_mul / 4) - 1, 
             height - (height_mul * (data[end].close-low)))
    for (var i = end; i >= today; i--) {
      c.lineTo(width - ((i-today+1)*width_mul) + (width_mul / 4) - 1, 
               height - (height_mul * (data[i].close-low)));
    }
    c.stroke();
    drawPriceLabels(a);
  }



};


$(document).ready(function() {
  newChart("IBM");
});

