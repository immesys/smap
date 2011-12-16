from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    # (r'^powerdb/', include('powerdb.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/', include(admin.site.urls)),

    (r'^plot/', include('powerdb2.smap.urls')),

    (r'^status/', include('powerdb2.status.urls')),

    (r'^backend/', include('powerdb2.backend.urls')),
    (r'^backend_auth/', include('powerdb2.backend.urls')),

                       # (r'^api/', include('powerdb2.api.urls')),

    (r'^datacenter/', include('powerdb2.datacenter.urls')),

    (r'^robots.txt.*', 'powerdb2.views.robots'),

    (r'^media/(?P<path>.*)$', 'django.views.static.serve',
        {'document_root' : settings.STATIC_DOC_ROOT, 'show_indexes' : True}),

    (r'^$', 'powerdb2.views.root'),
 
    
)
