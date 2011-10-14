
from django.conf.urls.defaults import *

urlpatterns = patterns('',
    (r'^.*$', 'powerdb2.backend.views.proxy')
)
