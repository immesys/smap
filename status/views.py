# Create your views here.

from django.template import Context, loader
from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseRedirect, HttpResponseBadRequest, Http404

def status(request):
    t = loader.get_template('status.html')
    c = Context({})
    return HttpResponse(t.render(c))

def tags(request):
    t = loader.get_template('tags.html')
    c = Context({})
    return HttpResponse(t.render(c))
