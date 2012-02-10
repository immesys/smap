
from django.contrib import admin
from django.forms.models import inlineformset_factory
from django.contrib.contenttypes import generic

from powerdb2.alert.models import *

class TestAdmin(admin.ModelAdmin):
    pass

class ActionAdmin(admin.ModelAdmin):
    fields = ('name', 'template', 'group', 'rate', 'alert_when_true', 'alert_when_false')

class AlertAdmin(admin.ModelAdmin):
    list_display = ('description', '__unicode__', 'last_check', 'set', 'error_state')
    fieldsets = (
        (None, { 'fields' : ('owner', 'description', 'select', 'test',  'level', 'action', 'enabled')
                 }),
        ('Alert Status', {
                'fields' : ('set', 'set_time', 'clear_time')
                }),
        ('Backend Status', {
                'fields' : ('last_check',)
                }),
        ('Error State', {
                'classes': ('collapse', ), 
                'fields': ('error_state', 'error_time', 'error'),
                }))
    readonly_fields = ('error_state', 'error_time', 'error', 'last_check',
                       'owner', 'set', 'set_time', 'clear_time')
    list_filter = ('set', 'error_state', 'owner')
    radio_fields = {'level': admin.VERTICAL}


    # save the creator of this subscription
    def save_model(self, request, obj, form, change):
        instance = form.save(commit=False)
        if not hasattr(instance, 'owner'):
            instance.owner = request.user
        print instance.test
        instance.save()
        form.save_m2m()
        return instance

    # fields = ('select', 'url', 'resource', 'key', 'public', 'can_view')

class LevelAdmin(admin.ModelAdmin):
    list_display = ('priority', 'description')
    ordering = 'priority',

class LogAdmin(admin.ModelAdmin):
    list_display = ('when', 'alert')
    list_filter = ('alert__description',)
    fieldsets = (
        (None, {'fields': ('when', 'alert') }),
        ('Message', {'fields': ('message',)}),
        )
    readonly_fields = ('when', 'alert', 'message')

admin.site.register(Alert, AlertAdmin)
admin.site.register(Level, LevelAdmin)
admin.site.register(Action, ActionAdmin)
admin.site.register(Test, TestAdmin)
admin.site.register(Log, LogAdmin)
