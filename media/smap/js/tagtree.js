
function tag_escape(x){
  return x.replace('"', '\\\"');
}

function makeTagTree(div, tree_order, selectcb, deselectcb) {
 $(function() {
     var last_selected = [];
     var separator = '/';

     function getTag(ob) {
       if ($.type(ob) == 'string') {
         return ob;
       } else if ("tag" in ob) {
         return ob.tag;
       } else if ("prefixTag" in ob) {
         return ob.prefixTag;
       }
     }

     function isPrefixTree() {
       return $.type(tree_order[tree_order.length-1]) == 'object' &&
         "prefixTag" in tree_order[tree_order.length-1];
     }

     function buildClauses(p, node) {
        var clauses = [];
        for (var i = 0; i < Math.min(p.length, tree_order.length); i++) {
          if ($.type(tree_order[i]) == "string") {
            clauses.push(tree_order[i] + " = \"" + tag_escape(p[i]) + '"');
          } else if ("tag" in tree_order[i]) {
            clauses.push(tree_order[i].tag + " = \"" + tag_escape(p[i]) + '"');
            if ("restrict" in tree_order[i]) {
              clauses.push('(' + tree_order[i].restrict + ')');
            }
          }
        }
        if (p.length >= tree_order.length && isPrefixTree()) {
          // if we're off the end of a prefix tree, condition on the
          // part of the prefix we've at now.
          var finalsep = $(node).hasClass("jstree-leaf") ? '' : separator + "%";
          clauses.push('(' + tree_order[tree_order.length - 1].prefixTag + " like \"" + 
                       tag_escape(separator + p.slice(tree_order.length-1).join(separator)) + 
                       finalsep + "\")");
        }
        if (p.length == 0 && $.type(tree_order[0]) == "object" && 
            "restrict" in tree_order[0]) {
          clauses.push('(' + tree_order[0].restrict + ')');          
        }
       if (p.length + 1 < tree_order.length) {
          clauses.push('(has ' + getTag(tree_order[p.length + 1]) + ')');
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
           new_selection.push([p, this]);
         });

       $(last_selected).each(
         function () {
           for (var i = 0; i < new_selection.length; i++) {
             if (this[0].toString() == new_selection[i][0].toString()) {
               return;
             }
           }
           deselectcb(this[0]);
         });

       $(new_selection).each(
         function () {
           var p = this[0];
           var node = this[1];
           var query = 'select distinct uuid ';

           for (var i = 0; i < last_selected.length; i++) {
             if (this.toString() == last_selected[i].toString()) {
               return;
             }
           }
           var clauses = " where " + buildClauses(p, node);
           if ($.type(tree_order[p.length - 1]) == "object" &&
               "defaultSubStream" in tree_order[p.length - 1]) {
             if (tree_order[p.length - 1].defaultSubStream != '') {
               clauses += " and (" + tree_order[p.length - 1].defaultSubStream + ")";
             }
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
                 if (p.length < tree_order.length ||
                     (p.length >= tree_order.length && isPrefixTree(tree_order))) {
                   if ($.type(tree_order[p.length]) == "string") {
                     query += tree_order[p.length];
                   } else if (p.length >= tree_order.length - 1 &&
                             "prefixTag" in tree_order[tree_order.length-1]) {
                     query += tree_order[tree_order.length-1].prefixTag;
                   } else if ("tag" in tree_order[p.length]) {
                     query += tree_order[p.length].tag;
                   }
                   var clauses = buildClauses(p, n);
                   if (clauses.length)
                     query += " where " + clauses;
                   console.log(query);
                   return query;
                 }
               },
               "success" : function (resp, status, req, node) {
                 var obj = eval(resp);
                 var rv = [];
                 var p = $(div).jstree("get_path", node);
                 p = (p == false) ? 0 : p.length;
                 if (p < tree_order.length - 1 || !isPrefixTree()) {
                   // write tree nodes for the non-prefix-tree portion of the tree
                   var sortfn = ($.type(tree_order[p]) == "object" &&
                                 "sortfn" in tree_order[p]) ? tree_order[p].sortfn : undefined;
                   obj.sort(sortfn);
                   var state = p == tree_order.length - 1 ? false : "closed";
                   var icon = (!state || ($.type(tree_order[p]) == "object" &&
                                          "defaultSubStream" in tree_order[p])) ? 
                     "/media/smap/img/plotable.png" :
                     "/media/smap/img/collection.png";
                   for (i = 0; i < obj.length; i++) {
                     rv[i] = {"data" : {
                                "title": obj[i], 
                                "icon": icon,
                              },
                              "state": state};
                   }
                 } else if (isPrefixTree()) {
                   // build a prefix tree 
                   var level = p - tree_order.length + 1 + 1;
                   var tags = {};
                   var sortfn = ($.type(tree_order[tree_order.length - 1]) == "object" &&
                                 "sortfn" in tree_order[tree_order.length - 1]) ? 
                     tree_order[tree_order.length - 1].sortfn : undefined;

                   // we're in a prefix tree... 
                   // find the distinct tags, and decide if they are open or closed
                   for (i = 0; i < obj.length; i++) {
                     var cmps = obj[i].split(separator);
                     if (cmps.length >= level) {
                       var thisstate = cmps.length > level + 1 ? "closed" : false;
                       // console.log("checking " + cmps[level] + " " + tags[cmps[level]]);
                       if (tags[cmps[level]] == undefined ||
                           tags[cmps[level]] == false) {
                         tags[cmps[level]] = thisstate;
                       }
                     }
                   }

                   // write back the consolidated tag values
                   for (var tv in tags) {
                     rv[rv.length] = {"data" : {
                                        "title" : tv,
                                        "icon" : "/media/smap/img/plotable.png",
                                      },
                                      "state": tags[tv]};
                   }
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
