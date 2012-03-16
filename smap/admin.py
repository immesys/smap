
from django.contrib import admin
from powerdb2.smap.models import Subscription

class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('description', 'key', 'owner', 'public')
    fields = ('description', 'url', 'resource', 'key', 'public', 'can_view')

    # save the creator of this subscription
    def save_model(self, request, obj, form, change):
        obj.owner = request.user
        obj.save()

admin.site.register(Subscription, SubscriptionAdmin)

