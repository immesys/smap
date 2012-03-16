# Create your views here.

from django.template import Context, loader
from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseRedirect, HttpResponseBadRequest, Http404

def status(request):
    t = loader.get_template('datacenter.html')
    c = Context({})
    return HttpResponse(t.render(c))


