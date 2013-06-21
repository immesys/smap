var smaputil = smaputil || {} 
 
smaputil.getMetadata = function(uuids, fields, callback){
  var tag_clause
  if (typeof uuids == 'object'){
    where = "uuid='" + uuids.join("' or uuid='") + "'"
  } else {
    where = "uuid='" + uuids +  "'"
  }
  if (typeof fields == 'object') {
    tag_clause = fields.join(', ')
  } else if (typeof fields == 'string') {
    tag_clause = fields  
  }
  var query = "select " + tag_clause + " where " + where
  $.ajax({
    url: url,
    type: "post",
    data: query,
    success: function(res){
      callback(res)
    }
  });
}

smaputil.getStreamData = function(uuids, start, end, callback){
  var where
  if (typeof uuids == 'object'){
    where = "uuid='" + uuids.join("' or uuid='") + "'"
  } else {
    where = "uuid='" + uuids +  "'"
  }
  var query = "select data in (" + start.toString() + "," + end.toString() + ") limit 100000 where " + where;
  $.ajax({
    url: url,
    type: "post",
    data: query,
    success: function(data){
      callback(data)
    }
  });
}

smaputil.smaptod3 = function(data){
  return _.map(data, function(d) {
    return _.map(d.Readings, function(el){
      return {"timestamp": el[0], "reading": el[1]}
    });
  });
}

