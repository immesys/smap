/* Stream Class - Get a data stream */
Stream = function(stream_id) {
  this.stream = stream_id;
  this.first_time = -1;
  this.last_time = -1;

  var substreams = 0;
  var name = stream_id.toString();
  var units = "Unknown";
  $.ajax({
    url: "/smap/meta/" + escape(this.stream),
    async: false,
    dataType: "json",
    error: function(jqXHR, textStatus, errorThrown) {
      debug(textStatus);
    },
    success: function(data) {
      substreams = data["ResampledStreams"].length;
      units = $.trim(data["UnitofMeasure"]);
      name = $.trim(data["Path"]);
      if (units_map != undefined && units_map[units] != undefined)
        units = units_map[units];
      if (name_map != undefined && name_map[name] != undefined) name = name_map[name];
      name = name.substring(name.lastIndexOf('/')+1);
      if (name_map != undefined && name_map[name] != undefined) name = name_map[name];
    }
  });
  this.substreams = substreams;
  this.name = name;
  this.units = units;
}
Stream.prototype.getData = function(start, end, substream) {
  var query = "/smap/data/" +escape(this.stream) + "/" + substream +
    "/?start=" + escape(start) +
    "&end=" + escape(end)  +
    "&timefmt=js";
  debug(query);

  var timeout = 3000;

  ret = null;
  $.ajax({
    url: query,
    timeout: timeout,
    async: false,
    dataType: "json",
    error: function(jqXHR, textStatus, errorThrown) {
      console.log("error");
      //debug(textStatus);
    },
    success: function(data) {
      ret = data;
    }
  });

  if (ret == null || ret.length == 0) return [];

  this.first_time = ret[0][0];
  this.last_time = ret[ret.length - 1][0];
  return ret;
}

Stream.prototype.getLatest = function() {
  var substream = 0;
  var query = "/db/iter/" + escape(this.stream) + "/" + substream +
    "/prev/9999999999";
  var timeout = 3000;

  ret = null;
  $.ajax({
    url: query,
    timeout: timeout,
    async: false,
    dataType: "json",
    error: function(jqXHR, textStatus, errorThrown) {
      debug(textStatus);
    },
    success: function(data) {
      ret = data;
    }
  });

  if (ret == null) return null;
  return ret[0][0];
}
  

TreeStream = function(tree_id, name, units, mult) {
  this.tree_id = tree_id;
  this.name = name;
  this.units = units;
  this.substreams = 0;
  this.mult = null;
  if (mult != undefined) this.mult = mult;

  this.last_start = -1;
  this.last_end = -1;
  this.last_data = [];
}
TreeStream.prototype.getData = function(start, end, substream) {
  var substream = 0;
  var ret = [];
  if (this.last_end != -1 && this.end > this.last_end) {
    ret = this.last_data;
    start = this.last_end;
  }

  //if (end - start > 4*60*60) start = end - 4*60*60;
  if (end - start > 1*60*60) start = end - 1*60*60;

  var query = "/smap/plottree/" +escape(this.tree_id) + "/data.json?" +
    "starttime=" + escape(start) +
    "&endtime=" + escape(end)  +
    "&substream=" + escape(substream);
  debug(query);

  var timeout = 3000;
  var mult = this.mult;
  $.ajax({
    url: query,
    timeout: timeout,
    async: false,
    dataType: "json",
    error: function(jqXHR, textStatus, errorThrown) {
      debug(textStatus);
    },
    success: function(data) {
      for (i in data) {
        data[i][0] = data[i][0] * 1000;
        if (mult != null) data[i][1] = data[i][1] * mult;
        ret.push(data[i]);
      }
    }
  });
  this.last_end = end;
  this.last_data = ret;
  return ret;
}
