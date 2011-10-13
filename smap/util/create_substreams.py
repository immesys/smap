
import sys
from powerdb.smap.models import *

def create(s):
    if s.typ == 'S':
        method = 'linear'
    elif s.typ == 'M':
        method = 'nearest'
    else:
        return

    rs,c = ResampledStream.objects.get_or_create(base_stream=s,
                                                 substream=1,
                                                 period=60 * 5,
                                                 method=method)
    print rs,c
    rs,c = ResampledStream.objects.get_or_create(base_stream=s,
                                                 substream=2,
                                                 period=60 * 60,
                                                 method=method)
    print rs,c

if __name__ == '__main__':
    if len(sys.argv)  > 1:
        for idx in sys.argv[1:]:
            for s in Stream.objects.filter(subscription__id=int(idx)):
                create(s)
    else:
        print "\n\t%s <subscriptions id ...>\n" % sys.argv[0]
        sys.exit(1)
