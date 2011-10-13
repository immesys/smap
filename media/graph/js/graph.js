function _avgData(data) {
  var sum = 0;
  var ct = 0;
  for (i in ret) {
    sum += parseInt(data[i][1]);
    ct += 1;
  }
  return sum / ct;
}

function _formatData(data, xformatter, yformatter) {
  var ret = [];
  for (i in data) {
    var x = data[i][0];
    var y = data[i][1];
    if (typeof(xformatter) != "undefined" && xformatter != null)
      x = xformatter(x);
    if (typeof(yformatter) != "undefined" && yformatter != null)
      y = yformatter(y);

    ret[i] = [x, y];
  }
  return ret;
}

function _buildData(feeds, start, end, dataFormatter, stack) {
  var data = [];
  for (s in feeds) {
    var substream = 0;
    if (feeds[s].substreams >= 1 && end - start > 6*60*60)
      substream = 1;
    if (feeds[s].substreams >= 2 && end - start > 3*24*60*60)
      substream = 2;

    var values = feeds[s].getData(start, end, substream);
    if (!values || values.length == 0) values = [];

    data[s] = {
      label: feeds[s].name,
      data: dataFormatter(values)
    }
    if (stack) {
      data[s]['stack'] = true;
    }
  }
  return data;
}

function _barData(feeds, start, end, substream) {
  var points = [];
  var names = [];
  for (s in feeds) {
    var substream = 0;
    if (feeds[s].substreams >= 1 && end - start > 6*60*60)
      substream = 1;
    if (feeds[s].substreams >= 2 && end - start > 3*24*60*60)
      substream = 2;

    var readings = feeds[s].getData(start, end, substream);
    var val = Math.floor(_avgData(readings));
    points.push([s, val]);
    names.push([s, feeds[s].name]); 
  }
  var data = [{ data: points }];
  return [data, names];
}

function Graph(contain, feeds, type, yrange) {
  this.container = contain;
  this.feeds = feeds;
  this.type = type;
  this.plot = null;
  this.yrange = null;
  if (yrange != undefined) this.yrange = yrange;
  this.legend = true;

  if (this.type == 'ts' || this.type == 'bar' || this.type == 'stackts') {
    var graph = $("<div/>");
    graph.css({
      'position': 'relative',
      'top': '0px',
      'left': '0px',
      //'width': '100%',
      'height': '100%',
      'margin-left': '15px'
    });
    this.container = graph;

    var label = $('<div class="ylabel">' + this.feeds[0].units + '</div>');
    label.css("position", "absolute");
    label.css("top", "50%");
    label.css("left", "0px");
    label.css({rotate: '-90deg'});
    contain.append(label);
    contain.append(graph);
    label.css("left", -1*label.width()/2);
  }
}

Graph.prototype.draw = function(localStart, localEnd) {
  var start = Math.floor(time.toUTC(localStart) / 1000);
  var end = Math.floor(time.toUTC(localEnd) / 1000);

  var colors = ["#4f81bd", "#9bbb59", "#8064a2", "#4bacc6", "#f79646", "#c0504d"];
  var option = null;
  var data = null;

  if (this.type == 'pie') {
    var formatter = function(values) { return Math.floor(_avgData(values)); };
    data = _buildData(this.feeds, start, end, formatter, false);
    option = {
        series: { pie: { show: true } },
        legend: { show: true },
        grid: {
            hoverable: true,
            clickable: false
        }
    };
    this.container.bind("plothover", pieHover);

  } else if (this.type == 'bar') {
    var bardata = _barData(this.feeds, start, end);
    data = bardata[0];
    option = {
        series: { bars: { show: true, align: 'center', barWidth: 0.9 }  },
        xaxis: {ticks: bardata[1]},
        legend: { show: false }
    };

  } else if (this.type == 'ts') {
    var formatter = function(values) { return _formatData(values, time.toLocal); };
    data = _buildData(this.feeds, start, end, formatter, false);
    option = {
      series: {
        lines: { show: true, lineWidth: 2, steps: true},
        points: { show: false },
        shadowSize: 0
      },
      legend: { show: this.legend },
      xaxis: {
        min: localStart,
        max: localEnd,
        //timeformat: "%m/%d/%y",
        mode: "time"
      },
      yaxis: {
        show: true
      }
    };

  } else if (this.type == 'stackts') {
    formatter = function(values) { return _formatData(values, time.toLocal); };
    data = _buildData(this.feeds, start, end, formatter, true);
    option = {
      series: {
        lines: { show: true, lineWidth: 0, fill: true, steps: true},
        points: { show: false },
        shadowSize: 0
      },
      legend: { show: this.legend },
      xaxis: {
        min: localStart,
        max: localEnd,
        //timeformat: "%m/%d/%y",
        mode: "time"
      },
      yaxis: {
        show: true
      }
    };

  } else if (this.type == 'range') {
    var formatter = function(values) { return _formatData(values, time.toLocal, Math.log); };
    data = _buildData(this.feeds, start, end, formatter, false);
    option = {
      series: {
        lines: { show: true },
        points: { show: false },
        shadowSize: 0,
        color: 1
      },
      legend: { show: false },
      xaxis: {
        min: localEnd - 3*24*60*60*1000, 
        max: localEnd,
        mode: "time",
        timeformat: "%m/%d/%y",
        minTickSize: [1, "day"]
      },
      yaxis: { show: false }
    };

  } else {
    debug("Unknown type " + this.type);
    return;
  }

  if (this.yrange != null)
    option['yaxis'] = this.yrange;
  option['colors'] = colors;
  this.plot = $.plot(this.container, data, option);
}

Graph.prototype.drawUTC = function(start, end) {
  return this.draw(time.toLocal(start), time.toLocal(end));
}

Graph.prototype.drawLast = function(wind) {
  var end = time.serverNow();
  this.drawUTC(end-wind, end);
}

Graph.prototype.getXVal = function(xpos) {
  return this.plot.getAxes().xaxis.c2p(xpos);
}

Graph.prototype.getXPos = function(xval) {
  return this.plot.getAxes().xaxis.p2c(xval);
}

function pieHover(event, pos, obj) {
  if (!obj) return;
  var percent = parseFloat(obj.series.percent).toFixed(2);
  var value = obj.datapoint[1][0][1];
  //$("#hover").html('<span style="font-weight: bold; color: '+obj.series.color+'">'+value+' ('+percent+'%)</span>');
  $("#hover").html('<span style="font-weight: bold; color: black">'+value+' ('+percent+'%)</span>');
  $("#hover").css("top", pos.pageY);
  $("#hover").css("left", 20+pos.pageX);
}
