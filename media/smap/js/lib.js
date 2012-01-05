// -*- java -*-

function getUrlVars() {
  var vars = [], hash;
  if (window.location.href.indexOf('?') < 0) {
    return vars;
  }
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for(var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}

function removeChildrenById(id) {
  var elt = document.getElementById(id);
  if (elt.hasChildNodes()) {
    while (elt.childNodes.length >= 1) {
       elt.removeChild(elt.firstChild);
    }
  }
}

function keys(o) {
  var arr = [];
  for (var propertyName in o) {
    arr.push(propertyName);
  }
  return arr;
}

function flatten(obj, includePrototype, into, prefix) {
    into = into || {};
    prefix = prefix || "";

    for (var k in obj) {
        if (includePrototype || obj.hasOwnProperty(k)) {
            var prop = obj[k];
            if (prop && typeof prop === "object" &&
                !(prop instanceof Date || prop instanceof RegExp)) {
                flatten(prop, includePrototype, into, prefix + k + "/");
            }
            else {
                into[prefix + k] = prop;
            }
        }
    }

    return into;
}

// add a ":containsexactly" jquery selector
$.expr[':'].containsexactly = function(obj, index, meta, stack) 
{  
  return $(obj).text() === meta[3];
}; 
