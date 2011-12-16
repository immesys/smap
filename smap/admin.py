
from django.contrib import admin
from powerdb2.smap.models import Subscription

class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('description', 'key', 'owner', 'public')
    fields = ('description', 'url', 'resource', 'public', 'can_view')

    # save the creator of this subscription
    def save_model(self, request, obj, form, change):
        instance = form.save(commit=False)
        if not hasattr(instance, 'owner'):
            instance.owner = request.user
        instance.save()
        form.save_m2m()
        return instance

admin.site.register(Subscription, SubscriptionAdmin)

