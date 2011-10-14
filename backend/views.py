
import urllib
import powerdb2.settings as settings
import revproxy

proxy_conf = {
    'destination' : 'http://local.cs.berkeley.edu:8079',
#    'prefix' : 'backend'
    }

def proxy(request, url):
    qparams = {}
    if hasattr(settings, 'ARD_KEY'):
        qparams['key'] = settings.ARD_KEY
    if hasattr(settings, 'ARD_PRIVATE') and settings.ARD_PRIVATE:
        qparams['private'] = ''

    qs = urllib.urlencode(qparams, doseq=True)
    
    if len(request.META["QUERY_STRING"]) > 0:
        request.META["QUERY_STRING"] += '&' + qs
    else:
        request.META["QUERY_STRING"] = qs

    return revproxy.proxy_request(request, path=urllib.quote(url), **proxy_conf)
