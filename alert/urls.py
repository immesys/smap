from django.conf.urls.defaults import *
from piston.resource import Resource

import views
alert_handler = Resource(views.AlertHandler)
log_handler = Resource(views.LogHandler)

urlpatterns = patterns('',
    url(r'^(?P<id>\d+)$', alert_handler, {'emitter_format': 'json'}),
    url(r'^$', alert_handler, {'emitter_format': 'json'}),
    url(r'^log/(?P<id>\d+)$', log_handler, {'emitter_format': 'json'}),
    url(r'^log/$', log_handler, {'emitter_format': 'json'}),
    url(r'^current/(?P<id>\d+)$', 'powerdb2.alert.views.current'),
    url(r'^set/(?P<id>\d+)$', 'powerdb2.alert.views.filter', kwargs={'test':True}),
    url(r'^clear/(?P<id>\d+)$', 'powerdb2.alert.views.filter', kwargs={'test':False}),
    )
