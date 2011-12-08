
from django.conf.urls.defaults import *

urlpatterns = patterns('',
    (r'^$', 'powerdb2.datacenter.views.status'),
)
