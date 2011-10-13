

from powerdb.smap.models import *

stream = 1
stream = Stream.objects.get(id=stream)
print stream
default = Stream.objects.filter(subscription__id=stream.subscription.id,
                                point__iexact='ABC',
                                typ='S',
                                channel__iexact='true_power')
print default
