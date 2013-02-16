// -*- java -*-

var datefmt = "%W %M %e, %z %H:%i:00";
var page_args = getUrlVars();

// the current stream's offset from UTC
var tz = 0;

// normally we want to repect the user's settings, but when
// initializing pick defaults.
var initializing = true;
var pending_loads = 0;
var last_render = 0;

var plot_data = {};
var current_zoom = {};

function plotInit (no_create) {

  timezoneJS.timezone.zoneFileBasePath = '/media/tz';
  timezoneJS.timezone.init();

  // set up a reasonable range by default
  if (initializing && "start" in page_args && "end" in page_args) {
    var then = new Date(page_args["start"] * 1);
    var now = new Date(page_args["end"] * 1);
  } else {
    var now = new Date();
    var then = new Date(now.getTime() - (3600 * 24 * 1000));
  }
  var converter = new AnyTime.Converter( { format: datefmt });
  document.getElementById("startDate").value = converter.format(then);
  document.getElementById("endDate").value = converter.format(now);
  if (!no_create) {
    AnyTime.picker( "startDate", 
    { format: datefmt, firstDOW: 0 } );
    AnyTime.picker( "endDate", 
    { format: datefmt, firstDOW: 0 } );  
  }

  makeChartControls();

  if ("stack" in page_args) {
    document.getElementById("stack").checked = !(page_args["stack"] == "false");
  }
}

// return the currently selected time range
function getTimeRange() {
  var start = new Date(document.getElementById("startDate").value);
  var end = new Date(document.getElementById("endDate").value);

  if (initializing && "start" in page_args) {
    start = page_args["start"]
  } else {
    start = Math.round(start.getTime() );
  }
  if (initializing && "end" in page_args) {
    end = page_args["end"];
  } else {
    end = Math.round(end.getTime());
  }
  initializing = false;
  return [start, end];
}

// this map tells what operators we know about, and when to select which one.  
// if the view range is bigger than the threshold here we'll use it.
var known_operators = ['subsample-300','subsample-3600'];
var known_operator_thresholds = [3600 * 24 * 7, 3600 * 24 * 30];

// select a substream based on the time range and available substreams
// this function is an embarrassment.
function selectSubStream(streamid, range) {
  var wsz = (range[1] - range[0]) / 1000;
  var rv = plot_data[streamid].tags.uuid;
  var best_str = -1;
  for (var i = 0; i < plot_data[streamid]["substreams"].length; i++) {
    var sstr = plot_data[streamid]["substreams"][i];
    if ("Operator" in sstr["Metadata"]["Extra"] && 
        $.inArray(sstr.Metadata.Extra.Operator, known_operators) > -1) {
      for (var j = 0; j < known_operator_thresholds.length; j++) {           
        if (wsz > known_operator_thresholds[j] && 
            j > best_str &&
            known_operators[j] == sstr.Metadata.Extra.Operator) {
          rv = sstr.uuid;
          best_str = j;
        }
      }
    }
  }
  // save what operator we're using for this stream
  if (best_str >= 0) {
    plot_data[streamid]["selected_operator"] = known_operators[best_str];
  } else {
    plot_data[streamid]["selected_operator"] = "";
  }
  return rv;
}

// change the dates in the data series "data" to be in timezone "tz".
// should be a zoneinfo timezone; this is for flot so the display ends
// up right.
function mungeTimes(data, tz) {
  if (data.length == 0) return;
  var point = new timezoneJS.Date();
  console.log('setting timezone to ' + tz);
  point.setTimezone(tz);
  point.setTime(data[0][0]);
  var offset = point.getTimezoneOffset();
  console.log('local offset is ' + offset);
  for (i = 0; i < data.length; i++) {
    data[i][0] -= offset * 60 * 1000;
  }
}

function makeSubstreamTable(streamid) {
  var substreams = plot_data[streamid]["substreams"];
  var table = "<table class=\"tag_table substream-table\">";
  table += "<tr><th>Substreams</th><td>";
  var ops = [];
  if (substreams == undefined) return "";
  for (var i = 0; i < substreams.length; i++) { 
    ops.push(substreams[i].Metadata.Extra.Operator);
  }
  ops.sort();
  for (var i = 0; i < ops.length; i ++) {
    var klass = "substream";
    if (ops[i] == plot_data[streamid]["selected_operator"]) {
      klass = "substream-selected";
    }
    var onclick = ""; // 'onclick="plot_data[\'' + streamid + "\']['selected_operator'] = '" + ops[i] + "'\"";
    table += "<a class=\"" + klass + "\" " + onclick + ">" + ops[i] + "</a>";
    if (i < ops.length - 1) table += ",&nbsp;";
  }
  table += "</td></tr></table>";
  if (ops.length) {
    return $(table);
  } else {
    return;
  }
}

function interpretTags(val) {
  return val.replace(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g, 
                     "<a href=\"/plot?streamids=$1\">$1</a>");
}

// render an html description of the tags for a stream
function makeTagTable(obj) {
  var descr = "<table class=\"tag_table\" id=\"" + obj["uuid"] + "\">";
  var keys = [];
  if ("Description" in obj) {
    descr += "<tr><th colspan=2 style=\"text-align: left\">" + obj["Description"] + "</th></tr>";
  }
  for (var key in obj) {
    if (key != "ValidTime") {
      keys.push(key);
    }
  }
  keys.sort();
  for (var idx in keys) {
    var off = 0;
    var key = keys[idx];
    descr += "<tr><td>" + key + "</td><td>" + 
      interpretTags(obj[key]) + 
      "</td></tr>";
  }
  descr += "</table>";
  return $(descr);
}

// add a stream to the current plot
function addStreams(tags, labels, n, yaxis) {
  for (var i = 0; i < labels.length; i++) { 
    labels[i] = labels[i].replace(/__/g, "/"); 
  }
  for (var i = 0; i < tags.length; i++) {
    var streamid = tags[i]["uuid"]
    plot_data[streamid] = {
      "data" : [],
      "seriesLabel" : labels,
      "yaxis" : (yaxis === undefined) ? -1 : yaxis,
      "hidden" : (i >= n),
      "data_loaded" : false,
      "tags" : tags[i],
      "label" : streamid,
    };
    console.log("addStreams " + streamid + " " + plot_data[streamid]["yaxis"]);
    if (i < n) updateMeta(streamid);
  }
}

function delStream(streamid) {
  if (streamid in plot_data) {
    delete plot_data[streamid];
    updateLegend();
    updatePlot();
  }
}

function plotterClearPlot() {
  plot_data = {};
  updateLegend();
  updatePlot();
}

function chooseAxis(streamid) {
  var y1used = false;
  // console.log("choose axis " + streamid + " " +   plot_data[streamid]["yaxis"]);

  if (!(plot_data[streamid]["yaxis"] === undefined ||
      plot_data[streamid]["yaxis"] == -1)) {
    return;
  }
  plot_data[streamid]["yaxis"] = -1;

  for (sid in plot_data) {
    if (sid == streamid)
      continue;
    if (!("tags" in plot_data[sid]))
      continue;
    
    if (plot_data[streamid]["tags"]["Properties"]["UnitofMeasure"] ==
        plot_data[sid]["tags"]["Properties"]["UnitofMeasure"]) {
      plot_data[streamid]["yaxis"] = plot_data[sid]["yaxis"];
    } else if (plot_data[sid]["yaxis"] != -1) {
      y1used = true;
    }
    // console.log(plot_data[sid]["yaxis"]);
  }
  if (plot_data[streamid]["yaxis"] == -1) {
    plot_data[streamid]["yaxis"] = (y1used) ? 2 : 1;
  }
}

function updatePermalink() {
  var range = getTimeRange();
  var start = range[0], end = range[1];
  var sArray = [], aArray = [];
  var dev = ("dev" in page_args) ? "&dev=" : "";
  for (var streamid in plot_data) {
    sArray.push(streamid);
    aArray.push(plot_data[streamid]["yaxis"]);
  }
  document.getElementById("permalink").href = 
    "/plot/" + "?streamids=" + sArray.join(',') + 
    "&start=" + start + "&end=" + end +
    "&stack=" + document.getElementById("stack").checked + 
    "&tree=" + treeidx +
    "&axes=" + aArray.join(",") + 
    dev;
}

// load the metadata for streamid "streamid" and plot
function updateMeta(streamid) {
  // load any substreams too so we can create them in the gui
  $.post(backend + "/api/query?" + private_flags,
         "select * where Metadata/Extra/SourceStream = '" + streamid + "'",
         function (data) {
           plot_data[streamid]["substreams"] = data;
           chooseAxis(streamid);
           loadData(streamid);
         }, "json");
}

// reload all data for all series
function reloadData() {
  for (var streamid in plot_data) {
    plot_data[streamid]["data_loaded"] = false;
    loadData(streamid);
  }
}

// called when the time range changes -- reload all data for a single stream
function loadData(streamid) {
  var range = getTimeRange();
  var start = range[0], end = range[1];
  var substream_id = selectSubStream(streamid, range);

  var query = backend + "/api/data/uuid/" + escape(substream_id) +
    "?starttime=" + escape(start) + 
    "&endtime=" + escape(end) +
    "&" + private_flags;
  if (plot_data[streamid]["hidden"]) {
    updateLegend();
    return;
  }

  var startLoadTime = new Date();
  pending_loads ++;
  $.get(query, 
        function() {
          var streamid_ = streamid;
          return function(resp) {
            data = eval(resp);
            var endLoadTime = new Date();
            data = data[0]['Readings'];
            plot_data[streamid_]['data'] = data;
            plot_data[streamid_]['data_loaded'] = true;
            if (data.length > 0) {
              plot_data[streamid_]['latest_timestamp'] = data[data.length - 1][0];
              mungeTimes(data, plot_data[streamid_]["tags"]["Properties"]["Timezone"]);
              plot_data[streamid_]['tags']['LoadTime'] = (endLoadTime - startLoadTime) + 
                "ms, " + data.length + " points";
              updateLegend();
              pending_loads--;
              updatePlot();
            } else {
              pending_loads--;
              plot_data[streamid_]['latest_timestamp'] = undefined;
            }
          }
        }(), "text");
  return;
}

function makeToggleFn(eltid) {
  return function() {
    $("#" + eltid).toggle();
    if ($("#" + eltid).is(":visible")) {
      $("#more_" + eltid).button({
        icons: { secondary: "ui-icon-triangle-1-n" },
        label: "Less"});
    } else {
      $("#more_" + eltid).button({
        icons: { secondary: "ui-icon-triangle-1-s" },
        label: "More"});
    }
  };
}

function makeAxisFn(eltid) {
  return function() {
    plot_data[eltid]["yaxis"] = 
      $("input:radio[name=axis_" + eltid + "]:checked").val();
    updatePlot();
  }
}

function updateCsvLink(ref) {
  var range = getTimeRange();
  var start = range[0], end = range[1];
  var query = backend + "/api/data/uuid/" + escape(ref) +
    "?starttime=" + escape(start) + 
    "&endtime=" + escape(end) + 
    "&format=csv&tags=&timefmt=iso8601" +
    "&" + private_flags;
  document.getElementById("csv_" + ref).href = query;
}

function updateLegend() {
  $("#description").empty();
  var range = getTimeRange();
  var start = range[0], end = range[1];
  var i = 0;
  for (var streamid in plot_data) {
    if (!("tags" in plot_data[streamid])) continue;
    var div = $("<div class=\"legend_item\"></div>");
    var label_pieces = [];
    tags = flatten(plot_data[streamid]['tags']);
    for (var j = 0; j < plot_data[streamid]["seriesLabel"].length; j++) {
      label_pieces.push(tags[plot_data[streamid]["seriesLabel"][j]]);
    }
    var y1checked = plot_data[streamid]["yaxis"] == 1 ? "checked" : "";
    var y2checked = plot_data[streamid]["yaxis"] == 2 ? "checked" : "";
    
    div.append("<div class=\"series_color\" style=\"background-color: " + 
                             colormap[i++] + "\"></div><div class=\"series_label\">" + 
                             "<button id=\"remove_" + streamid + "\">No Text</button>   " +
                             "<button id=\"hide_" + streamid + "\"/>   " +
                             "<span id=\"axis_" + streamid + "\" >" +
                               "<input type=\"radio\" id=\"axis_y1_" + streamid + "\" name=\"axis_" + 
                                      streamid +  "\" value=\"1\" " + y1checked + "/>" +
                               "<label for=\"axis_y1_" + streamid + "\">y1</label>" +
                               "<input type=\"radio\" id=\"axis_y2_" + streamid + "\" name=\"axis_" + 
                                      streamid + "\" value=\"2\" " + y2checked + "/>" +
                                 "<label for=\"axis_y2_" + streamid + "\">y2</label>" +
                             "</span>" +
                             "<button id=\"more_" + streamid + "\"/>   " +
                               "<a onclick=\"updateCsvLink(\'" + streamid + "\')\" "  + 
                                 "id=csv_" + streamid + " >[csv]</a>    " +
                             label_pieces.join(" :: ") + 
                             "</div>");
    div.append(makeSubstreamTable(streamid));
    div.append(makeTagTable(tags));
    div.append("<div style=\"clear: left; margin: 12px;\"></div>");

    $("#description").append(div);

    $("#axis_" + streamid).buttonset();
    $("#axis_" + streamid).click(makeAxisFn(streamid));
    $("#more_" + streamid).button({
      icons: { secondary: "ui-icon-triangle-1-s" },
      label: "More"});
    $("#more_" + streamid).click(makeToggleFn(streamid));
    $("#hide_" + streamid).button({
      label: plot_data[streamid]["hidden"] ?
               "Show" : "Hide"});
    updateCsvLink(streamid);
    $("#hide_" + streamid).click(function() {
      var streamid_ = streamid;
      return function() { 
        plot_data[streamid_]["hidden"] = plot_data[streamid_]["hidden"] ? false : true;
        $("#hide_" + streamid_).button({label: plot_data[streamid_]["hidden"] ?
                                                 "Show" : "Hide"});
        if (!plot_data[streamid_]["hidden"] && 
            !plot_data[streamid_]["data_loaded"]) {
          // loadData(streamid_);
          updateMeta(streamid_);
        } else {
          updatePlot();
        }
        return false;
      };
    }());
    $("#remove_" + streamid).button({
      icons: { primary: "ui-icon-closethick" }, text: false});
       $("#remove_" + streamid).click(function () {
         var streamid_ = streamid;
         return function () { delStream(streamid_); };
       }());
    
    $("#" + streamid).hide();
  }
  updatePermalink();
}

function updateAxisLabels() {
  var xunits = [];
  var yunits = [[], []];
  for (var streamid in plot_data) {
    if (!plot_data[streamid]["data_loaded"] || 
        plot_data[streamid]["hidden"]) continue;
    xunits.push(plot_data[streamid]['tags']['Properties']['Timezone']);
    yunits[parseInt(plot_data[streamid]['yaxis']) - 1]
      .push(plot_data[streamid]['tags']['Properties']['UnitofMeasure']);
  }

  document.getElementById("xaxisLabel").innerHTML =
    "Reading Time (" + $.unique(xunits).join(", ") + ")";
  document.getElementById("yaxisLabel").innerHTML = $.unique(yunits[0]).join(", ");
  document.getElementById("yaxis2Label").innerHTML = $.unique(yunits[1]).join(", ");
}

function makeChartControls() {
  $("#chart_controls").empty();
  $("#chart_controls").append('<input type="checkbox" id="stack" onchange="javascript: setTimeout(updatePlot, 0)">Stack</input>');
  $("#chart_controls").append('<input type="checkbox" id="autoupdate" onchange="javascript: null;">Autoupdate</input>');
  $("#chart_controls").append('<input name="select_mode" type="radio" value="zoom" onchange="javascript: updatePlot(true)" checked>Zoom' +
                              '  <input name="select_mode" type="radio" value="hover" onchange="javascript: updatePlot(true)">Hover');
}

function updatePlot(maintain_zoom) {
  var ddata = [];
  var now = (new Date()).getTime();
  if (pending_loads > 0 && 
      now - last_render < 2000) return;
  last_render = now;
  for (var streamid in plot_data) {
    if (plot_data[streamid]["hidden"]) {
      ddata.push([]);
      continue;
    }
    ddata.push({
        "data": plot_data[streamid]["data"],
        "stack" : document.getElementById("stack").checked ? true : null,
        "shadowSize" : 0,
        "yaxis" : parseInt(plot_data[streamid]["yaxis"]),
      });
  }
  
  $("#chart_div").empty();
  if (ddata.length == 0) {
    $("#yaxisLabel").empty();
    updateLegend();
  }

  updateAxisLabels();
  updatePermalink();
  var previousPoint = null;
  var previousRender = 0;
  var drawToolTip = true;
  var plot_options = {
    xaxes : [{
        mode : "time",
      }],
    yaxes : [ {}, {
        position : "right"
      }],
    lines: {
      fill: document.getElementById("stack").checked,
      lineWidth: 1,
    },
    // use matlab's colormap(lines)
    colors: colormap,
  };
  var interact_mode = $("input:radio[name=select_mode]:checked").val();
  if (interact_mode == "zoom") {
    plot_options["selection"] = { mode: "x" , color: $.color.parse("#A8A8A8") }
  } else {
    plot_options["grid"] = { hoverable: true };
  }

  // reset the zoom window
  if (!(maintain_zoom === true)) {
    current_zoom = {}
  }

  var plot = $.plot($("#chart_div"), 
                    ddata, 
                    $.extend(true, {}, plot_options, current_zoom));

  $("#tooltip").remove();
  if (interact_mode == "hover") {
    // show series values on hover.
    $("#chart_div").bind("plothover", function (event, pos, item) {
        now = new Date().getTime();
        if (item &&
            previousPoint != item.dataIndex &&
            now - previousRender > 50) {
          previousPoint = item.dataIndex;
          previousRender = now;
        
          $("#tooltip").remove();
          var x = item.datapoint[0].toFixed(2),
            y = item.datapoint[1].toFixed(2);
          var point = new timezoneJS.Date();
          // we've already munged the timestamps...
          point.setTimezone("Etc/UTC");
          point.setTime(item.datapoint[0]);
          showTooltip(item.pageX, item.pageY,
                      point.toString() + ": " + y);
        }
      });
  } else if (interact_mode == "zoom") {
    // selection is enabled, change the x range when zoomed.
    $("#chart_div").bind("plotselected", function (event, ranges) {
        current_zoom = { xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to } };
        plot = $.plot("#chart_div", ddata,
                      $.extend(true, {}, plot_options, current_zoom));
      });
  }
  $("#chart_div").bind("dblclick", function (event) {
      // unset the zoom window
      current_zoom = {};
      plot = $.plot($("#chart_div"), ddata, plot_options);
    });
}

function setEndNow() {
  var converter = new AnyTime.Converter( { format: datefmt });
  document.getElementById("endDate").value = converter.format(new Date());
}

function trimWindow() {
  var window = getTimeRange();
  var min_point;
  var max_point = 0;

  for (var streamid in plot_data) {
    max_point = (plot_data[streamid]["latest_timestamp"] > max_point) ?
      plot_data[streamid]["latest_timestamp"] : max_point;
  }
  min_point = max_point - (window [1] - window[0]);
  // advance the date controls, keeping the window size the same
  document.getElementById("startDate").value = new Date(min_point);
  document.getElementById("endDate").value = new Date(max_point);
  for (var streamid in plot_data) {
    var i;
    var window_filter = [[min_point]];
    // move the new data into the proper timezone
    mungeTimes(window_filter, plot_data[streamid]["Properties/Timezone"]);
    for (i = 0; i < plot_data[streamid]["data"].length; i++) {
      if (plot_data[streamid]["data"][i][0] >= window_filter[0][0])
        break;
    }
    if (i > 0) {
      // remove the part of the series before the window
      plot_data[streamid]["data"].splice(0, i);
    }
  }  
}

function autoUpdatePoll() {
  setTimeout(autoUpdatePoll, 1000);
  if (!$("#autoupdate").is(":checked")) return;
    
  for (var streamid in plot_data) {
    if (!(plot_data[streamid]["latest_timestamp"])) continue;
    var query = backend + "/api/data/uuid/" + escape(streamid) + 
      "?starttime=" + escape(plot_data[streamid]["latest_timestamp"]) + 
      "&direction=next&limit=10000&" + private_flags;
    $.get(query, function () {
        var streamid_ = streamid;
        return function(resp) {
          var data = eval(resp);
          data = data[0]['Readings'];
          if (!(streamid_ in plot_data)) return;
          if (data.length <= 0) return;
          plot_data[streamid_]["latest_timestamp"] = data[data.length - 1][0];
          mungeTimes(data, plot_data[streamid_]["tags"]["Properties"]["Timezone"]);
          plot_data[streamid_]['data'].push.apply(plot_data[streamid_]['data'], data);
          trimWindow();
          updatePlot();
        }
      }());
  }
}
setTimeout(autoUpdatePoll, 1000);


function showTooltip(x, y, contents) {
  $('<div id="tooltip">' + contents + '</div>').css( {
      position: 'absolute',
        display: 'none',
        top: y + 5,
        left: x + 5,
        border: '1px solid #fdd',
        padding: '2px',
        'background-color': '#fee',
        opacity: 0.80
        }).appendTo("body").fadeIn(200);
}

