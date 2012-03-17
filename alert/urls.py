"""
Copyright (c) 2011, 2012, Regents of the University of California
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions 
are met:

 - Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
 - Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the
   distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS 
FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL 
THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES 
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) 
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, 
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
OF THE POSSIBILITY OF SUCH DAMAGE.
"""
from django.conf.urls.defaults import *
from piston.resource import Resource

import views
alert_handler = Resource(views.AlertHandler)
log_handler = Resource(views.LogHandler)

urlpatterns = patterns('',
    url(r'^(?P<id>\d+)$', alert_handler, {'emitter_format': 'json'}),
    url(r'^(?P<grouping>[a-zA-Z][a-zA-Z0-9]*)$', alert_handler, {'emitter_format': 'json'}),
    url(r'^$', alert_handler, {'emitter_format': 'json'}),
    url(r'^log/(?P<id>\d+)$', log_handler, {'emitter_format': 'json'}),
    url(r'^log/$', log_handler, {'emitter_format': 'json'}),
    url(r'^current/(?P<id>\d+)$', 'powerdb2.alert.views.current'),
    url(r'^set/(?P<id>\d+)$', 'powerdb2.alert.views.alert_filter', kwargs={'test':True}),
    url(r'^clear/(?P<id>\d+)$', 'powerdb2.alert.views.alert_filter', kwargs={'test':False}),
    )
