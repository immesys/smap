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
# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#     * Rearrange models' order
#     * Make sure each model has one field with primary_key=True
# Feel free to rename the models, but don't rename db_table values or field names.
#
# Also note: You'll have to insert the output of 'django-admin.py sqlcustom [appname]'
# into your database.

import string
import random
import uuid

from django.db import models
from django.contrib.auth.models import User

def new_key():
    return ''.join(map(lambda x: random.choice(string.letters + string.digits),
                       xrange(0, 36)))

def new_uuid():
    return str(uuid.uuid1())

class Subscription(models.Model):
    id = models.AutoField(primary_key=True)
    uuid = models.CharField(max_length=36, default=new_uuid)
    url = models.CharField(max_length=512, default='', blank=True)
    resource = models.CharField(max_length=512, default='/+')
    key = models.CharField(max_length=36, default=new_key)
    public = models.BooleanField(default=True)
    description = models.CharField(max_length=256)
    owner = models.ForeignKey(User)
    can_view = models.ManyToManyField(User, related_name='can_view', blank=True)
    class Meta:
        db_table = u'subscription'

    def __unicode__(self):
        if self.description: return self.description
        else: return self.key

class Stream(models.Model):
    id = models.AutoField(primary_key=True)
    subscription = models.ForeignKey(Subscription, db_index=True)
    uuid = models.CharField(unique=True, max_length=36)
    class Meta:
        db_table = u'stream'

class Metadata2(models.Model):
    id = models.AutoField(primary_key=True)
    stream = models.ForeignKey(Stream, db_index=True)
    tagname = models.CharField(max_length=64, db_index=True)
    tagval = models.TextField()
    class Meta:
        db_table = u'metadata2'
