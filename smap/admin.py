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
from powerdb2.smap.models import Subscription, Tree, MenuTag, MenuValue

class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('description', 'key', 'owner', 'public')
    fields = ('description', 'url', 'resource', 'key', 'public', 'can_view')

    # save the creator of this subscription
    def save_model(self, request, obj, form, change):
        obj.owner = request.user
        obj.save()

class TreeAdmin(admin.ModelAdmin):
    pass

class MenuTagAdmin(admin.ModelAdmin):
    pass

class MenuValueAdmin(admin.ModelAdmin):
    pass

admin.site.register(Subscription, SubscriptionAdmin)
admin.site.register(Tree, TreeAdmin)
admin.site.register(MenuTag, MenuTagAdmin)
admin.site.register(MenuValue, MenuValueAdmin)
