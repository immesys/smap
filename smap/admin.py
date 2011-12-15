
from django.contrib import admin
from powerdb2.smap.models import Subscription

class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('description', 'key')
    fields = ('description', 'url', 'resource', 'public')

admin.site.register(Subscription, SubscriptionAdmin)
