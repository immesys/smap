# Create your views here.

from django.template import Context, loader
from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseRedirect, HttpResponseBadRequest, Http404
from django.contrib.admin import site as adminsite

def status(request):
    t = loader.get_template('status.html')
    c = Context({})
    return HttpResponse(t.render(c))

def tags(request):
    t = loader.get_template('tags.html')
    c = Context({})
    return HttpResponse(t.render(c))

def dashboard(request):
    if not request.user.is_authenticated() and ( \
      'login' in request.GET or 'login' in request.POST):
      return adminsite.login(request)
    t = loader.get_template('dashboard.html')
    c = Context({'user' : request.user})
    return HttpResponse(t.render(c))

def smap_query(request):
    t = loader.get_template('smap_query.html')
    c = Context({'user' : request.user})
    return HttpResponse(t.render(c))
