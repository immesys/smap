
from django.contrib import admin
from django.forms.models import inlineformset_factory
from django.contrib.contenttypes import generic

from powerdb2.alert.models import *
from powerdb2.alert.forms import *

class ActionAdmin(admin.ModelAdmin):
    pass

class RecipientsAdmin(admin.ModelAdmin):
    fieldsets = (
        (None, {'fields' : ('description', 'users', 'groups') }),
         ('Extra', {'fields' : ('extra_users',),
                    'classes' : ('collapse',)})
         )
    form = RecipientsForm

class CheckInline(admin.TabularInline):
    model = Check
    extra = 0
    fields = ['level', 'action', 
              'recipients',
              'comparator_1', 'value_1', 
              'comparator_2', 'value_2',
              'set',]
    readonly_fields = ['set']

class AlertAdmin(admin.ModelAdmin):
    list_display = ('description', '__unicode__', 'last_check', 
                    'current_level', 'enabled', 'error_state')
    fieldsets = (
        (None, { 'fields' : ('owner', 'description', 'grouping', 'select', 
                             'notification_frequency', 'enabled')
                 }),
        ('Status', {
                'fields' : ('current_level', 'last_change', 'last_check',
                            # 'last_notification', 'last_priority'
                            )
                }),
        ('Error State', {
                'classes': ('collapse', ), 
                'fields': ('error_state', 'error_time', 'error'),
                }))
    
    inlines = [CheckInline]
    readonly_fields = ('error_state', 'error_time', 'error', 'last_check',
                       'current_level', 'last_change', 'owner',
                       'last_notification', 'last_priority')
    list_filter = ('error_state', 'current_level', 'enabled')
#     radio_fields = {'level': admin.VERTICAL}


    # save the creator of this subscription
    def save_model(self, request, obj, form, change):
        instance = form.save(commit=False)
        if not hasattr(instance, 'owner'):
            instance.owner = request.user
        instance.save()
        form.save_m2m()
        return instance
 
    # fields = ('select', 'url', 'resource', 'key', 'public', 'can_view')

# class LevelAdmin(admin.ModelAdmin):
#     list_display = ('priority', 'description')
#     ordering = 'priority',

# class LogAdmin(admin.ModelAdmin):
#     list_display = ('when', 'alert')
#     list_filter = ('alert__description',)
#     fieldsets = (
#         (None, {'fields': ('when', 'alert') }),
#         ('Message', {'fields': ('message',)}),
#         )
#     readonly_fields = ('when', 'alert', 'message')

admin.site.register(Alert, AlertAdmin)
admin.site.register(Recipients, RecipientsAdmin)
# admin.site.register(Level, LevelAdmin)
admin.site.register(Action, ActionAdmin)
# admin.site.register(Test, TestAdmin)
# admin.site.register(Log, LogAdmin)
