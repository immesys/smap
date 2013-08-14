function VQuery(url, callback){
  var that = this;

  this.genConstraint = function(excludeLast){
    var constraint = '';
    var first = true;
    var tags = [];
    var vals = [];
    var ops = [];
      
    $('.vq-constraint-tag').each(function(){
      tags.push($(this).val());
    });

    $('.vq-constraint-val').each(function(){
      vals.push($(this).val());
    });

    $('.vq-constraint-op-btn').each(function(){
      ops.push($(this).text());
    });

    if (excludeLast){
      tags.pop(); vals.pop(); ops.pop(); 
    }
    _.zip(tags, ops, vals).forEach(function(d){
      var and = '';
      var not = '';
      if (d[1] == '≠') { 
        not = 'not ';
        d[1] = '=';
      }
      if (!first) and = 'and ';
      first = false;
      constraint += and + not + d[0] + d[1] + "'" + d[2] + "' ";
    });
    if (constraint!='') constraint = "where " + constraint;
    return constraint;
  };

  this.initConstraint = function(id){
    $('#vq-constraint-op-'+id).click(function(){
      var txt = $(this).text();
      if (txt == "="){
        $(this).text("≠");
      } else if (txt=="≠"){
        $(this).text("~");
      } else{
        $(this).text("=");
      }
    });

    $('#vq-constraint-val-'+id).focus(function(){
      var val = $(this).val();
      var tag = $('#vq-constraint-tag-'+id).val()
      var query = "select distinct " + tag  + " " + that.genConstraint(true);
      console.log(query)
      $.ajax({
        url: url,
        type: "post",
        data: query,
        success: function(data){
          var auto = $('#vq-constraint-val-'+id).typeahead();
          auto.data('typeahead').source = data;
        }
      });
    });
  };
    
  $('#vquery').html(' \
      <div id="vq-constraints"> \
        <div id="vq-constraint-cont-0" class="vq-constraint-row"> \
          <input id="vq-constraint-tag-0" class="vq-constraint-tag typeahead" type="text" value="Metadata/SourceName"> \
          <button id="vq-constraint-op-0" class="vq-constraint-op-btn btn">=</button> \
          <input id="vq-constraint-val-0" class="vq-constraint-val typeahead" type="text"> \
        </div> \
      </div> \
      \
      <div id="vq-search-row"> \
        <button id="vq-search" style="float:right;" data-loading-text="Loading...." class="btn"> \
          <i class="icon-search"></i> Search \
        </button> \
        <button id="vq-add-constraint" style="float:right;" class="btn"> \
          <i class="icon-plus"></i>  Add constraint\
        </button> \
      </div> \
      <br style="clear:both;">\
  ');
 
  $('#vq-add-constraint').click(function(){
    var constr_row = '';
    var cont_id = 'vq-constraint-cont-' + enum_id;
    var tag_id = 'vq-constraint-tag-' + enum_id;
    var op_id = 'vq-constraint-op-' + enum_id;
    var and_or_id = 'vq-constraint-and-or-' + enum_id;
    var val_id = 'vq-constraint-val-' + enum_id;
    var rem_id = 'vq-remove-' + enum_id;
    constr_row += "<div id='" + cont_id + "' class='vq-constraint-row'>\n"
    constr_row += "<input id='" + tag_id + "' class='vq-constraint-tag typeahead' type='text'>\n"
    constr_row += "<button id='" + op_id + "' class='vq-constraint-op-btn btn'>=</button>\n"
    constr_row += "<input id='" + val_id + "' class='vq-constraint-val typeahead' type='text'>\n"
    constr_row += "<button id='" + rem_id + "' class='vq-remove-btn btn'><i class='icon-minus'></i></button>\n"
    constr_row += "</div>\n"
    $('#vq-constraints').append(constr_row);

    $('#'+rem_id).click(function(){
      $('#'+cont_id).remove()
    });

    var tag_query = "select distinct " + that.genConstraint(true);

    $.ajax({
      url: url,
      type: "post",
      data: tag_query,
      success: function(res){
        var auto = $('#'+tag_id).typeahead();
        auto.data('typeahead').source = res;
      }
    });

    $('#'+tag_id).focus();
    that.initConstraint(enum_id);
    enum_id += 1;
  });
    
  $('#vq-search').click(function(){
// var query = "select * " + that.genConstraint(false);
// hack to get metadata, uuid, readings in one query
    var query = "apply null to data before now limit 1 " + that.genConstraint(false);
    console.log(query)
    $(this).button('loading');
    $.ajax({
      url: url,
      type: "post",
      data: query,
      success: function(data){
        callback(data);
        $('#vq-search').button('reset');
      },
      failure:  function(){ console.log("query failure"); }
    });
  });
    
  this.initConstraint(0);
  $.ajax({
    url: url,
    type: "post",
    data: "select distinct",
    success: function(res){
      var auto = $('#vq-constraint-tag-0').typeahead();
      auto.data('typeahead').source = res
    }
  });
  $('#vq-constraint-val-0').focus();
}
