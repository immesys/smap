
import urllib2
import json
from piston.handler import BaseHandler

from django.contrib.auth.models import User
from powerdb2.smap.models import Subscription
import powerdb2.settings as settings

class SubscriptionHandler(BaseHandler):
    allowed_methods = ('GET',)
    model = Subscription
    fields = ('backend_id', 'description')

    def read(self, request, backend_id=''):
        url = '%s/%s' % (settings.ARD_URL, 'api/streams')
        fp = urllib2.urlopen(url)
        try:
            page = json.load(fp)
        except:
            return None
        finally:
            fp.close()

        for o in page:
            try:
                sub = Subscription.objects.get(backend_id=o['id'])
            except Subscription.DoesNotExist:
                Subscription(owner=User.objects.get(username='root'),
                             backend_id=o['id'],
                             description=o['SmapUrl']).save()

        return BaseHandler.read(self, request)
