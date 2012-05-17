
import urllib
from django.db.models import Q
import powerdb2.settings as settings
import powerdb2.smap.models as models
import revproxy
import operator

proxy_conf = {
    'destination' : settings.ARD_URL,
    }

def proxy(request):
    qparams = {'key' : []}
    if hasattr(settings, 'ARD_KEY'):
        if isinstance(settings.ARD_KEY, list):
            qparams['key'].extend(settings.ARD_KEY)
        else:
            qparams['key'].append(settings.ARD_KEY)

    if hasattr(settings, 'ARD_PRIVATE') and settings.ARD_PRIVATE:
        qparams['private'] = ''

    if 'default' in settings.DATABASES and \
            request.user.is_authenticated():
        keys = map(operator.attrgetter("key"),
                   models.Subscription.objects.filter((Q(can_view=request.user) | 
                                                       Q(owner=request.user))))
                   #  &
                   # Q(public=False)))
        qparams['key'].extend(keys)

    qs = urllib.urlencode(qparams, doseq=True)
        
    if len(request.META["QUERY_STRING"]) > 0:
        request.META["QUERY_STRING"] += '&' + qs
    else:
        request.META["QUERY_STRING"] = qs

    if request.path.startswith('/backend_auth'):
        proxy_conf['prefix'] = 'backend_auth'
    else:
        proxy_conf['prefix'] = 'backend'

    return revproxy.proxy_request(request, **proxy_conf)
