import os
import sys

os.environ['DJANGO_SETTINGS_MODULE'] = 'powerdb2.settings'
sys.path.append('/mnt/md1/django/smap2')

import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()
