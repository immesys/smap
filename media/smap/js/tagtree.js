
function tag_escape(x){
  return x.replace('"', '\"');// escape(x).replace(/\//g, '__');
}

function makeTagTree(div, tree_order, selectcb, deselectcb) {
 $(function() {
     var last_selected = [];

     function buildClauses(p) {
        var clauses = [];
        for (var i = 0; i < p.length; i++) {
          if ($.type(tree_order[i]) == "string") {
            clauses.push(tree_order[i] + " = \"" + tag_escape(p[i]) + '"');
          } else {
            clauses.push(tree_order[i].tag + " = \"" + tag_escape(p[i]) + '"');
            if ("restrict" in tree_order[i]) {
              clauses.push('(' + tree_order[i].restrict + ')');
            }
          }
        }
        if (p.length == 0 && $.type(tree_order[0]) == "object" && 
            "restrict" in tree_order[0]) {
          clauses.push('(' + tree_order[0].restrict + ')');          
        }
        return clauses.join(" and ");
     }

     function updateSelection() {
       var uuids = [];
       var new_selection = [];
       $($(div).jstree("get_selected")).each(
         function () {
           var p = $(div).jstree("get_path", this);
           // ignore non-leaves
           if (p.length < tree_order.length &&
               ($.type(tree_order[p.length - 1]) == "string" ||
                ($.type(tree_order[p.length - 1]) == "object" &&
                 !("defaultSubStream" in tree_order[p.length - 1])))) return;
           new_selection.push(p);
         });

       $(last_selected).each(
         function () {
           for (var i = 0; i < new_selection.length; i++) {
             if (this.toString() == new_selection[i].toString()) {
               return;
             }
           }
           deselectcb(this);
         });

       $(new_selection).each(
         function () {
           var p = this;
           var query = 'select distinct uuid ';

           for (var i = 0; i < last_selected.length; i++) {
             if (this.toString() == last_selected[i].toString()) {
               return;
             }
           }
           var clauses = " where " + buildClauses(p);
           if ($.type(tree_order[p.length - 1]) == "object" &&
               "defaultSubStream" in tree_order[p.length - 1]) {
             if (tree_order[p.length - 1].defaultSubStream != '') {
               clauses += " and (" + tree_order[p.length - 1].defaultSubStream + ")";
             }
           } else if (p.length > tree_order.length) {
             return;
           }
           console.log(query + clauses);

           $.post("/backend/api/query", query + clauses,
                 function (resp) {
                   var obj = eval(resp);
                   seriesLabel = undefined;
                   if ($.type(tree_order[p.length - 1]) == "object" &&
                        "seriesLabel" in tree_order[p.length - 1]) {
                     seriesLabel = tree_order[p.length - 1].seriesLabel;
                   }
                   selectcb(p, obj, seriesLabel);
                 });
           
         });
       last_selected = new_selection;
     }
     $(div)
       .jstree(
         {
           "plugins" : [ "themes", "json_data", "crrm", "ui", "ajax" ],
           "json_data" : {
             // dynamically open nodes by querying when they're opened and adding the
             // appropriate children
             "ajax" : {
               "type" : "POST",
               "url" : "/backend/api/query",
               "data" : function (n) {
                 var p = $(div).jstree("get_path", n);
                 var query = "select distinct ";
                 if (n == -1) {
                   p = [];
                 }
                 if ($.type(tree_order[p.length]) == "string") {
                   query += tree_order[p.length];
                 } else {
                   query += tree_order[p.length].tag;
                 }
                 var clauses = buildClauses(p);
                 if (clauses.length)
                   query += " where " + clauses;
                 console.log(query);
                 return query;
               },
               "success" : function (resp, status, req, node) {
                 var obj = eval(resp);
                 var rv = [];
                 var p = $(div).jstree("get_path", node);
                 p = (p == false) ? 0 : p.length;
                 var sortfn = ($.type(tree_order[p]) == "object" &&
                               "sortfn" in tree_order[p]) ? tree_order[p].sortfn : undefined;
                 obj.sort(sortfn);
                 var state = p == tree_order.length - 1 ? false : "closed";
                 var icon = (!state || ($.type(tree_order[p]) == "object" &&
                                        "defaultSubStream" in tree_order[p])) ? "/media/smap/img/plotable.png" :
                   "/media/smap/img/collection.png";
                 for (i = 0; i < obj.length; i++) {
                   rv[i] = {"data" : {
                              "title": obj[i], 
                              "icon": icon,
                              },
                            "state": state};
                 }
                 return rv;
               }
             }
           },
           "ui": {
             "select_multiple_modifier" : "shift",
           }
         })
       .bind("select_node.jstree", function(event, data) {
               updateSelection();
             })
       .bind("deselect_node.jstree", function(event, data) {
               updateSelection();
             });
   });
}
