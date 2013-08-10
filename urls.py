from django.conf.urls.defaults import *
from django.conf import settings
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

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

#    (r'^datacenter/', include('powerdb2.datacenter.urls')),

    (r'^robots.txt.*', 'powerdb2.views.robots'),

    (r'^alert/', include('powerdb2.alert.urls')),

    (r'^$', 'powerdb2.views.root'),
     
    (r'^status/', include('powerdb2.status.urls')),
    
    (r'^dashboard/', 'powerdb2.status.views.dashboard'),

    (r'^smap_query/', 'powerdb2.status.views.smap_query')
)

urlpatterns += staticfiles_urlpatterns()
