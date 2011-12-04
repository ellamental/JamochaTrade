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
  "use strict";
  
  // Set select boxes to default
  $("#time_period").val("30");
  $("#chart_style").val("candle");
  $("#up_color").val("#00FF00");
  $("#down_color").val("#FF0000");
  $("#buy_order_type").val("market");
  $("#dow_30").val("title");
  $("#nasdaq_100").val("title");
  $("#commission_type").val("none");
  $("#indicator_select").val("sma");

  // Hide things that should be hidden by default
  $("#pending_orders_pane").hide();
  $("#chart_widgets").hide();
  $("#chart_settings_pane").hide();
  $("#market_lists").hide();
  $("#recently_viewed_list").hide();
  $("#limit_price_div").hide();
  $("#indicator_settings").hide();
  $("#favorites_pane").hide();
  $("#settings_pane").hide();
  $("#commission_amount").hide();
  $("#commission_amount_text").hide();
  
  var width = 620,
      height = 500,
      volume_height = 50,
      chart = document.getElementById("chart"),
      c = chart.getContext("2d"),
      volume_chart = document.getElementById("volume_chart"),
      vol_c = volume_chart.getContext("2d"),
      
      today = 300,
      chart_length = parseInt($("#time_period").val(), 10),
      
      stock_data = {},
      data = false,
  
      chart_style = "candle",
      chart_styles = {"candle" : drawCandle,
                      "bar" :    drawBar,
                      "ohlc" :   drawOHLC,
                      "hlc" :    drawHLC,
                      "line" :   drawLine},
  
      up_color = $("#up_color").val(),
      down_color = $("#down_color").val(),
  
      account = 100000,
      portfolio = {},
  
      pending_orders = [],
      pending_order_counter = 0,
      
      recently_viewed_cache = [],
      
      active_indicators = [],
      indicator_counter = 0,
      
      commission_type = "none",
      commission_amount = 0;
  
  chart.width = width; chart.height = height;
  volume_chart.width = width; volume_chart.height = volume_height;
  changeSymbol(symbol);
  $("#days_left").text(today);

  $("#comment_submit").click(function () {
    var datastring = "message="+$("#comment_box").val();
    $.ajax({  
      type: "POST",
      url: "sendmail.php",
      data: datastring,
      success: function() {
        $("#comment_box").val("");
      }
    });
  });
  
  
  
  //__________________________________________________________________________
  // Settings
  //__________________________________________________________________________
  
  $("#settings_link").click(function () {
    $("#settings_pane").toggle();
    return false;
  });
  
  // Change current day
  
  $("#set_current_day").click(function () {
    var days_remaining = $("#set_current_day_input");
    today = parseInt(days_remaining.val(), 10);
    days_remaining.val("");
    changeSymbol(symbol);
  });
  
  // Commissions
  
  $("#commission_type").change(function () {
    var cur_val = $(this).val(),
        comm_amount = $("#commission_amount"),
        comm_amount_text = $("#commission_amount_text");
    if (cur_val === "none") {
      comm_amount.hide();
      comm_amount_text.hide();
    }
    else if (cur_val === "per_share") {
      comm_amount.show();
      comm_amount_text.text("$");
      comm_amount_text.show();
    }
    else if (cur_val === "percentage") {
      comm_amount.show();
      comm_amount_text.text("%");
      comm_amount_text.show();
    }
  });
  
  $("#set_commission").click(function () {
    commission_type = $("#commission_type").val();
    commission_amount = parseFloat($("#commission_amount").val());
    if (commission_type === "percentage") {
      commission_amount = commission_amount / 100;
    }
  });
  
  function calculate_commission(price) {
    if (commission_type === "none") {
      return 0;
    }
    else if (commission_type === "per_share") {
      return commission_amount;
    }
    else if (commission_type === "percentage") {
      return price * commission_amount;
    }
  }
  
  
  
  //__________________________________________________________________________
  // Miscellaneous Functions
  //__________________________________________________________________________
  
  function formatCurrency(num) {
    var cents = ((num % 1).toFixed(2)).split('.')[1],
        s = [],
        n = Math.floor(num),
        t;
    while (n > 0) {
      t = (n % 1000);
      n = Math.floor(n / 1000);
      // display $3,000.00 instead of $003,000.00
      if (n > 0) {
        // display $1,001.00 instead of $1,1.00
        if (t === 0) { t = '000'; }
        else if (t < 10) { t = '00' + t; }
        else if (t < 100) { t = '0' + t; }
      }
      s.unshift(t);
    }
    return '$'+s.join(',')+'.'+cents;
  }
  
  function percentGain(purchase_price, current_price) {
    return (((current_price / purchase_price) - 1) * 100).toFixed(2) + "%";
  }
  
  
  
  //__________________________________________________________________________
  // Time Controls
  //__________________________________________________________________________
  
  function nextDay(days, delay) {
    var days_left = $("#days_left");
    function nextD() {
      if (days > 0) {
        var t = setTimeout(nextD, delay); 
        days--;
        if (today > 0) {
          today--;
          days_left.text(today);
          drawChart();
          processOrders();
          var port_value = account;
          for (var sym in portfolio) {
            if (portfolio[sym][0].shares !== 0) {
              var close = stock_data[sym][today].close,
                  position = portfolio[sym][0],
                  pitem = $("#pi_"+sym),
                  pitem_pgl = pitem.find("#pi_percent_gain_loss"),
                  pitem_value = pitem.find("#pi_value"),
                  current_value = close * position.shares;
              port_value += current_value;
              pitem_pgl.text(percentGain(position.price, close));
              if (position.price < close) {
                pitem_pgl.css("color", "green");
              }
              else {
                pitem_pgl.css("color", "red");
              }
              pitem_value.text(formatCurrency(current_value));
            }
          }
          $("#portfolio_value").text(formatCurrency(port_value));
        }
      }
    }
    nextD();
  }
  $("#next_day").click(function () { nextDay(1, 0); });
  $("#next_week").click(function () { nextDay(5, 100); });
  $("#next_month").click(function () { nextDay(20, 25); });
  
  
  
  //__________________________________________________________________________
  // Chart Controls
  //__________________________________________________________________________
  
  $("#chart_controls").click(
    function () { $("#chart_widgets").toggle('fast'); }
  );
  
  // Symbol Entry widget
  
  function getChart() {
    var sym = $("#symbol_entry").val();
    if (sym) {
      changeSymbol(sym);
      $("#symbol_entry").val("");
    }
  }
  $("#new_symbol").click(getChart);
  $("#symbol_entry").bind("keypress", function (e) {if (e.which === 13) {getChart();}});
  
  
  // Chart Settings widget
  
  $("#chart_settings").hover(
    function () { $(this).addClass("ui-state-hover"); },
    function () { $(this).removeClass("ui-state-hover"); }
  ).click(function (e) {
    $("#chart_settings_pane").toggle();
    e.stopPropagation();
  });
  
  $("#chart_style").change(function () {
    chart_style = $("#chart_style").val();
    drawChart();
    if (chart_style === "candle" || chart_style === "bar") {
      $("#color_pickers").show(500);
    }
    else {
      $("#color_pickers").hide(500);
    }
  }).click(function (e) { e.stopPropagation(); });
  
  $("#up_color").change(function () {
    up_color = $("#up_color").val();
    drawChart();
  }).click(function (e) { e.stopPropagation(); });
  $("#down_color").change(function () {
    down_color = $("#down_color").val();
    drawChart();
  }).click(function (e) { e.stopPropagation(); });

  $("#time_period").change(function () {
    chart_length = parseInt($("#time_period").val(), 10);
    drawChart();
  }).click(function (e) { e.stopPropagation(); });

  
  // Markets widget
  
  $("#markets").hover(
    function () { $(this).addClass("ui-state-hover"); },
    function () { $(this).removeClass("ui-state-hover"); }
  ).click(function (e) {
    $("#market_lists").toggle();
    e.stopPropagation();
  });

  function selectSymbol(select_box) {
    changeSymbol(select_box.val());
    select_box.val('title');
  }

  $("#dow_30").change(function () {
    selectSymbol($("#dow_30"));
  }).click(function (e) { e.stopPropagation(); });
  
  $("#nasdaq_100").change(function () {
    selectSymbol($("#nasdaq_100"));
  }).click(function (e) { e.stopPropagation(); });
  
  
  // Recently Viewed Widget
  
  function addRecentlyViewed(sym) {
    var recent = $("#recently_viewed_list");
    if (recently_viewed_cache.indexOf(sym) < 0) {
      recently_viewed_cache.push(sym);
      recent.prepend('<option id="rv_'+sym+'" value="'+sym+'">'+sym+'</option>');
    }
    else {
      $("#rv_"+sym).remove();
      recent.prepend('<option id="rv_'+sym+'" value="'+sym+'">'+sym+'</option>');
    }
    recent.val(sym);
  }
  
  $("#recently_viewed").hover(
    function () { $(this).addClass("ui-state-hover"); },
    function () { $(this).removeClass("ui-state-hover"); }
  ).click(function (e) {
    $("#recently_viewed_list").toggle();
    e.stopPropagation();
  });
  
  $("#recently_viewed_list").change(function (e) {
    var s = $(this).val();
    changeSymbol(s);
  }).click(function (e) { e.stopPropagation(); });
  
  
  // Favorites widget
  
  $("#favorites").hover(
    function () { $(this).addClass("ui-state-hover"); },
    function () { $(this).removeClass("ui-state-hover"); }
  ).click(function (e) {
    $("#favorites_pane").toggle();
    e.stopPropagation();
  });
  
  $("#add_favorite").click(function (e) {
    var fav_list = $("#favorites_list");
    e.stopPropagation();
    fav_list.append('<option value="'+symbol+'">'+symbol+'</option>');
    if (fav_list.children().length < 5) {
      fav_list.attr("size", fav_list.children().length);
    }
  });
  
  $("#favorites_list").change(function () {
    changeSymbol($(this).val());
  }).click(function (e) { e.stopPropagation(); });
  
  $("#remove_favorite").click(function (e) {
    e.stopPropagation();
    $("#favorites_list option:selected").remove();
  });
  
  
  
  //__________________________________________________________________________
  // Order Processing
  //__________________________________________________________________________

  $("#buy_order_type").change(function () {
    var val = $("#buy_order_type").val();
    if (val === "market") {
      $("#limit_price_div").hide('fast');
    }
    else if (val === "limit" || val === "stop") {
      $("#limit_price_div").show('fast');
    }
  });
  
  $("#buy").click(function () {
    var order_type = $("#buy_order_type").val();
    if (order_type === "market") {
      buy($("#shares_to_buy").val(), data[today].close);
    }
    else if (order_type === "limit") {
      addPendingOrder("buy_limit", symbol, $("#limit_price").val(), $("#shares_to_buy").val());
    }
    else if (order_type === "stop") {
      addPendingOrder("buy_stop", symbol, $("#limit_price").val(), $("#shares_to_buy").val());
    }
  });

  function addPendingOrder(type, sym, price, shares) {
    var o = { "type": type,
              "symbol": sym,
              "price": price,
              "shares": shares,
              "id": pending_order_counter };
    pending_orders.push(o);
    pending_order_counter++;
    displayPendingOrder(o);
    if (pending_orders.length === 1) {
      $("#pending_orders_pane").show('fast');
    }
  }
  
  function displayPendingOrder(o) {
    var display = { "buy_stop": "Buy Stop",
                    "buy_limit": "Buy Limit",
                    "sell_stop": "Sell Stop",
                    "sell_limit": "Sell Limit" },
        po = $("#po_template").clone(true);
    po.attr("id", "po_"+o.id);
    po.find("#po_type").text(display[o.type]);
    po.find("#po_symbol").text(o.symbol);
    po.find("#po_shares").text(o.shares);
    po.find("#po_price").text(o.price);
    po.find("#po_cancel").button();
    po.find("#po_cancel").click(function () {
      removePendingOrder(o.id);
    });
    $("#pending_orders").append(po);
  }
  
  function removePendingOrder(order_id) {
    for (var i=0, j=pending_orders.length; i < j; i++) {
      if (pending_orders[i].id === order_id) {
        pending_orders.splice(i, 1);
        $("#po_"+order_id).remove();
        if (pending_orders.length < 1) {
          $("#pending_orders_pane").hide('fast');
        }
      }
    }
  }
  
  function buy(num_shares, price) {
    // Parse input
    price = parseFloat(price);
    price = price + calculate_commission(price);
    var shares;
    if (num_shares === "") {
      shares = Math.floor(account / price);
    }
    else {
      shares = parseInt(num_shares, 10);
      if (shares * price > account) {
        shares = Math.floor(account / price);
      }
    }
    
    // update account
    var cost = shares * price;
    account = account - cost;
    $("#account").text(formatCurrency(account));
    
    if (symbol in portfolio) {
      var pitem = $("#pi_"+symbol);
      
      // if no current position, create a new position and add to beginning of portfolio[symbol]
      if (portfolio[symbol][0].shares === 0) {
        pitem.show('fast');
        portfolio[symbol].unshift({ "shares": shares, 
                                    "price": price,
                                    "trades": [ ["buy", shares, price] ] });
        pitem.find("#pi_shares").text(shares);
        pitem.find("#pi_purchase_price").text(formatCurrency(price));
        pitem.find("#pi_value").text(formatCurrency(cost));
      }
      
      // if there is a current position: average and update the purchase price, shares and trades
      else {
        var old_val = portfolio[symbol][0].shares * portfolio[symbol][0].price,
            avg_price = (old_val + cost) / (portfolio[symbol][0].shares + shares);
        portfolio[symbol][0].shares += shares;
        portfolio[symbol][0].price = avg_price;
        portfolio[symbol][0].trades.push(["buy", shares, price]);
        pitem.find("#pi_shares").text(portfolio[symbol][0].shares);
        pitem.find("#pi_purchase_price").text(formatCurrency(avg_price));
        pitem.find("#pi_value").text(formatCurrency(price*portfolio[symbol][0].shares));
      }
      //console.log(portfolio[symbol]);
    }
    
    // if no position in this security has ever existed: create a new position
    else {
      portfolio[symbol] = [{ "shares": shares, 
                             "price": price, 
                             "trades": [ ["buy", shares, price] ] }];
      addPortfolioItem(symbol, shares, price);
    }
  }
  
  function addPortfolioItem(sym, shares, price) {
    var item = $("#pi_template").clone(true);
    item.attr("id", "pi_"+sym);

    // Set default values, hide elements and make buttons
    item.find("#pi_info").hide();
    var order_type_select = item.find("#pi_order_type");
    order_type_select.val("market");
    item.find("#pi_limit_div").hide();
    item.find("#pi_percent_gain_loss").text("0.00%");
    item.find("#pi_purchase_price").text(formatCurrency(price));
    item.find("#pi_value").text(formatCurrency(price*shares));
    
    // Set initial values
    item.find("#pi_symbol").text(sym);
    item.find("#pi_shares").text(shares);
    
    // Bind events
    item.click(function () {
      item.find("#pi_info").toggle();
    });
    
    item.find("#pi_view").click(function (e) {
      e.stopPropagation();
      changeSymbol(sym);
    });
    
    order_type_select.click(function (e) {
      e.stopPropagation();
      var o = order_type_select.val();
      if (o === "market") {
        item.find("#pi_limit_div").hide('fast');
      }
      else if (o === "limit" || o === "stop") {
        item.find("#pi_limit_div").show('fast');
      }
    });
    
    item.find("#pi_sell").click(function (e) {
      e.stopPropagation();
      var order_type = order_type_select.val();
      if (order_type === "market") {
        sell(sym, item.find("#pi_sell_shares").val(), stock_data[sym][today].close);
      }
      else if (order_type === "limit") {
        addPendingOrder("sell_limit", sym, item.find("#pi_limit_price").val(), item.find("#pi_sell_shares").val());
      }
      else if (order_type === "stop") {
        addPendingOrder("sell_stop", sym, item.find("#pi_limit_price").val(), item.find("#pi_sell_shares").val());
      }
    });
    
    item.find("#pi_sell_shares").click(function (e) {
      e.stopPropagation();
    });
    
    item.find("#pi_limit_price").click(function (e) {
      e.stopPropagation();
    });

    item.hover(
      function () { item.addClass("ui-state-hover"); },
      function () { item.removeClass("ui-state-hover"); }
    );

    $("#security_list").prepend(item);
  }
  
  function sell(sym, num_shares, price) {
    price = price - calculate_commission(price);
    if (sym in portfolio) {
      // Parse input
      var shares;
      if (num_shares === "") {
        shares = portfolio[sym][0].shares;
      }
      else if (parseInt(num_shares, 10) > portfolio[sym][0].shares) {
        shares = portfolio[sym][0].shares;
      }
      else {
        shares = parseInt(num_shares, 10);
      }
      
      // Set portfolio and account values
      var profit = price * shares;
      portfolio[sym][0].shares = portfolio[sym][0].shares - shares;
      portfolio[sym][0].trades.push(["sell", shares, price]);
      //console.log(portfolio[sym][0]);
      account += profit;
      
      // Update portfolio item
      var pitem = $("#pi_"+sym);
      if (portfolio[sym][0].shares === 0) { pitem.hide('fast'); }
      pitem.find("#pi_shares").text(portfolio[sym][0].shares);
      pitem.find("#pi_value").text(formatCurrency(portfolio[sym][0].shares * price));
      $("#account").text(formatCurrency(account));
    }
  }

  function processOrders() {
    var remove_list = [];
    for (var i=0, j=pending_orders.length; i < j; i++) {
      var o = pending_orders[i],
          p;
      if (o.type === "buy_limit") {
        if (stock_data[o.symbol][today].low < o.price) {
          p = Math.min(stock_data[o.symbol][today].open, o.price);
          buy(o.shares, p);
          remove_list.push(i);
          alert("Limit order filled: "+o.symbol+" "+o.shares+" @ "+p+"/share");
          $("#po_"+o.id).remove();
        }
      }
      else if (o.type === "buy_stop") {
        if (stock_data[o.symbol][today].high > o.price) {
          p = Math.max(stock_data[o.symbol][today].open, o.price);
          buy(o.shares, p);
          remove_list.push(i);
          alert("Stop order filled: "+o.symbol+" "+o.shares+" @ "+p+"/share");
          $("#po_"+o.id).remove();
        }
      }
      else if (o.type === "sell_limit") {
        if (stock_data[o.symbol][today].high > o.price) {
          p = Math.max(stock_data[o.symbol][today].open, o.price);
          sell(o.symbol, o.shares, p);
          remove_list.push(i);
          alert("Limit sell order filled: "+o.symbol+" "+o.shares+" @ "+p+"/share");
          $("#po_"+o.id).remove();
        }
      }
      else if (o.type === "sell_stop") {
        if (stock_data[o.symbol][today].low < o.price) {
          p = Math.min(stock_data[o.symbol][today].open, o.price);
          sell(o.symbol, o.shares, p);
          remove_list.push(i);
          alert("Stop sell order filled: "+o.symbol+" "+o.shares+" @ "+p+"/share");
          $("#po_"+o.id).remove();
        }
      }
    }
    
    // Remove filled orders
    for (var i=remove_list.length-1; i >= 0; i--) {
      pending_orders.splice(i, 1);
    }
    
    // If all orders have been filled: hide pending orders pane
    if (pending_orders.length < 1) {
      $("#pending_orders_pane").hide('fast');
    }
  }
  
  

  //__________________________________________________________________________
  // Indicators
  //__________________________________________________________________________
  
  function drawActiveIndicators() {
    for (var i=0, j=active_indicators.length; i < j; i++) {
      var ind = active_indicators[i];
      ind.func.apply(this, ind.args);
    }
  }
  
  function addActiveIndicator(name, func, args) {
    active_indicators.push({ "func": func, "args": args, "id": indicator_counter });
    func.apply(this, args);
    addIndicatorToPane(name, indicator_counter);
    indicator_counter++;
  }
  
  function addIndicatorToPane(name, id) {
    var html = '<div id="ai_'+id+'" class="ui-state-default ui-corner-all">'+name+' <button id="ai_close_'+id+'"></button></div>';
    $("#active_indicators").append(html);
    $("#ai_close_"+id).button({text:false, icons:{primary:'ui-icon-closethick'}});
    $("#ai_close_"+id).click(function () {
      removeIndicator(id);
    });
    if (active_indicators.length < 2) {
      $("#active_indicators").show('fast');
    }
  }
  
  function removeIndicator(id) {
    $("#ai_"+id).remove();
    for (var i=0, j=active_indicators.length; i < j; i++) {
      if (active_indicators[i].id === id) {
        active_indicators.splice(i, 1);
        drawChart();
      }
    }
  }
  
  function makeColorSelect(id) {
    return '<select id="'+id+'" class="ui-state-default"><option value="#000000">Black</option><option value="#0000FF">Blue</option><option value="#FF0000">Red</option><option value="#00FF00">Green</option><option value="#FF9933">Orange</option><option value="#FFFF00">Yellow</option></select>';
  }

  var indicator_settings = {
    "sma": {"html": '<div>Simple Moving Average<br />Days: <input id="sma_days" size="4"></input><br />Color: '+makeColorSelect('sma_color')+'</div>',
            "click_func": function () {
                            var days = parseInt($("#sma_days").val(), 10),
                                color = $("#sma_color").val(),
                                ind_name = "SMA ("+days+")";
                            addActiveIndicator(ind_name, drawSMA, [days, color]);
                          }
           },
    "ema": {"html": '<div>Exponential Moving Average<br />Days: <input id="ema_days" size="4"></input><br />Color: '+makeColorSelect('ema_color')+'</div>',
            "click_func": function () {
                            var days = parseInt($("#ema_days").val(), 10),
                                color = $("#ema_color").val(),
                                ind_name = "EMA ("+days+")";
                            addActiveIndicator(ind_name, drawEMA, [days, color]);
                          }
           },
    "donchian": {"html": '<div>Donchian Channel<br />Days: <input id="d_days" size="4"></input><br />High Color: '+makeColorSelect('hi_color')+'<br />Low Color: '+makeColorSelect('lo_color')+'</div>',
            "click_func": function () {
                            var days = parseInt($("#d_days").val(), 10),
                                hi_color = $("#hi_color").val(),
                                lo_color = $("#lo_color").val(),
                                ind_name = "Donchian Channel ("+days+")";
                            addActiveIndicator(ind_name, drawDChannel, [days, hi_color, lo_color]);
                          }
           }
  };
  
  function show_indicator_settings() {
    var is_elem = $("#indicator_settings"),
        indicator = $("#indicator_select").val();
    is_elem.append(indicator_settings[indicator].html);
    is_elem.append('<button id="is_cancel">Cancel</button><button id="is_apply">Apply</button>');
    $("#is_apply").button();
    $("#is_cancel").button();
    $("#indicator_settings").show('fast');
    $("#is_apply").click(function () {
      indicator_settings[indicator].click_func();
      is_elem.empty();
      is_elem.hide('fast');
    });
    $("#is_cancel").click(function () {
      is_elem.empty();
      is_elem.hide('fast');
    });
  }

  $("#add_indicator").click(function () {
    var is_elem = $("#indicator_settings");
    if (is_elem.children().size() === 0 ) {
      show_indicator_settings();
    }
  });
  
  $("#indicator_select").change(function () {
    var is_elem = $("#indicator_settings");
    if (is_elem.children().size() > 0) {
      is_elem.empty();
      is_elem.hide('fast');
      show_indicator_settings();
    }
  });
  
  function average(price_list, ohlcv) {
    var s = 0;
    for (var i=0, l=price_list.length; i < l; i++) {
      s += price_list[i][ohlcv];
    }
    return s/price_list.length;
  }
  
  function drawSMA(days, color) {
    var o = getAdjustments(),
        sma_data = [],
        end = chart_length + today;
    for (var i=end; i >= today; i--) {
      sma_data.push(average(data.slice(i, i+days), 'close'));
    }
    drawaLine(sma_data, o, color);
  }  
  
  function drawEMA(days, color) {
    var o = getAdjustments(),
        ema_data = [],
        end = chart_length + today,
        multiple = 2 / (days + 1),
        ema = average(data.slice(end, end+days), 'close');
    for (var i=end; i >= today; i--) {
      ema = ((data[i].close - ema)*multiple) + ema;
      ema_data.push(ema);
    }
    drawaLine(ema_data, o, color);
  }
  
  function drawDChannel(days, high_color, low_color) {
    var o = getAdjustments(),
        end = chart_length + today,
        hi_data = [],
        lo_data = [],
        hi = 0,
        lo = 1000000,
        slice;
    for (var i=end; i >= today; i--) {
      slice = data.slice(i, i+days);
      for (var j=0; j < days; j++) {
        if (slice[j].high > hi) {
          hi = slice[j].high;
        }
        if (slice[j].low < lo) {
          lo = slice[j].low;
        }
      }
      hi_data.push(hi);
      lo_data.push(lo);
      hi = 0;
      lo = 1000000;
    }
    drawaLine(hi_data, o, high_color);
    drawaLine(lo_data, o, low_color);
  }
  
  function drawaLine(data_list, o, color) {
    c.beginPath();
    c.strokeStyle = color;
    var end = o.end, low = o.low, high = o.high,
        height_mul = o.height_mul,
        width_mul = width / chart_length,
        center = width / (chart_length * 4);

    // draw line
    c.moveTo(0, 
             height - (height_mul * (data_list[data_list.length]-low)));
    for (var i=0, l=data_list.length; i < l; i++) {
      c.lineTo((i-1)*width_mul + center, 
               height - (height_mul * (data_list[i]-low)));
    }
    c.stroke();
  }

  $("#clear_trendlines").click(function () {
    drawChart();
  });
  
  
  
  //__________________________________________________________________________
  // Trendline Drawing
  //__________________________________________________________________________
  
  $("#chart").mousedown(function (e) {
  var offset = $("#chart").offset(),
      container = chart.parentNode,
      canvas = document.createElement('canvas'),
      begin_x = e.pageX - offset.left,
      begin_y = e.pageY - offset.top,
      sketch_context = canvas.getContext("2d");
    canvas.id = 'sketch';
    canvas.width = chart.width;
    canvas.height = chart.height;
    container.appendChild(canvas);
  
    $("#sketch").mousemove(function (e) {
      var x = e.pageX - offset.left,
          y = e.pageY - offset.top;
      sketch_context.clearRect(0, 0, canvas.width, canvas.height);
      sketch_context.beginPath();
      sketch_context.moveTo(begin_x, begin_y);
      sketch_context.lineTo(x, y);
      sketch_context.stroke();
    });
  
    $("#sketch").mouseup(function (e) {
      var x = e.pageX - offset.left,
          y = e.pageY - offset.top;
      c.strokeStyle = "#000";
      c.beginPath();
      c.moveTo(begin_x, begin_y);
      c.lineTo(x, y);
      c.stroke();
      $("#sketch").remove();
    });
  });

  
  
  //__________________________________________________________________________
  // Data Retrieval
  //__________________________________________________________________________
  
  function changeSymbol(sym) {
    sym = sym.toUpperCase();
    if (sym in stock_data) {
      data = stock_data[sym];
      symbol = sym;
      addRecentlyViewed(sym);
      $("#symbol_name").text(sym);
      drawChart();
    }
    else {
      //console.log("Downloading...");
      var date = new Date(),
          url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D'http%3A%2F%2Fichart.finance.yahoo.com%2Ftable.csv%3Fs%3D" + sym + "%26d%3D"+(date.getMonth()+1)+"%26e%3D"+date.getDate()+"%26f%3D"+date.getFullYear()+"%26g%3Dd%26a%3D0%26b%3D2%26c%3D1962%26ignore%3D.csv'&format=json&callback=?";
      
      $("#symbol_name").text("Loading...");
      
      $.getJSON(url, function (result) {
        //col0=Date, col1=Open, col2=High, col3=Low, col4=Close, col5=Volume, col6=Adj Close
        // result_data[0] = headers, result_data[1:] = data, most recent first
        var result_data = result.query.results.row.slice(1);
        
        // Handle invalid symbol
        if (result_data[0].col0.indexOf('404 Not Found') >= 0) {
          alert("Symbol not found");
          $("#symbol_name").text(symbol);
        }
        else {
          // Format result_data to change col1->open, col2->high, ...
          data = new Array(result_data.length - 1);
          for (var i=0, j=data.length; i < j; i++) {
            data[i] = {open:   parseFloat(result_data[i].col1),
                      high:   parseFloat(result_data[i].col2),
                      low:    parseFloat(result_data[i].col3),
                      close:  parseFloat(result_data[i].col4),
                      date:   result_data[i].col0,
                      volume: parseFloat(result_data[i].col5) };
          }
          $("#symbol_name").text(sym);
          symbol = sym;
          addRecentlyViewed(sym);
          stock_data[sym] = data;
          drawChart();
        }
      //console.log(data.slice(today,today+10));
      });
    }
  }


  
  //__________________________________________________________________________
  // Chart drawing (Candlestick, Bar, OHLC, HLC, Line)
  //__________________________________________________________________________

  function clear_canvas() {
    c.clearRect(0, 0, width, height);
    vol_c.clearRect(0, 0, width, volume_height);
  }

  function drawChart() {
    chart_styles[chart_style]();
    drawActiveIndicators();
    var t = data[today];
    $("#today_date").text(t.date);
    $("#today_open").text(t.open);
    $("#today_high").text(t.high);
    $("#today_low").text(t.low);
    $("#today_close").text(t.close);
  }

  function getAdjustments() {
    var end = today + chart_length,
        low = data[today].low,
        high = data[today].high,
        vol_high = data[today].volume;
    
    // get lowest low and highest high
    for (var i = today; i < end; i++) {
      if (data[i].low < low) { low = data[i].low; }
      if (data[i].high > high) { high = data[i].high; }
      if (data[i].volume > vol_high) { vol_high = data[i].volume; }
    }

    // get multipliers
    var height_mul = (height) / (high - low),
        width_mul = width / chart_length;

    return {"end": end,
            "low": low,
            "high": high,
            "height_mul": height_mul,
            "width_mul": width_mul,
            "vol_high": vol_high };
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
    var mul = height / 6,
        diff = (a.high-a.low) / 6;
    c.fillStyle = "#000";
    c.font = 'italic 15px sans-serif';
    c.textAlign = "right";
    for (var i=0; i<6; i++) {
      var p = (a.low+(diff*i)).toFixed(2);
      c.fillText(p, width-5, height-(i*mul)-2);
    }
  }

  function drawVolume(a) {
    var end = a.end,
        vol_high = a.vol_high,
        width_mul = a.width_mul,
        body_width = width / (chart_length * 2),
        v_height = volume_height,
        d, v;
    vol_c.fillStyle = "#000";
    vol_c.font = 'italic 15px sans-serif';
    vol_c.textAlign = "right";
    vol_c.fillText(vol_high, width-10, 15);
    for (var i=today; i < end; i++) {
      d = data[i];
      v = (d.volume/vol_high)*v_height;
      if (d.open < d.close) { vol_c.fillStyle = "#555"; }
      else { vol_c.fillStyle = "#888"; }
      vol_c.fillRect( width + ((today-i-1)*width_mul),
                      volume_height - v,
                      body_width,
                      v_height );
    }
  }

  function drawCandle() {
    var a = getAdjustments(),
        end = a.end,
        low = a.low,
        high = a.high,
        height_mul = a.height_mul,
        width_mul = a.width_mul,
        body_width = width / (chart_length * 2),
        wick_center = (body_width / 2) - 1,
        d;
    
    clear_canvas();
    drawHorizontalLines();
    
    for (var i=today; i < end; i++) {
      d = data[i];
      c.fillStyle = "#000";
      c.fillRect(width + ((today-i-1)*width_mul) + wick_center,
                 height - (height_mul * (d.low-low)),
                 2,
                 (height_mul * (d.low - d.high)));
      if (d.open < d.close) { c.fillStyle = up_color; }
      else { c.fillStyle = down_color; }
      c.fillRect(width + ((today-i-1)*width_mul),
                 height - (height_mul * (d.open-low)),
                 body_width,
                 (height_mul * (d.open - d.close)));
    }
    drawPriceLabels(a);
    drawVolume(a);
  }

  function drawBar() {
    var a = getAdjustments(),
        end = a.end,
        low = a.low,
        high = a.high,
        height_mul = a.height_mul,
        width_mul = a.width_mul,
        body_width = width / (chart_length * 2),
        d;
    
    clear_canvas();
    drawHorizontalLines();
    
    for (var i=today; i < end; i++) {
      d = data[i];
      if (d.open < d.close) { c.fillStyle = up_color; }
      else { c.fillStyle = down_color; }
      c.fillRect(width + ((today-i-1)*width_mul),
                 height - (height_mul * (d.open-low)),
                 body_width,
                 height);
    }
    drawPriceLabels(a);
    drawVolume(a);
  }

  function drawOHLC() {
    var a = getAdjustments(),
        end = a.end,
        low = a.low,
        high = a.high,
        height_mul = a.height_mul,
        width_mul = a.width_mul,
        body_width = width / (chart_length * 2),
        wick_center = (body_width / 2) - 1,
        d;
    
    clear_canvas();
    drawHorizontalLines();
    
    c.fillStyle = "#000";
    for (var i=today; i < end; i++) {
      d = data[i];
      c.fillRect(width + ((today-i-1)*width_mul) + wick_center,
                 height - (height_mul * (d.low-low)),
                 2,
                 (height_mul * (d.low - d.high)));
      c.fillRect(width + ((today-i-1)*width_mul),
                 height - (height_mul * (d.open-low)),
                 wick_center,
                 2);
      c.fillRect(width + ((today-i-1)*width_mul) + wick_center + 2,
                 height - (height_mul * (d.close-low)),
                 wick_center,
                 2);
    }
    drawPriceLabels(a);
    drawVolume(a);
  }

  function drawHLC() {
    var a = getAdjustments(),
        end = a.end,
        low = a.low,
        high = a.high,
        height_mul = a.height_mul,
        width_mul = a.width_mul,
        body_width = width / (chart_length * 2),
        wick_center = (body_width / 2) - 1,
        d;
    
    clear_canvas();
    drawHorizontalLines();
    
    c.fillStyle = "#000";
    for (var i=today; i < end; i++) {
      d = data[i];
      c.fillRect(width + ((today-i-1)*width_mul) + wick_center,
                 height - (height_mul * (d.low-low)),
                 2,
                 (height_mul * (d.low - d.high)));
      c.fillRect(width + ((today-i-1)*width_mul) + wick_center + 2,
                 height - (height_mul * (d.close-low)),
                 wick_center,
                 2);
    }
    drawPriceLabels(a);
    drawVolume(a);
  }

  function drawLine() {
    var a = getAdjustments(),
        end = a.end,
        low = a.low,
        high = a.high,
        height_mul = a.height_mul, 
        width_mul = a.width_mul;

    clear_canvas();
    drawHorizontalLines();

    // draw line
    c.beginPath();
    c.strokeStyle = "#000";
    c.moveTo(width - ((end-today+1)*width_mul) + (width_mul / 4) - 1, 
             height - (height_mul * (data[end].close-low)));
    for (var i = end; i >= today; i--) {
      c.lineTo(width - ((i-today+1)*width_mul) + (width_mul / 4) - 1, 
               height - (height_mul * (data[i].close-low)));
    }
    c.stroke();
    drawPriceLabels(a);
    drawVolume(a);
  }

}


$(document).ready(function() {
  "use strict";
  newChart("IBM");
});

