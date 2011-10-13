
from django.conf.urls.defaults import *
from piston.resource import Resource
from powerdb2.api.handlers import SubscriptionHandler

subscription_handler = Resource(SubscriptionHandler)

urlpatterns = patterns('',
   (r'^subscriptions/(?P<backend_id>[0-9]+)', subscription_handler),
   (r'^subscriptions/', subscription_handler),
  )
