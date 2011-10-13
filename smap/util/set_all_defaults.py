
from powerdb.smap.models import *

for s in Subscription.objects.all():
    s.set_default_default()
    s.save()
    print s.default_stream
