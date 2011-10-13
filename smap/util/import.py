
from django.contrib.auth.models import User
import smap.models as m

sources = "http://smap.cs.berkeley.edu/db/api.py/subscriptions"

owner = User.objects.get(username="root")

for idx,name,url in m.http_load(sources):
    print name,url
    # make a new subscription for each of these
    s = m.Subscription(owner=owner,
                       url=url,
                       name=name,
                       period=0)
    try:
        s.save()
    except:
        print "EXCEPTION -- Duplicate key?"
        pass

                   
                  
