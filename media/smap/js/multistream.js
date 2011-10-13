// -*- java -*-

var set_save = false;
var set_name = '';

function initMultistream() {
  toggleEnabled();
}

function makeTr(key, celltext) {
  var tr = document.createElement("tr");
  for (i = 0; i < celltext.length; i++) {
     var td = document.createElement("td");
     var text = document.createTextNode(celltext[i]);
     td.appendChild(text);
     tr.appendChild(td);
  }
  td = document.createElement("tr");
  makeCheckbox("stacked-" + key, "Stacked", td);
  tr.appendChild(td);
  return tr;
}

function addToSet() {
  var table = document.getElementById("streamset");
  var stream = document.getElementById("streamid");
  var select = document.getElementById("plotkey");
  var save_stream = stream.value + " - " + select.value + " - " + substream;
  if (!(save_stream in stream_set)) {
    stream_set[save_stream] = {label: stream.options[stream.selectedIndex].text + "/" + 
                               select.options[select.selectedIndex].text,
                               unit: document.getElementById("yaxisLabel").innerHTML};
    table.appendChild(makeTr(save_stream, [stream.options[stream.selectedIndex].text, 
             select.options[select.selectedIndex].text]));
  }
}

function streamsetPlot() {
  document.getElementById("streamset-save").checked = set_save;
  document.getElementById("streamset-name").value = set_name;
  for (s in stream_set) {
    document.getElementById("stacked-" + s).checked =
    stream_set[s]["stack"];
  }
  $.modal(document.getElementById("streamset-plot"), {persist: true});
  loadStreamsets();
}


function multiBuildPlot() {
  var start = new Date(document.getElementById("startDate").value);
  var end = new Date(document.getElementById("endDate").value);
  start = Math.round(start.getTime() / 1000);
  end = Math.round(end.getTime() / 1000);
  var axes = {};
  var current_axis = 1;
  var rv = [];

  document.getElementById("yaxisLabel").innerHTML = "";
  document.getElementById("yaxis2Label").innerHTML = "";
  for (s in stream_set) { 
    var stack_thisone = document.getElementById("stacked-" + s);
    var ss = s.split('-');
    var plotobj = $.extend({}, stream_set[s]);
    var this_axis;
    unit = stream_set[s]['unit'];
    if (unit in axes) {
      this_axis = axes[unit];
    } else {
      this_axis = current_axis++;
      axes[unit] = this_axis;
      if (current_axis > 3) {
        alert("Too many different units!");
      }
      if (this_axis == 1) {
        document.getElementById("yaxisLabel").innerHTML = unit;
      } else if (this_axis == 2) {
        document.getElementById("yaxis2Label").innerHTML = unit;
      }
    }

    plotobj["data"] = {stream : parseInt(ss[1]),
                       substr : parseInt(ss[2]),
                       start: start,
                       end : end};
    plotobj['yaxis'] = this_axis;
    plotobj['stack'] = stack_thisone.checked ? "true" : null;
    rv.push(plotobj);
  }
  return rv;
}

// update the plot options for this streamset
function multiStreamGo() {
  plot_mode = 1;
  updateMeta();
  for (s in stream_set) {
    stream_set[s]['stack'] = document.getElementById("stacked-" + s).checked;
  }
  // why does this change all the form values? /me is confused...
  if (document.getElementById("streamset-save").checked) {
    multiSave();
  }
  $.modal.close();
}

function multiSave() {
  var name = document.getElementById("streamset-name").value;
  if (!name) {
    alert("You must enter a name...\n");
    return;
  }
  set_name = name;
  $.post(url + 'command/multistream/' + name,
         $.toJSON(multiBuildPlot()));
}

function toggleEnabled() {
  var obj = document.getElementById("streamset-name");
  obj.readOnly = obj.readOnly ? false : true;
  set_save = !obj.readOnly;
}

function enableSave() {
  document.getElementById("streamset-name").readOnly = false;
  document.getElementById("streamset-save").checked = true;
  document.getElementById("streamset-name").value = set_name;
}

function toggleStackAll() {
  var state = document.getElementById("streamset-all").checked;
  for (s in stream_set) {
    document.getElementById("stacked-" + s).checked = state;
  }
}

function loadStreamsets() {
  $.get(url + "streamset/",
        function (data) {
          var sets = eval(data);
          var select = document.getElementById("streamset-list");
          select.options.length = 0;
          select.options.add(new Option("Load a saved stream set...", -1));
          for (i = 0; i < sets.length; i++) {
            s = sets[i];
            select.options.add(new Option(s['name'], s['id']));
          }
        });
}

function clearStreamset() {
  plot_mode = 0;
  set_save = false;
  set_name = '';
  stream_set = {};
  removeChildrenById("streamset");
}

function loadStreamset() {
  var select = document.getElementById("streamset-list");
  var id = select.value;
  clearStreamset();
  set_name = select.options[select.selectedIndex].text;
  document.getElementById("streamset-name").value = set_name;
  if (id < 0) return;
  $.get(url + "streamset/" + id,
        function (data) {
          var streams_ = eval(data);
          var table = document.getElementById("streamset");
          for (var i = 0; i < streams_.length; i++) {
            var save_stream = "0 - " + streams_[i]["streamid"] + " - " +
              streams_[i]["substr"];
            stream_set[save_stream] = {label: streams_[i]["subscription_label"] + '/' +
                                       streams_[i]["stream_label"],
                                       stack: streams_[i]["stack"] ? true : null,
                                       unit: streams_[i]["unit"]}
            table.appendChild(makeTr(save_stream, [streams_[i]["subscription_label"],
                                                   streams_[i]["stream_label"]]));
            if (streams_[i]['stack']) {
              document.getElementById("stacked-" + save_stream).checked = true;
            }
          }
        });
}
