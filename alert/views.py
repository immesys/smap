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
# Create your views here.

import re

from powerdb2.alert.models import *
from smap.archiver.client import SmapClient
from smap.util import buildkv

from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseRedirect, HttpResponseBadRequest, Http404
from django.contrib.auth.models import User, Group
from django.utils import simplejson
from django.core.exceptions import ObjectDoesNotExist

from piston.handler import BaseHandler
from piston.utils import validate, rc

def update(base, req, fields):
    # print "updating", base, req, fields
    for f in fields:
        if isinstance(f, tuple):
            # try to follow foreign keys
            if not f[0] in req: continue
            search = {}
            # build a list of things to look for
            for fksearch in f[1]:
                search[fksearch] = req[f[0]][fksearch] 
            fklass = getattr(base, f[0]).__class__
            ref, created = fklass.objects.get_or_create(**search)
            if created: 
                ref.save()
            setattr(base, f[0], ref)
        else:
            if f in req:
                setattr(base, f, req[f])

class AlertHandler(BaseHandler):
    """Handler providing a simple REST api for managing alerts.  The
    objects it gets and returns look something like:

{
    "description": "Test one 2",
    "level" : {
        "priority": 30,
        "description": "ALERT"
    },
    "enabled": true,
    "silent": false,
    "action": {
      "name" : "Default"
      },
    "test" : {
      "value" : 1.0,
      "comparator": "LTE"
    },
    "select": "uuid = \"eb6200b6-4f5f-5a30-ab2d-7aea3bcfcfaf\""
}

To create an object, you must specify most of these.  For an update,
you can just include the things you want to change.  Use POST to
/alert to create, PUT to /alert/ID to update, DELETE to /alert/ID to
delete.

description: text string describing alert [required]
test: test to run on streams [required]
select: string "where" clause describing which streams to include in the alert [requred]

level: severity of the alert.  optional, defaults to priority = 30
action: what to do when triggered.  optional, defaults to "Default"
enabled: boolean, weather to run this alert.  default True.
    """
    allow_methods = ('GET', 'PUT')
    exclude = ('owner', ('action', re.compile("_state")))
    fields = (
        'id',
        'description', 
        'grouping',
        'enabled', 
        'silent',
        'select',
        'current',
        ('current_level', ('description', 'priority')),
        ('checks', (
                'id', 'set', 'set_time', 'clear_time', 'value_1', 'comparator_1',
                'combiner', 'value_2', 'comparator_2', 
                ('level', ('description', 'priority')),
                ('recipients', ('description', 'emails')),
                )),
        'last_change', 
        'error_state', 'error', 'error_time',)
    update_fields = ('description', 'enabled', 'select', 'silent')
    model = Alert

    def _patch_current(self, alert):
        current_values = alert.current()
        alert.current_level = current_values[1]
        alert.current = current_values[0]

    def read(self, request, *args, **kwargs):
        alert = BaseHandler.read(self, request, *args, **kwargs)
        self._patch_current(alert)
        return alert

    def update(self, request, id):
        """Update an alert, restricting to fields listed in update_fields"""
        req = simplejson.loads(request.raw_post_data)
        try:
            alert = Alert.objects.get(id=id)
        except Alert.DoesNotExist:
            return rc.NOT_FOUND

        try:
            update(alert, req, self.update_fields)
        except KeyError:
            return rc.BAD_REQUEST
        alert.save()
        return alert

#     def create(self, request):
#         """Create a new alert.  We'll only create new tests, the
#         owner, level, and action must already exist"""
#         req = simplejson.loads(request.raw_post_data)
#         new = Alert(description=req['description'],
#                     select=req['select'],
#                     enabled=req.get('enabled', True))
#         try:
#             new.owner = User.objects.get(username=req.get('owner', 'root'))
#             new.level = Level.objects.get(**req.get('level', {'priority': 30}))
#             new.action = Action.objects.get(**req.get('action', {'name': 'Default'}))
#         except ObjectDoesNotExist:
#             return rc.BAD_REQUEST

#         new.test, created = Test.objects.get_or_create(**req['test'])
#         if created:
#             new.test.save()
#         new.save()
#         return new

class LogHandler(BaseHandler):
    allow_methods = ['GET']
    fields = ['when', 'message']
    def read(self, request, id=None):
        if id:
            return Log.objects.filter(alert__id=int(id)).order_by('-when')[0]
#         else:
#             return Log.objects.
    
def alert_filter(request, id, test=True):
    a = Alert.objects.get(id=int(id))
    return HttpResponse(simplejson.dumps([x for x in a.current() if x['Set'] == test]),
                        mimetype='application/json')

def current(request, id):
    a = Alert.objects.get(id=int(id))
    return HttpResponse(simplejson.dumps(a.current()),
                        mimetype='application/json')

