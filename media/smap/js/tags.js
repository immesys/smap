window.enum_id = 1;
window.url = "/backend/api/query/"

function intersect_json(o){
  // find common metadata recursively
  var ks = []
  _.each(o, function(el){
    ks.push(_.keys(el))
  });
  ks = _.uniq(_.flatten(ks))
  var r = {}
  _.each(ks, function(k){
    vs = _.uniq(_.pluck(o, k))
    if (typeof vs[0] == "object") {
      var r_rec = intersect_json(vs)
      if (!$.isEmptyObject(r_rec)) {
        r[k] = r_rec  
      }
    } else if (vs.length == 1){
      r[k] = vs[0]
    }
  });
  return r
}

function genStreamTable(data){
  var html, row = '';
  data.forEach(function(d){
    try{
      var _date = new Date(d.Readings[0][0]);
      var _reading = d.Readings[0][1].toFixed(2);
    }catch(err){}
    row = "<tr class='stream-row' data-uuid='" + d.uuid + "'>";
    row += "<td class='path'>" + d.Path + "</td>";
    row += "<td class='reading'>" + _reading + "</td>";
    row += "<td class='timestamp'>" + _date + "</td>";
    row += "</tr>";
    html += row; 
  });
  return html;
}

function removeRow(){
  var row = $(this).parent().parent();
  var uuid = row.attr('id')
  var stream_uuids = _.pluck(_streams, 'uuid')
  var i = stream_uuids.indexOf(uuid)
  _streams.splice(i, 1)
  stream_uuids.splice(i, 1)
  row.remove()
  $('.stream-row #'+uuid).toggleClass("selected");
  renderCommonMetadata(stream_uuids);
}

function renderCommonMetadata(uuids){
  if (uuids.length > 0){
    smaputil.getMetadata(uuids, '*', function(res){
        var m = intersect_json(res)
        $('#common-metadata').empty();
        if (!$.isEmptyObject(m)){
          m = JSON.stringify(m, null, 4);
          $('#common-metadata').html(m);
        }
      });
    } else {
      $('#common-metadata').empty();
    }
}

function renderStreamMetadata(uuid){
  smaputil.getMetadata(uuid, '*', function(res){ 
    var m = res[0]
    $('#single-stream-metadata').empty();
    if (!$.isEmptyObject(m)){
      m = JSON.stringify(m, null, 4);
      $('#single-stream-metadata').html(m);
    }
  });
}

var vqCallback = function(data){
  var html = genStreamTable(data);
  var viewportHeight = $(window).height();
  var vqueryHeight = $('#vquery').outerHeight();
  $('#stream-div').height(viewportHeight-vqueryHeight-20);
  $('#datatable').remove();
  $('#stream-div').append(' \
    <table id="datatable" class="table table-compact table-bordered"> \
      <thead> \
        <tr> \
          <th>Path</th> \
          <th>current value</th> \
          <th>local time</th> \
        </tr> \
      </thead> \
    <tbody id="stream-list"></tbody> \
    </table>');
  $('#stream-list').html(html);
  var dtable = $('#datatable').dataTable({
    "bProcessing": true,
    "bFilter": false,
    "bPaginate": false
  });
  $('#datatable_info').remove();
  
  $('.stream-row').mouseover(function(){
    var uuid = $(this).data("uuid");
    renderStreamMetadata(uuid);
  });
  
  var uuids = _.pluck(_streams, 'uuid')
  _.each(uuids, function(u){
    $('td[data-uuid*='+u+']').toggleClass("selected")
  });

  $('.stream-row').click(function(){
    $(this).toggleClass("selected");     
    var uuid = $(this).data("uuid")
    var stream_uuids = _.pluck(_streams, 'uuid')
    if ($.inArray(uuid, stream_uuids) != -1) {
      var i = stream_uuids.indexOf(uuid)
      _streams.splice(i, 1)
      $('#'+uuid).remove()
    } else {
      var path = $(this)[0].cells[0].innerHTML
      _streams.push({'path':path, 'uuid':uuid})
      $('#paths-table tbody').append('<tr id='+uuid+'><td>'+path+'</td><td style="text-align: center"> \
         <button id="remove-' + uuid + '" class="btn btn-mini btn-remove" type="button">X</button></td></tr>')      
    }
    var paths = _.pluck(_streams, 'path')
    var uuids = _.pluck(_streams, 'uuid')
    

    renderCommonMetadata(uuids);
  
    $('#remove-'+uuid).click(removeRow)
  });
}

new VQuery(url, vqCallback);

$('#stream-div').hover(function(){
  $('#metadata-cont').hide();
  $('#single-stream-metadata-cont').fadeIn(400);
},
function(){
  $('#single-stream-metadata-cont').hide();
  $('#metadata-cont').fadeIn(400);
  $('#single-stream-metadata').empty();
});

$('#metadata-set').click(function(){
  var uuids = _.pluck(_streams, 'uuid')
  var paths = _.pluck(_streams, 'path')
  var where = "uuid='" + uuids.join("' or uuid='") + "'";
  var tag = $('#metadata-tag').val();
  var val = $('#metadata-val').val();
  var query = "set " + tag + "='" + val + "' where " + where;
  console.log(query)
  $('#confirm').modal();
  var conf_str = "Setting <code>" + tag + "='" + val + "'</code> for streams with the following paths: <br>";
  $('#modal-confirm').click(function(){
    $.ajax({
      url: url,
      type: "post",
      data: query,
      success: function(res){
        $('#confirm').modal('hide');
        $('#edit-metadata').append('<div class="alert alert-success"> \
            <strong>Success:</strong> Tags have been set. \
          </div>');
        renderCommonMetadata(uuids);
        $(".alert").delay(5000).fadeOut("slow");
      },
      error: function(err){
        $('#edit-metadata').append('<div class="alert alert-success fade"> \
            <strong>Failure:</strong>' + err + '. \
          </div>');
        $(".alert").delay(5000).fadeOut("slow");
      }
    });
  });
  $('#confirm-body').html(conf_str + "<br><pre>" + paths.join('\n') + "</pre>");
});
