"""
Copyright (c) 2011, 2012, Regents of the University of California
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions 
are met:

 - Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
 - Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the
   distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS 
FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL 
THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES 
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) 
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, 
STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
OF THE POSSIBILITY OF SUCH DAMAGE.
"""

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
              'combiner',
              'comparator_2', 'value_2',
              'set',]
    readonly_fields = ['set']

class AlertAdmin(admin.ModelAdmin):
    list_display = ('description', '__unicode__', 'last_check', 
                    'current_level', 'enabled', 'silent', 'error_state')
    fieldsets = (
        (None, { 'fields' : ('owner', 'description', 'grouping', 'select', 
                             'notification_frequency', 'enabled', 'silent')
                 }),
        ('Status', {
                'fields' : ('current_level', 'last_change', 'last_check',
                            # 'last_notification', 'last_priority'
                            )
                }),
        ('Error State', {
                'classes': ('collapse', ), 
                'fields': ('error_state', 'error_time', 'error'),
                }),
        ('Notifications', {
                'classes': ('collapse', ), 
                'fields': ('last_notification', 'last_priority',),
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

class LogAdmin(admin.ModelAdmin):
    list_display = ('when', 'alert')
    list_filter = ('alert__description',)
    fieldsets = (
        (None, {'fields': ('when', 'alert') }),
        ('Message', {'fields': ('message',)}),
        )
    readonly_fields = ('when', 'alert', 'message')

admin.site.register(Alert, AlertAdmin)
admin.site.register(Recipients, RecipientsAdmin)
admin.site.register(Action, ActionAdmin)
admin.site.register(Log, LogAdmin)
