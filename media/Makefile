
JSMIN=java -jar ../bin/yuicompressor-2.4.7.jar
OUTFILE=smap.min.js

PLOTJSDEPS=jquery-1.5.2/jquery-1.5.2.min.js \
	jquery-1.5.2/jquery.cookie.js jquery-1.5.2/jquery.hotkeys.js \
	flot-0.7/js/jquery.flot.js \
	flot-0.7/js/jquery.flot.stack.min.js flot-0.7/js/jquery.flot.navigate.min.js \
	flot-0.7/js/jquery.flot.selection.min.js flot-0.7/js/date.js \
	jquery-ui/development-bundle/ui/jquery.ui.core.js \
 	jquery-ui/development-bundle/ui/jquery.ui.widget.js \
 	jquery-ui/development-bundle/ui/jquery.ui.button.js \
	jquery-ui/development-bundle/ui/jquery.ui.position.js \
	jquery-ui/development-bundle/ui/jquery.ui.dialog.js \
	jquery-ui/development-bundle/ui/jquery.ui.mouse.js \
	jquery-ui/development-bundle/ui/jquery.ui.resizable.js \
	jquery-ui/development-bundle/ui/jquery.ui.draggable.js \
	smap/js/anytimec.js  smap/js/cvi_busy_lib.js \
	smap/js/lib.js smap/js/plot.js \
	smap/js/colormap.js smap/js/tagtree.js
PLOTJSMIN=$(PLOTJSDEPS:.js=.min.out.js)

$(OUTFILE): $(PLOTJSMIN)
	cat $(PLOTJSMIN) > $(OUTFILE)
	gzip -c $(OUTFILE) > $(OUTFILE).gz

%.min.out.js: %.js
	$(JSMIN) $< > $@

clean:
	rm $(PLOTJSMIN)
