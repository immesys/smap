
from django.http import HttpResponse, HttpResponseRedirect

def root(request):
    # return HttpResponseRedirect("http://smote.cs.berkeley.edu:8000/tracenv/wiki/")
    return HttpResponseRedirect("/plot")

def robots(request):
    return HttpResponse("""
User-agent: *
Disallow: /smap/
    """)
