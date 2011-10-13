
import sys
from optparse import OptionParser

from powerdb.smap.models import *
from django.db import connection

if __name__ == '__main__':
    parser = OptionParser(description="check and resubscribe to streams")
    parser.add_option('-s', '--subscribe', action='store_true',
                      dest='subscribe', default=False)
    opts, ids = parser.parse_args()
    ids = map(int, ids)

    for sub in Subscription.objects.all():
        if len(ids) > 0 and not sub.id in ids: continue
        print sub, sub.instance, sub.enabled
        if True or (sub.instance and sub.enabled):
            print sub
            if not sub.check():
                if opts.subscribe:
                    print " ==> resubscribing"
                    sub.subscribe()

    for x in connection.queries:
        print x['time'], x['sql']
