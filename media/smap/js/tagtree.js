
// escape tag names and values for inclusion in a query
function tag_escape(x){
  return x.replace('"', '\\\"');
}

// open a path in the tree
// path: an array of strings, one per level of the tree to open.
// nodes will be loaded if not already there

function treeOpenPath(path) {
  if (path.length) {
    var thisseg = unescape(path.shift());
    $("#__tree_div").jstree("open_node", $("#__tree_div a:containsexactly('\xA0" + thisseg + "') :parent"), 
                          function () { treeOpenPath(path); });
  }
}

// Build a tag tree
// div: jquery div selected, place to build tree
// tree_order: an array representing the tree configuration; a list of
//   level configurations
// opts: dict of extra configuration options
//  select: callback called with (path, [uuid list], label text)
//    arguments when streams are selected in the tree
//  deselect: callback called with (uuid) when a stream is deselected
//  clear: callback called when plot is cleared
//  openpath: path array to open after loading this tree
//  context_men: a jstree menu specification to add to the tree nodes
function makeTagTree(div, tree_order, opts) { 
 $(function() {
     // var last_selected = [];
     var separator = '/';

     // get the tag name a particular tree level uses
     function getTag(ob) {
       if ($.type(ob) == 'string') {
         return ob;
       } else if ("tag" in ob) {
         return ob.tag;
       } else if ("prefixTag" in ob) {
         return ob.prefixTag;
       }
       return "";
     }

     function setTag(node, tag, value) {
         var p = $("#__tree_div").jstree("get_path", node);
         var where = buildClauses(p, node);
         var query = "set " + tag + " = '" + value + "' where " + where;
         $.post(backend + "/api/query?" + private_flags, query,
                function () {
                    console.log("done setting tag " + query);
                });
     }

     function delTag(node, tag) {
         var p = $("#__tree_div").jstree("get_path", node);
         var where = buildClauses(p, node);
         var query = "delete " + tag + " where " + where;
         console.log("delete " + p + " " + tag);
         $.post(backend + "/api/query?" + private_flags, query,
                function () {
                    console.log("done deleting tag " + query);
                });
     }

     function delStream(node) {
         var p = $("#__tree_div").jstree("get_path", node);
         var where = buildClauses(p, node);
         var query = "delete " + " where " + where;
         if (confirm("Are you sure you want to delete where " + where + "?")) {
             $.post(backend + "/api/query?" + private_flags, query,
                    function () {
                        console.log("done deleting streams");
                    });
         }
     }

     function isPrefixTree() {
       return $.type(tree_order[tree_order.length-1]) == 'object' &&
         "prefixTag" in tree_order[tree_order.length-1];
     }

     // build the "where" part of a query based on a path and a
     // particular node.
     function buildClauses(p, node) {
        var clauses = [];
        for (var i = 0; i < Math.min(p.length, tree_order.length); i++) {
          if ($.type(tree_order[i]) == "string") {
            clauses.push(tree_order[i] + " = \"" + tag_escape(p[i]) + '"');
          } else if ("tag" in tree_order[i]) {
            clauses.push(tree_order[i].tag + " = \"" + tag_escape(p[i]) + '"');

            // add any restrict clauses
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
       // make sure the results have the tag for the tree level we're
       // interested in.
       if (p.length + 1 < tree_order.length) {
          clauses.push('(has ' + getTag(tree_order[p.length + 1]) + ')');
       }
       return clauses.join(" and ");
     }

     // update the list of stream uuids which are currently
     // selected in the tree.
     function updateSelection() {
       var uuids = [];
       var new_selection = [];
       $($("#__tree_div").jstree("get_selected")).each(
         function () {
           var p = $("#__tree_div").jstree("get_path", this);
           // ignore non-leaves
           if (p.length < tree_order.length &&
               ($.type(tree_order[p.length - 1]) == "string" ||
                ($.type(tree_order[p.length - 1]) == "object" &&
                 !("defaultSubStream" in tree_order[p.length - 1])))) return;
           new_selection.push([p, this]);
         });

       // $(last_selected).each(
       //   function () {
       //     for (var i = 0; i < new_selection.length; i++) {
       //       if (this[0].toString() == new_selection[i][0].toString()) {
       //         return;
       //       }
       //     }
       //     // call deselctcb on all of the streams which are no longer
       //     // selected
       //     // deselectcb(this[0]);
       //   });

       $(new_selection).each(
         // look up the tags for each newly selected stream.
         function () {
           var p = this[0];
           var node = this[1];
           var query = 'select * ';

           // for (var i = 0; i < last_selected.length; i++) {
           //   if (this.toString() == last_selected[i].toString()) {
           //     return;
           //   }
           // }
           var clauses = " where " + buildClauses(p, node);
           if ($.type(tree_order[p.length - 1]) == "object" &&
               "defaultSubStream" in tree_order[p.length - 1]) {
             if (tree_order[p.length - 1].defaultSubStream != '') {
               clauses += " and (" + tree_order[p.length - 1].defaultSubStream + ")";
             }
           }
           console.log(query + clauses);

           $.post(backend + "/api/query?" + private_flags, query + clauses,
                  function (resp) {
                   var obj = eval(resp);
                   seriesLabel = undefined;
                   if ($.type(tree_order[p.length - 1]) == "object" &&
                        "seriesLabel" in tree_order[p.length - 1]) {
                     seriesLabel = tree_order[p.length - 1].seriesLabel;
                   }
                   // trigger the select callback with the uuid
                   opts.select(p, obj, seriesLabel);
                 }, "text");
           
         });
//       last_selected = new_selection;
     }
     $(div).append($("<input/>", {
         type: "button",
         value: "Plot selected",
         id: "__plot_selected"}));
     $(div).append($("<div/>", {
         id: "__tree_div" }));
     $("#__plot_selected").button();
     $("#__plot_selected").click(function () {
         opts.clear(); updateSelection();
     });

     $("#__tree_div")
       .jstree(
         {
           "plugins" : [ "themes", "json_data", "crrm", "ui", "ajax", "contextmenu"],
           "json_data" : {
             // dynamically open nodes by querying when they're opened and adding the
             // appropriate children
             "ajax" : {
               "type" : "POST",
               "url" : backend + "/api/query?" + private_flags,
               "data" : function (n) {
                 // load data for a tree level
                 // generate the query which is send as the POST payload
                 var p = $("#__tree_div").jstree("get_path", n);
                 var query = "select distinct ";
                 if (n == -1) {
                   p = [];
                 }
                 // find the tag name we want to select at this level
                 if (p.length < tree_order.length ||
                     (p.length >= tree_order.length && isPrefixTree(tree_order))) {
                   if ($.type(tree_order[p.length]) == "string") {
                     // if it's a normal tree, this means the tag at this level
                     query += tree_order[p.length];
                   } else if (p.length >= tree_order.length - 1 &&
                             "prefixTag" in tree_order[tree_order.length-1]) {
                     // if it's a prefixTree and we're generating
                     // that, we always use the prefixTag
                     query += tree_order[tree_order.length-1].prefixTag;
                   } else if ("tag" in tree_order[p.length]) {
                     // it might be a config dict at this level rather
                     // than a string.
                     query += tree_order[p.length].tag;
                   }
                   // build the where clauses which enforce our
                   // selections for the levels above us.
                   var clauses = buildClauses(p, n);
                   if (clauses.length)
                     query += " where " + clauses;
                   console.log(query);
                   return query;
                 } 
                 return undefined;
               },
               "success" : function (resp, status, req, node) {
                 // process the returned query data into a jstree struct
                 var obj = eval(resp);
                 var rv = [];
                 var p = $("#__tree_div").jstree("get_path", node);
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
                              "state": state,
                             };
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
                                        "icon" : "/media/smap/img/plotable.png"
                                      },
                                      "state": tags[tv]};
                   }

                   // we have to sort after splitting up the prefix
                   // tag value since we only want to sort based on
                   // this one particular level.
                   rv.sort(function (x, y) {
                             if (sortfn) return sortfn(x.data.title, y.data.title);
                             else return (x.data.title < y.data.title ? -1 : 
                                          (x.data.title > y.data.title ? 1 : 0));
                           });
                 }
                 return rv;
               }
             }
           },
           "ui": {
             "select_multiple_modifier" : "shift"
           },
           "contextmenu": {
             "items" : function (node) {
               if (opts.context_menu && private_flags != "") {
                 menu = opts.context_menu;
                 // have to eval all the actions so they run in the
                 // context of this tree.
                 for (var mname in menu) {
                   for (submname in menu[mname].submenu) {
                     menu[mname].submenu[submname].action = eval(menu[mname].submenu[submname].action);
                   }
                 }
                 menu["delete"] = {
                   "label" : "Delete streams",
                   "action" : function(node) { delStream(node); },
                   "separator_before": true
                 };
               } else {
                 menu = {};
               }
               menu["plot"] = {
                 "label" : "Plot",
                 "action" : updateSelection,
                 "separator_before": true,
                 "icon" : "/media/smap/img/plotable.png"
               };
               return menu;
             }
           }
         })
       .bind("dblclick.jstree", function(event) {
               var node = $(event.target).closest("li");
               if ($(node).hasClass("jstree-leaf")) {
                 $("#__tree_div").jstree("select_node", node);
                 opts.clear();
                 updateSelection();
               } else {
                 $("#__tree_div").jstree("toggle_node", node);
               }
             })
       .bind("select_node.jstree", function(event, data) {
               // updateSelection();
             })
       .bind("deselect_node.jstree", function(event, data) {
               // updateSelection();
             })
       .bind("loaded.jstree", function() {
               treeOpenPath(opts.openpath);
             });
   });
}
