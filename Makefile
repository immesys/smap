
PROJECT=powerdb2
VERSION=2.0.300

DIST_DIRS=alert api backend conf debian lib media smap status templates
INSTALL_DIRS=$(filter-out debian, $(DIST_DIRS))
DIST_FILES=*.py django.wsgi README Makefile 

INSTALL_DIR=/usr/share/$(PROJECT)

all:
	@echo $(INSTALL_DIRS)

install:
	mkdir -p $(DESTDIR)/$(INSTALL_DIR)
	cp -r $(INSTALL_DIRS) $(DIST_FILES) $(DESTDIR)/$(INSTALL_DIR)
	mkdir -p $(DESTDIR)/etc/apache2/sites-available
	cp conf/powerdb2 $(DESTDIR)/etc/apache2/sites-available

dist: min dist/$(PROJECT)-$(VERSION).tar.gz

dist/$(PROJECT)-$(VERSION).tar.gz:
	-mkdir dist
	-mkdir dist/$(PROJECT)-$(VERSION)
	cp -r $(DIST_DIRS) dist/$(PROJECT)-$(VERSION)
	cp $(DIST_FILES) dist/$(PROJECT)-$(VERSION)
	cd dist && tar czf $(PROJECT)-$(VERSION).orig.tar.gz $(PROJECT)-$(VERSION) --exclude-vcs --exclude='*.pyc'
	rm -rf dist/$(PROJECT)-$(VERSION)

builddeb: 
	cd dist && tar zxvf $(PROJECT)-$(VERSION).orig.tar.gz
	cd dist/$(PROJECT)-$(VERSION) && dpkg-buildpackage -rfakeroot -uc -us -S


min:
	cd media && make
