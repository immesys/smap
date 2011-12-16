
from django.db.models import Max
from django.template import Context, loader
from django.template.defaultfilters import linebreaks
from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseRedirect, HttpResponseBadRequest, Http404
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.db import connection

from django.db import connection

try:
    import simplejson as json
except ImportError:
    import json
try:
    import cjson
    cjson_encode = cjson.encode
except ImportError:
    print "WARN: cjson not found, using standard json"
    cjson_encode = json.dumps

# stuff for csv
import cStringIO
import csv

import urlparse
import time
import datetime
import calendar
from dateutil.tz import *

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

def plot(request, tree=2):
    """Render the plotting gui using a template
    """
    t = loader.get_template('templates/plot.html')
    if hasattr(settings, 'DATABASE_ENGINE'):
        c = Context({
                'user' : request.user,
                'default_tree_id' : str(tree),
                })
    else:
        c = Context({'default_tree_id' : str(tree)})

    return HttpResponse(t.render(c))
