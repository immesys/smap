
from django.conf.urls.defaults import *

urlpatterns = patterns('',
    (r'^now$', 'powerdb2.smap.views.current_datetime'),
    (r'^$', 'powerdb2.smap.views.plot'),
    (r'^(?P<tree>[a-z0-9]+)$', 'powerdb2.smap.views.plot'),
)
