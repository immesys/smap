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

from django.db.models import Max
from django.template import Context, loader
from django.template.defaultfilters import linebreaks
from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseRedirect, HttpResponseBadRequest, Http404
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.db import connection

from django.db import connection
from django.contrib.admin import site as adminsite
# import django.contrib.auth.views as adminviews

# stuff for csv
import cStringIO
import csv

import urlparse
import time
import datetime
import calendar
from dateutil.tz import *
import json
try:
    from collections import OrderedDict
except ImportError:
    from ordereddict import OrderedDict

from models import *
import powerdb2.settings as settings
import errors
import profileheader

def to_localtime_full(data, tozone):
    tz = gettz(tozone)
    utc = gettz('UTC')
    data = [(datetime.datetime.fromtimestamp(x[0], utc).astimezone(tz),
             x[2]) for x in data]
    data = [(calendar.timegm(x[0].timetuple()) * 1000,
             x[1]) for x in data]
    return data

def to_localtime_fast(data, tozone):
    tz = gettz(tozone)
    utc = gettz('UTC')
    ts_1 = datetime.datetime.fromtimestamp(data[0][0], utc)
    ts_2 = datetime.datetime.fromtimestamp(data[-1][0], utc)

    if tz.utcoffset(ts_1).seconds == tz.utcoffset(ts_2).seconds and \
       data[-1][0] - data[0][0] < 3600*60*24*90:
        off = tz.utcoffset(ts_1)
        off = 3600 * 24 * off.days + off.seconds
        return [((x[0] + off) * 1000, x[2]) for x in data]
    else:
        print "Reverting to slow time conversion!"
        return to_localtime_full(data, tozone)

def dumpcsv(obj, fp):
    for row in obj:
        fp.write(','.join(map(str, row)))
        fp.write('\n')

def current_datetime(request):
    return HttpResponse(time.time())

def plot(request, tree=0):
    """Render the plotting gui using a template
    """
    trees = Tree.objects.all().order_by('id')
    if 'default' in settings.DATABASES:
        if not request.user.is_authenticated() and ( \
            'login' in request.GET or 'login' in request.POST):
            return adminsite.login(request)
        c = Context({
                'user' : request.user,
                'default_tree_id' : str(tree),
                })
    else:
        c = Context({'default_tree_id' : str(tree)})

    if not 'dev' in request.GET:
        c['includeheaders'] = 'includes.html'
    else:
        c['includeheaders'] = 'includes-dev.html'
    c['trees'] = zip(trees, range(0, len(trees)))

    t = loader.get_template('plot.html')
    return HttpResponse(t.render(c))

def menu(request):
    """Generate a jstree.js contextmenu containing the tags we want to
    allow"""
    m = OrderedDict()

    for tn in MenuTag.objects.all().order_by('id'):
        display, tag = tn.__unicode__(), tn.tag_name
        m[display] = OrderedDict()
        m[display]["label"] = display
        m[display]["submenu"] = OrderedDict()
        for val in MenuValue.objects.filter(tag_name=tn).order_by("id"):
            value = val.tag_val
            m[display]["submenu"][value] = {
                'label': value,
                'action': "(function(node) { setTag(node, \"%s\", \"%s\"); })" % (tag, value)
                }
        m[display]["submenu"]["no-" + display] = {
            "label" : "(none)",
            "action" : "(function(node) { delTag(node, \"%s\"); })" % tag,
            }
    return HttpResponse("var tag_menu = " + 
                        json.dumps(m) + ";", mimetype="application/javascript")

