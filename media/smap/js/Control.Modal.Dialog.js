/**
 * @author Michael Gall <code@xebidy.com>
 * @copyright 2008 Xebidy Strategic Design
 * @package Control.Modal.Dialog
 * @license MIT
 * @url http://xebidy.com/code/control_modal_dialog/
 * @version 0.2
 */

/**
 * Control.Modal.Dialog takes any options that Control.Modal does and optionally an onsubmit callback
 * function that will be called with the serialized form. A cancel CSS rule for any cancel buttons to
 * attach to. 
 * a request object with 2 parameters, onSuccess and onFailure callbacks which take the Ajax request 
 * as the first argument. The return of these parameters will close or keep the modal dialog open 
 * (true for close, false for remain open and open contents).
 */
 
 
if(typeof(Control) == "undefined" || typeof(Control.Modal) == "undefined") 
  throw "Control.Modal.Dialog relies on Control.Modal http://livepipe.net/projects/control_modal/";
 
Control.Modal.Dialog = Class.create();
Object.extend(Control.Modal.Dialog.prototype, {
  modal: null,
  options: {
    onsubmit: Prototype.K.bind(null,true),
    request: false, // This can be replaced by a object containing onSuccess and onFailure functions
    cancel: "input[value=Cancel]"
  },
  
  /**
   * Constructor for Control.Modal.Dialog takes a element (preferably a link) and an options 
   * object
   */
  initialize: function(element, options) {
    options = options || {};
    var mode = options.mode ? options.mode : "contents";
    
    options.onSuccess = this.initForms.bind(this, this.options);
    
    this.modal = new Control.Modal(element? element : "", Object.extend({
      overlayCloseOnClick: false
    }, options) );
    
    this.options = Object.extend(this.options, options);
    this.modal.open();
    if(this.modal.mode == "contents") {
      this.initForms(this.options);
    }
    return this;
  },
  /**
   * Updates the contents of the modal
   */
  update: function(text) {
    this.modal.update(text);
    this.initForms(this.options);
  },
  /**
   * Private function to initialise forms added to the Modal Dialog
   */
  initForms: function (options) {
    if(options.cancel) {
      $$(options.cancel).each(function(i) {
        i.onclick = function() { Control.Modal.close(); }
      });;
    }
    if(options.request) {
      var exec = function(func,req) { //This will be executed with the supplied onSuccess or onFailure methods
        var closeVal = true;
        if(func) {
          closeVal = func(req);
        }
        if(closeVal) {
          Control.Modal.close();
        } else {
          this.update(req.responseText);
        }
      }
      $('modal_container').getElementsBySelector("form").each(function(i) {
        i.onsubmit = function() {
          this.request({
            onSuccess: exec.bind(this, options.request.onSuccess),
            onFailure: exec.bind(this, options.request.onFailure)
          });
          return false;
        }
      });
    } else {
      $('modal_container').getElementsBySelector("form").each(function(i) {
        i.onsubmit = function() {
          var retVal = options.onsubmit.bind(this)(this.serialize(true));
          if(retVal) Control.Modal.close();
          return false;
        }
      });
    }
  }
});