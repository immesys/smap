
import re,sys
from django.db.models import Count, Max
from powerdb.smap.models import *
import datetime, time

subs = Subscription.objects.all();
updates = dict([(x['subscription'], x['latest__max']) for x in 
                Stream.objects.values('subscription'). 
                annotate(Max('latest')).order_by('latest__max')])

print updates

sys.exit(0)

def validate_dnsname(name):
    if  re.match("^[a-zA-Z0-9][a-zA-Z0-9-]*$", name):
        print "match1"
    if re.match("^[0-9]*$", name):
        print "match2"

# print validate_dnsname(sys.argv[1])

import urllib
import urlparse
import posixpath

def urlnorm(url):
    pieces = urlparse.urlparse(url)
    path = posixpath.normpath(pieces.path)
    return urlparse.urlunparse((pieces.scheme, pieces.netloc,
                                path, pieces.params,
                                pieces.query, pieces.fragment))

print urlnorm("http://jackalope/../fooo/bar/..")
